const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");

test("reconciliation targets require the private worker secret and use bounded batches", async () => {
  let handler;
  const ids = ["11111111-1111-4111-8111-111111111111"];
  const reconciled = [],
    filters = [];
  const query = {
    select: () => query,
    in: (column, values) => {
      filters.push([column, values]);
      return query;
    },
    eq: () => query,
    or: () => query,
    order: () => query,
    limit: async (limit) => {
      assert.equal(limit, 20);
      return { data: ids.map((id) => ({ id })) };
    },
  };
  loadTS(
    "supabase/functions/reconcile-crittr-pro-entitlements/index.ts",
    {
      "jsr:@supabase/functions-js/edge-runtime.d.ts": {},
      "https://esm.sh/@supabase/supabase-js@2.49.1": {
        createClient: () => ({ from: () => query }),
      },
      "../_shared/revenueCatEntitlement.ts": {
        RevenueCatRestError: class extends Error {},
        ReconciliationBusyError: class extends Error {},
        reconcileCrittrProForUser: async (_, id) => {
          reconciled.push(id);
        },
      },
    },
    {
      Deno: {
        serve: (callback) => {
          handler = callback;
        },
        env: { get: () => "worker-secret" },
      },
    },
  );
  const request = (body, token = "worker-secret") =>
    new Request("https://worker.test", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await handler(request({ userIds: ids }, "user-jwt"))).status,
    401,
  );
  assert.equal((await handler(request({ userIds: ["invalid"] }))).status, 400);
  assert.equal(
    (await handler(request({ userIds: Array(21).fill(ids[0]) }))).status,
    400,
  );
  assert.equal(reconciled.length, 0);
  const response = await handler(request({ userIds: ids }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    processed: 1,
    failed: 0,
    failuresByReason: {},
  });
  assert.deepEqual(reconciled, ids);
  assert.equal(filters[0][0], "id");
  assert.deepEqual(filters[0][1], ids);
});
