const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const { load } = require("./database.cjs");

function workerFixture(responses, overrides = {}) {
  const job = {
    id: "job", expo_push_token: "ExpoPushToken[test]", expo_ticket_id: null,
    attempts: 1, title: "Pet care", body: "An activity was logged", data: {},
    expired: false, deliverable: true, ...overrides,
  };
  const removed = [], requests = [];
  const expo = loadTS("supabase/functions/_shared/expoPushDelivery.ts", {}, {
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
    },
  });
  const worker = loadTS("supabase/functions/_shared/processPushDeliveries.ts", { "./expoPushDelivery.ts": expo });
  const db = {
    rpc: async () => ({ data: [job], error: null }),
    from: (table) => ({
      update: (patch) => ({ eq: async () => { Object.assign(job, patch); return { error: null }; } }),
      delete: () => ({ eq: async (_column, token) => { removed.push([table, token]); return { error: null }; } }),
    }),
  };
  return { job, removed, requests, run: () => worker.processPushDeliveries(db) };
}

test("Expo tickets stay pending until a successful delivery receipt", async () => {
  const f = workerFixture([{ body: { data: [{ status: "ok", id: "ticket" }] } }]);
  const result = await f.run();
  assert.equal(result.accepted, 1);
  assert.equal(result.delivered, 0);
  assert.equal(f.job.expo_ticket_id, "ticket");
  assert.equal(f.job.completed_at, undefined);
  const receipt = workerFixture([{ body: { data: { ticket: { status: "ok" } } } }], { expo_ticket_id: "ticket" });
  assert.equal((await receipt.run()).delivered, 1);
  assert.ok(receipt.job.completed_at);
  assert.match(receipt.requests[0].url, /getReceipts$/);
});

test("HTTP 200 with DeviceNotRegistered is a failure and removes the invalid token", async () => {
  const f = workerFixture([{ body: { data: [{ status: "error", details: { error: "DeviceNotRegistered" } }] } }]);
  assert.equal((await f.run()).failed, 1);
  assert.equal(f.job.last_error, "DeviceNotRegistered");
  assert.deepEqual(f.removed.map(([table]) => table), ["user_expo_push_devices", "user_expo_push_tokens"]);
});

test("network failures and provider throttling keep work queued with backoff", async () => {
  for (const response of [new Error("offline"), { status: 429, body: {} }, { status: 503, body: {} }, { body: { data: [] } }]) {
    const f = workerFixture([response]);
    assert.equal((await f.run()).retrying, 1);
    assert.equal(f.job.completed_at, undefined);
    assert.ok(Date.parse(f.job.next_attempt_at) > Date.now());
  }
});

test("failed receipts retry delivery while unavailable receipts do not resend accepted pushes", async () => {
  const f = workerFixture([{ body: { data: { ticket: { status: "error", details: { error: "MessageRateExceeded" } } } } }], { expo_ticket_id: "ticket" });
  assert.equal((await f.run()).retrying, 1);
  assert.equal(f.job.expo_ticket_id, null);
  const unavailable = workerFixture([new Error("offline")], { expo_ticket_id: "ticket" });
  assert.equal((await unavailable.run()).retrying, 1);
  assert.equal(unavailable.job.expo_ticket_id, "ticket");
});

test("revoked devices, disabled preferences, and expired alerts cannot be sent", async () => {
  for (const override of [{ deliverable: false }, { expired: true }]) {
    const f = workerFixture([], override);
    assert.equal((await f.run()).skipped, 1);
    assert.equal(f.requests.length, 0);
  }
});

test("notification tap destinations reject other accounts and external links", () => {
  const { notificationTarget } = loadTS("lib/navigation/notificationTarget.ts");
  assert.equal(notificationTarget({ href: "/(logged-in)/notifications", recipient_user_id: "owner" }, "owner"), "/(logged-in)/notifications");
  assert.equal(notificationTarget({ recipient_user_id: "other" }, "owner"), null);
  for (const href of ["https://example.invalid", "/(auth)/sign-in", "/(logged-in)/../settings"]) assert.equal(notificationTarget({ href }, "owner"), null);
  assert.equal(notificationTarget({}, "owner"), "/(logged-in)/notifications");
});

test("database retains multiple devices, queues once per device, and leases worker jobs", async (t) => {
  const db = await load(); t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'push-owner@example.invalid'),($2,'push-other@example.invalid')", [owner, other]);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false); SET ROLE authenticated;`);
  for (const token of ["ExpoPushToken[phone]", "ExpoPushToken[tablet]"]) await db.query("SELECT register_expo_push_token($1)", [token]);
  assert.equal((await db.query("SELECT count(*) AS n FROM user_expo_push_devices")).rows[0].n, 2);
  await assert.rejects(() => db.query("SELECT * FROM claim_notification_push_deliveries()"), /permission denied/);
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO notifications(user_id,type,title,body) VALUES($1,'co_care_invite','Care invitation','Test')", [owner]);
  assert.equal((await db.query("SELECT count(*) AS n FROM notification_push_deliveries")).rows[0].n, 2);
  await db.exec("SET ROLE service_role");
  assert.equal((await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.length, 2);
  assert.equal((await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.length, 0);
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${other}',false); SET ROLE authenticated;`);
  await db.query("SELECT register_expo_push_token('ExpoPushToken[phone]')");
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${owner}',false); SET ROLE authenticated;`);
  assert.equal((await db.query("SELECT count(*) AS n FROM user_expo_push_devices")).rows[0].n, 1);
  await db.exec("RESET ROLE");
  await db.query("UPDATE profiles SET notify_co_care_activities=false WHERE id=$1", [owner]);
  await db.query("INSERT INTO notifications(user_id,type,title,body) VALUES($1,'co_carer_activity_logged','Activity','Test')", [owner]);
  assert.equal((await db.query("SELECT count(*) AS n FROM notification_push_deliveries")).rows[0].n, 2);
});
