const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const userId = "11111111-1111-4111-8111-111111111111";

test("dashboard grants, duplicate deliveries, failures and revocations reconcile authoritative state", async () => {
  let handler,
    fail = false,
    fetches = 0,
    snapshot,
    grant = true;
  const completed = new Set(),
    releases = [];
  const admin = {
    rpc: async (name, params) => {
      if (name === "claim_billing_webhook")
        return { data: !completed.has(params.event_id) };
      if (name === "begin_billing_reconciliation") return { data: "fence" };
      if (name === "commit_billing_reconciliation") snapshot = params.snapshot;
      return { data: true };
    },
    from: (table) => {
      if (table === "billing_webhook_events")
        return {
          select: () => ({
            eq: (_, id) => ({
              single: async () => ({
                data: { completed_at: completed.has(id) ? "done" : null },
              }),
            }),
          }),
          update: (values) => {
            let id;
            const query = {
              eq: (_, value) => {
                id = value;
                return query;
              },
              is: () => query,
              then: (resolve) => {
                if (values.completed_at) completed.add(id);
                else releases.push(id);
                return Promise.resolve({ error: null }).then(resolve);
              },
            };
            return query;
          },
        };
      return {
        select: () => ({
          eq: (_, id) => {
            assert.equal(id, userId);
            const result = {
              data:
                table === "profiles" ? { id, crittr_pro_until: null } : null,
            };
            return {
              single: async () => result,
              maybeSingle: async () => result,
            };
          },
        }),
      };
    },
  };
  const reconciliation = loadTS(
    "supabase/functions/_shared/revenueCatEntitlement.ts",
    {
      "./evaluateCrittrProEntitlement.ts": loadTS(
        "supabase/functions/_shared/evaluateCrittrProEntitlement.ts",
      ),
    },
    {
      Deno: { env: { get: () => "test-secret" } },
      fetch: async (url) => {
        assert.equal(
          url,
          `https://api.revenuecat.com/v1/subscribers/${userId}`,
        );
        fetches++;
        if (fail) return new Response("outage", { status: 503 });
        return Response.json({
          subscriber: {
            subscriptions: {},
            entitlements: grant
              ? {
                  crittr_pro: {
                    expires_date: null,
                    product_identifier: "rc_promo_crittr_pro_lifetime",
                    purchase_date: new Date().toISOString(),
                  },
                }
              : {},
          },
        });
      },
    },
  );
  loadTS(
    "supabase/functions/revenuecat-webhook/index.ts",
    {
      "jsr:@supabase/functions-js/edge-runtime.d.ts": {},
      "https://esm.sh/@supabase/supabase-js@2.49.1": {
        createClient: () => admin,
      },
      "../_shared/revenueCatEntitlement.ts": reconciliation,
      "../_shared/revenueCatWebhook.ts": loadTS(
        "supabase/functions/_shared/revenueCatWebhook.ts",
      ),
    },
    {
      Deno: {
        serve: (callback) => {
          handler = callback;
        },
        env: { get: () => "test-secret" },
      },
      console: { error() {} },
    },
  );
  const request = (id, type, auth = "Bearer test-secret") =>
    new Request("https://billing.test", {
      method: "POST",
      headers: { authorization: auth },
      // Promotional events may have no app_id and can identify the user by alias.
      body: JSON.stringify({
        event: {
          id,
          type,
          app_user_id: "$RCAnonymousID:old",
          aliases: [userId],
        },
      }),
    });
  assert.equal(
    (await handler(request("grant", "NON_RENEWING_PURCHASE", "invalid")))
      .status,
    401,
  );
  assert.equal(fetches, 0);
  assert.equal(
    (await handler(request("grant", "NON_RENEWING_PURCHASE"))).status,
    200,
  );
  assert.equal(snapshot.isActive, true);
  assert.equal(snapshot.crittrProUntil, null);
  assert.equal(snapshot.environment, "promotional");
  assert.equal(snapshot.willRenew, false);
  assert.equal(
    (await handler(request("grant", "NON_RENEWING_PURCHASE"))).status,
    200,
  );
  assert.equal(fetches, 1);

  fail = true;
  assert.equal((await handler(request("revoke", "CANCELLATION"))).status, 503);
  assert.equal(snapshot.isActive, true);
  assert.equal(completed.has("revoke"), false);
  assert.deepEqual(releases, ["revoke"]);
  fail = false;
  grant = false;
  assert.equal((await handler(request("revoke", "CANCELLATION"))).status, 200);
  assert.equal(snapshot.isActive, false);
  // Delayed older events must never reinstate a grant revoked at the provider.
  assert.equal(
    (await handler(request("old-purchase", "INITIAL_PURCHASE"))).status,
    200,
  );
  assert.equal(snapshot.isActive, false);
});
