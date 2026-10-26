const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");

test("sync endpoint binds subscriber identity to the authenticated user", async () => {
  let handler,
    calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "caller" } } }) },
  };
  loadTS(
    "supabase/functions/sync-crittr-pro-entitlement/index.ts",
    {
      "jsr:@supabase/functions-js/edge-runtime.d.ts": {},
      "https://esm.sh/@supabase/supabase-js@2.49.1": {
        createClient: () => client,
      },
      "../_shared/revenueCatEntitlement.ts": {
        ReconciliationBusyError: class extends Error {},
        reconcileCrittrProForUser: async (_, id) => {
          calls.push(id);
          return { before: null, after: null };
        },
      },
    },
    {
      Request,
      Deno: {
        serve: (fn) => {
          handler = fn;
        },
        env: { get: () => "test" },
      },
    },
  );
  const req = (body) =>
    new Request("https://local.test", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
      body: JSON.stringify(body),
    });
  assert.equal((await handler(req({ appUserId: "victim" }))).status, 400);
  assert.deepEqual(calls, []);
  assert.equal(
    (await handler(req({ alternateAppUserIds: ["victim"], source: "session" })))
      .status,
    200,
  );
  assert.deepEqual(calls, ["caller"]);
});

test("reconciliation ignores poisoned profile mappings and retains the last verification on outages", async () => {
  const calls = [],
    commits = [];
  let fail = false;
  const admin = {
    rpc: async (name, params) => {
      calls.push([name, params]);
      if (name === "commit_billing_reconciliation") commits.push(params);
      return { data: name === "begin_billing_reconciliation" ? "fence" : true };
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { crittr_pro_until: "old", revenuecat_app_user_id: "victim" },
          }),
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    }),
  };
  const { reconcileCrittrProForUser } = loadTS(
    "supabase/functions/_shared/revenueCatEntitlement.ts",
    {
      "./evaluateCrittrProEntitlement.ts": loadTS(
        "supabase/functions/_shared/evaluateCrittrProEntitlement.ts",
      ),
    },
    {
      Deno: { env: { get: () => "test" } },
      fetch: async (url) => {
        assert.equal(url, "https://api.revenuecat.com/v1/subscribers/caller");
        return fail
          ? new Response("unavailable", { status: 503 })
          : Response.json({
              subscriber: { entitlements: {}, subscriptions: {} },
            });
      },
    },
  );
  await reconcileCrittrProForUser(admin, "caller");
  assert.equal(commits.length, 1);
  assert.equal(commits[0].snapshot.crittrProUntil, null);
  fail = true;
  await assert.rejects(() => reconcileCrittrProForUser(admin, "caller"), /503/);
  assert.equal(commits.length, 1);
  assert.equal(calls.at(-1)[0], "release_billing_reconciliation");
});

test("transfers reconcile both verified account UUIDs", () => {
  const { affectedAccountIds } = loadTS(
    "supabase/functions/_shared/revenueCatWebhook.ts",
  );
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  assert.deepEqual(
    Array.from(
      affectedAccountIds({
        type: "TRANSFER",
        transferred_from: [a, "$RCAnonymousID:x"],
        transferred_to: [b, a],
      }),
    ),
    [a, b],
  );
});
