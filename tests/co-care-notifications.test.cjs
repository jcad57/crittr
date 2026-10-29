const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./database.cjs");
const { loadTS } = require("./load-typescript.cjs");

test("registered Free and Pro invitees get an inbox row and a push job per device", async (t) => {
  const db = await load();
  t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111";
  const carer = "22222222-2222-4222-8222-222222222222";
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  const as = (id, role = "authenticated") => db.exec(
    `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`,
  );
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'invite-owner@example.invalid'),($2,'invite-carer@example.invalid')", [owner, carer]);
  await as(owner, "service_role");
  await db.query("UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id=$1", [owner]);
  await as(carer);
  await db.query("SELECT register_expo_push_token('ExpoPushToken[phone]')");
  await db.query("SELECT register_expo_push_token('ExpoPushToken[tablet]')");
  await as(owner);
  const pet = await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Invite pet') RETURNING id", [owner]);
  await as(owner, "service_role");
  const unrelated = await scalar("INSERT INTO notifications(user_id,type,title) VALUES($1,'co_care_accepted','Invitation accepted') RETURNING id", [carer]);

  for (const hasPro of [false, true]) {
    if (hasPro) {
      await as(carer, "service_role");
      await db.query("UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id=$1", [carer]);
    }
    await as(owner);
    const invite = await scalar("INSERT INTO co_carer_invites(pet_id,invited_by,invited_user_id,email) VALUES($1,$2,$3,'invite-carer@example.invalid') RETURNING id", [pet, owner, carer]);
    await as(carer);
    const notification = (await db.query("SELECT * FROM notifications WHERE data->>'invite_id'=$1", [invite])).rows[0];
    assert.equal(notification.type, "co_care_invite");
    assert.equal(notification.user_id, carer);
    await as(owner, "service_role");
    const jobs = (await db.query("SELECT * FROM claim_co_care_invite_push_deliveries()" )).rows;
    assert.equal(jobs.length, 2);
    assert.ok(jobs.every((job) => job.deliverable && job.data.invite_id === invite));
    assert.ok(jobs.every((job) => job.data.notification_id === notification.id && job.data.recipient_user_id === carer));
    assert.equal(await scalar("SELECT count(*) FROM pet_co_carers"), 0, "invitation pushes do not require an accepted membership");
    assert.equal(await scalar("SELECT max(attempts) FROM notification_push_deliveries WHERE notification_id=$1", [unrelated]), 0, "invitation worker never claims unrelated messages");

    // Delayed jobs must not send an invite after it has been answered.
    await db.query("UPDATE notification_push_deliveries SET locked_until=NULL");
    await as(carer);
    await db.query("UPDATE co_carer_invites SET status='declined',responded_at=now() WHERE id=$1", [invite]);
    await as(owner, "service_role");
    const stale = (await db.query("SELECT * FROM claim_co_care_invite_push_deliveries()")).rows;
    assert.ok(stale.every((job) => !job.deliverable));
    await db.query("UPDATE notification_push_deliveries SET completed_at=now() WHERE notification_id=$1", [notification.id]);
  }

  await as(owner);
  const emailOnly = await scalar("INSERT INTO co_carer_invites(pet_id,invited_by,email) VALUES($1,$2,'new-person@example.invalid') RETURNING id", [pet, owner]);
  await as(owner, "service_role");
  assert.equal(await scalar("SELECT count(*) FROM notifications WHERE data->>'invite_id'=$1", [emailOnly]), 0);
  await db.query("UPDATE profiles SET notify_co_care_activities=false WHERE id=$1", [carer]);
  await as(owner);
  const optedOut = await scalar("INSERT INTO co_carer_invites(pet_id,invited_by,invited_user_id,email) VALUES($1,$2,$3,'invite-carer@example.invalid') RETURNING id", [pet, owner, carer]);
  await as(owner, "service_role");
  const inbox = await scalar("SELECT id FROM notifications WHERE data->>'invite_id'=$1", [optedOut]);
  assert.ok(inbox, "push opt-out preserves the in-app invite");
  assert.equal(await scalar("SELECT count(*) FROM notification_push_deliveries WHERE notification_id=$1", [inbox]), 0);
});

test("invite email handler uses Resend for an authenticated owner's invite and surfaces provider failures", async () => {
  for (const providerStatus of [200, 503]) {
    let handler;
    const emails = [];
    loadTS("supabase/functions/send-co-care-invite/index.ts", {
      "jsr:@supabase/functions-js/edge-runtime.d.ts": {},
      "https://esm.sh/@supabase/supabase-js@2.49.1": { createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
        from: (table) => ({ select: () => ({ eq: () => ({ single: async () => ({
          data: table === "pets" ? { owner_id: "owner", name: "Milo" } : { first_name: "Sam" }, error: null,
        }) }) }) }),
      }) },
    }, {
      Request,
      Deno: { serve: (callback) => { handler = callback; }, env: { get: () => "configured" } },
      console: { error() {} },
      fetch: async (url, options) => {
        emails.push({ url, headers: options.headers, body: JSON.parse(options.body) });
        return new Response(JSON.stringify({ id: "email-id" }), { status: providerStatus });
      },
    });
    const response = await handler(new Request("https://invite.test", {
      method: "POST", headers: { authorization: "Bearer user-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ petId: "pet", inviteeEmail: "  NEW@example.invalid  " }),
    }));
    assert.equal(emails.length, 1);
    assert.equal(emails[0].url, "https://api.resend.com/emails");
    assert.deepEqual(emails[0].body.to, ["new@example.invalid"]);
    assert.match(emails[0].body.html, /sign up with/);
    assert.equal(response.status, providerStatus === 200 ? 200 : 502);
    assert.equal((await response.json()).ok, providerStatus === 200);
  }
});

test("push dispatcher rejects public callers and processes the queue with its dedicated worker secret", async () => {
  let handler;
  let calls = 0;
  loadTS("supabase/functions/dispatch-notification-pushes/index.ts", {
    "jsr:@supabase/functions-js/edge-runtime.d.ts": {},
    "https://esm.sh/@supabase/supabase-js@2.49.1": { createClient: () => ({}) },
    "../_shared/processPushDeliveries.ts": { processPushDeliveries: async (_admin, _activity, _token, invitationsOnly) => {
      assert.notEqual(invitationsOnly, true, "scheduled dispatch must also retry care completion alerts");
      calls++;
      return { accepted: 1, delivered: 0, retrying: 0, failed: 0, skipped: 0 };
    } },
    "../_shared/materializeCareReminders.ts": { materializeCareReminders: async () => ({ pets: 1, occurrences: 1, failed: 0 }) },
  }, {
    Deno: { serve: (callback) => { handler = callback; }, env: { get: () => "worker-secret" } },
  });
  const request = (token) => new Request("https://worker.test", { method: "POST", headers: { authorization: `Bearer ${token}` } });
  assert.equal((await handler(request("user-jwt"))).status, 401);
  assert.equal(calls, 0);
  const response = await handler(request("worker-secret"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).accepted, 1);
  assert.equal(calls, 1);
});
