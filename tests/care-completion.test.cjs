const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./database.cjs");
const { loadTS } = require("./load-typescript.cjs");

test("schedule completion atomically creates one activity and alerts the other carers with the actor's name", async (t) => {
  const db = await load(); t.after(() => db.close());
  await db.exec("UPDATE care_reminder_config SET activity_queue_since='-infinity'");
  const owner = "11111111-1111-4111-8111-111111111111";
  const actor = "22222222-2222-4222-8222-222222222222";
  const carer = "33333333-3333-4333-8333-333333333333";
  const stranger = "44444444-4444-4444-8444-444444444444";
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  const as = (id, role = "authenticated") => db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`);
  for (const [id, name] of [[owner, "Alex"], [actor, "Sam"], [carer, "Jo"], [stranger, "Other"]]) {
    await db.exec("RESET ROLE");
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [id, `${name}@example.invalid`]);
    await as(id, "service_role");
    await db.query("UPDATE profiles SET first_name=$2,crittr_pro_active=true,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id=$1", [id, name]);
    await as(id);
    await db.query("SELECT register_expo_push_token($1)", [`ExpoPushToken[${name}]`]);
  }
  await as(owner);
  const pet = await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Milo') RETURNING id", [owner]);
  const food = await scalar("INSERT INTO pet_foods(pet_id,brand,is_treat) VALUES($1,'Bites',true) RETURNING id", [pet]);
  await as(owner, "service_role");
  for (const id of [actor, carer]) await db.query("INSERT INTO pet_co_carers(pet_id,user_id,invited_by,permissions) VALUES($1,$2,$3,$4)", [pet, id, owner, { can_log_activities: id === actor }]);
  await as(actor);
  const slot = await scalar("INSERT INTO pet_schedule_items(pet_id,local_date,scheduled_time,activity_type,source_kind,source_id,label,meta) VALUES($1,current_date,'10:00','food','food_treat',$2,'Treat',$3) RETURNING id", [pet, food, { food_id: food, is_treat: true, portion_size: "2", portion_unit: "Pieces" }]);
  const complete = async (done) => (await db.query("SELECT * FROM set_pet_schedule_item_completed($1,$2)", [slot, done])).rows[0];
  const first = await complete(true);
  assert.ok(first.completed_at && first.activity_id);
  assert.equal((await complete(true)).activity_id, first.activity_id, "retrying a saved completion is idempotent");
  await as(owner, "service_role");
  assert.equal(await scalar("SELECT count(*) FROM pet_activities WHERE pet_id=$1", [pet]), 1);
  const notifications = (await db.query("SELECT * FROM notifications WHERE type='co_carer_activity_logged' ORDER BY user_id")).rows;
  assert.deepEqual(notifications.map((n) => n.user_id), [owner, carer]);
  assert.ok(notifications.every((n) => n.body.includes("Sam completed a treat for Milo") && n.data.actor_user_id === actor));
  assert.equal(await scalar("SELECT count(*) FROM notification_push_deliveries"), 2);
  const jobs = (await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows;
  assert.ok(jobs.every((job) => job.deliverable && job.data.type === "co_carer_activity_logged"));
  await as(carer);
  await assert.rejects(() => complete(false), /Not allowed/);
  await as(stranger);
  await assert.rejects(() => complete(true), /Not allowed/);
  await as(actor);
  assert.equal((await complete(false)).activity_id, null);
  await as(owner, "service_role");
  assert.equal(await scalar("SELECT count(*) FROM pet_activities WHERE pet_id=$1", [pet]), 0);
  assert.equal(await scalar("SELECT count(*) FROM notification_push_deliveries"), 0, "undo retires queued alerts");
  await db.query("UPDATE profiles SET notify_co_care_activities=false WHERE id=$1", [carer]);
  await as(actor);
  await complete(true);
  await as(owner, "service_role");
  assert.equal(await scalar("SELECT count(*) FROM notifications WHERE type='co_carer_activity_logged'"), 1, "opted-out carer receives no alert");
  await db.query("DELETE FROM pet_activities WHERE id=(SELECT activity_id FROM pet_schedule_items WHERE id=$1)", [slot]);
  assert.ok((await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.every((job) => !job.deliverable), "deleted activities cannot send stale queued pushes");

  // A queue failure rolls the whole completion back, rather than leaving a check
  // mark that never produces its promised activity/update.
  await as(actor); await complete(false);
  await db.exec("RESET ROLE; CREATE FUNCTION public.fail_care_push_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Queue unavailable'; END $$; CREATE TRIGGER fail_care_push_test BEFORE INSERT ON notification_push_deliveries FOR EACH ROW EXECUTE FUNCTION fail_care_push_test();");
  await as(actor);
  await assert.rejects(() => complete(true), /Queue unavailable/);
  await as(owner, "service_role");
  assert.equal(await scalar("SELECT completed_at FROM pet_schedule_items WHERE id=$1", [slot]), null);
  assert.equal(await scalar("SELECT count(*) FROM pet_activities WHERE pet_id=$1", [pet]), 0);
  await db.exec("RESET ROLE; DROP TRIGGER fail_care_push_test ON notification_push_deliveries; DROP FUNCTION fail_care_push_test();");

  await as(actor);
  const vetSlot = await scalar("INSERT INTO pet_schedule_items(pet_id,local_date,scheduled_time,activity_type,source_kind,source_id,label) VALUES($1,current_date,'10:00','vet_visit','vet_visit','visit','Checkup') RETURNING id", [pet]);
  await db.query("SELECT * FROM set_pet_schedule_item_completed($1,true)", [vetSlot]);
  await as(owner, "service_role");
  assert.equal(await scalar("SELECT count(*) FROM notifications WHERE data->>'schedule_item_id'=$1", [vetSlot]), 1);
  assert.ok((await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.some((job) => job.deliverable && job.data.schedule_item_id === vetSlot));
  await as(owner);
  await complete(false); await complete(true);
  await as(owner, "service_role");
  const ownerAlerts = (await db.query("SELECT * FROM notifications WHERE data->>'actor_user_id'=$1", [owner])).rows;
  assert.equal(ownerAlerts.length, 1);
  assert.equal(ownerAlerts[0].user_id, actor);
  assert.match(ownerAlerts[0].body, /Alex completed a treat for Milo/);
});

test("completion client waits for the durable RPC and never reports a failed save as completed", async () => {
  const requests = [], pushes = [];
  let failed = false;
  const service = loadTS("services/schedule/complete.ts", {
    "@/lib/supabase": { supabase: { rpc: async (name, args) => {
      requests.push({ name, args });
      return failed ? { error: Error("offline") } : { data: { id: "slot", activity_id: args.p_completed ? "activity" : null } };
    } } },
    "@/services/coCarerActivityPush": { requestRemoteCoCarerActivityPush: (id) => pushes.push(id) },
  });
  assert.equal((await service.completeScheduleItem("slot", "actor")).activity_id, "activity");
  assert.equal((await service.uncompleteScheduleItem("slot")).activity_id, null);
  assert.deepEqual(pushes, ["activity"]);
  assert.deepEqual(requests.map((r) => r.name), ["set_pet_schedule_item_completed", "set_pet_schedule_item_completed"]);
  failed = true;
  await assert.rejects(() => service.completeScheduleItem("slot", "actor"), /offline/);
  assert.equal(pushes.length, 1);
});
