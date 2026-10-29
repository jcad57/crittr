const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./database.cjs");
const { loadTS } = require("./load-typescript.cjs");
const { schedulePlan, pet, food } = require("./care-plan-fixture.cjs");
const planner = loadTS("supabase/functions/_shared/careReminderPlan.ts", { "../../../utils/buildSchedulePlan.ts": schedulePlan });

test("all opted-in co-carers get due reminders without an owner device, including view-only carers and multiple devices", async (t) => {
  const db = await load(); t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111";
  const carers = ["22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"];
  const as = (id, role = "authenticated") => db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`);
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  for (const id of [owner, ...carers]) {
    await db.exec("RESET ROLE");
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [id, `${id}@example.invalid`]);
    await as(id, "service_role");
    await db.query("UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id=$1", [id]);
  }
  await db.exec("RESET ROLE; UPDATE care_reminder_config SET enabled=true");
  await as(owner);
  const petId = await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Shared pet') RETURNING id", [owner]);
  const foodId = await scalar("INSERT INTO pet_foods(pet_id,brand,is_treat) VALUES($1,'Meal',false) RETURNING id", [petId]);
  const portionId = await scalar("INSERT INTO pet_food_portions(pet_food_id,feed_time,sort_order) VALUES($1,'18:30',0) RETURNING id", [foodId]);
  await as(owner, "service_role");
  for (const id of carers) await db.query("INSERT INTO pet_co_carers(pet_id,user_id,invited_by,permissions) VALUES($1,$2,$3,'{}')", [petId, id, owner]);
  for (const [index, id] of carers.entries()) {
    await as(id);
    await db.query("SELECT initialize_care_time_zone('America/Chicago')");
    const tokens = index === 0 ? ["first-phone", "first-tablet"] : [`carer-${index}`];
    for (const token of tokens) {
      await db.query("SELECT register_expo_push_token($1)", [`ExpoPushToken[${token}]`]);
      await db.query("SELECT activate_device_care_reminders($1)", [`ExpoPushToken[${token}]`]);
    }
  }
  await as(carers[0]);
  assert.equal((await db.query("SELECT care_reminder_status()")).rows[0].care_reminder_status.missing_owner_time_zones, 1);
  await as(owner, "service_role");
  assert.equal((await db.query("SELECT * FROM care_reminder_inputs()")).rows.length, 0, "the owner's zone cannot be guessed from a co-carer's device");
  await db.query("UPDATE profiles SET care_time_zone='America/Chicago',notify_meals_treats=false WHERE id=$1", [owner]);
  await db.query("UPDATE profiles SET notify_co_care_activities=false WHERE id=$1", [carers[1]]);
  await db.query("UPDATE profiles SET notify_meals_treats=false WHERE id=$1", [carers[2]]);
  await db.exec("UPDATE user_expo_push_devices SET care_reminders_enabled_at=now()-interval '1 day'");
  const source = (await db.query("SELECT * FROM care_reminder_inputs()")).rows[0].care_reminder_inputs;
  const date = await scalar("SELECT to_char(now() AT TIME ZONE 'America/Chicago','YYYY-MM-DD')");
  const due = await scalar("SELECT to_char(now()-interval '1 minute','YYYY-MM-DD\"T\"HH24:MI:SSOF')");
  const reminders = [{ local_date: date, source_kind: "food_portion", source_id: portionId, source_slot: "", reminder_key: "due", scheduled_at: due, category: "notify_meals_treats", title: "Meal reminder", body: "Time for a meal", href: "/(logged-in)/add-activity" }];
  await db.query("SELECT enqueue_due_care_reminders($1,$2,$3)", [petId, source.version, reminders]);
  await db.query("SELECT enqueue_due_care_reminders($1,$2,$3)", [petId, source.version, reminders]);
  const jobs = (await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows;
  assert.equal(jobs.length, 3, "two devices for the first co-carer and one for the second");
  assert.ok(jobs.every((j) => j.deliverable && j.data.type === "care_task_due"));
  assert.deepEqual([...new Set(jobs.map((j) => j.data.recipient_user_id))].sort(), carers.slice(0, 2));
  assert.equal(await scalar("SELECT count(*) FROM user_expo_push_devices WHERE user_id=$1", [owner]), 0, "delivery does not require an owner device");
  assert.equal(await scalar("SELECT count(*) FROM notifications WHERE user_id=$1 AND type='care_task_due'", [carers[2]]), 0, "a meal opt-out is honored independently of co-care activity updates");
});

test("the server deduplicates reminders per task/device and suppresses shared completed tasks before enqueue and before send", async (t) => {
  const db = await load(); t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111", carer = "22222222-2222-4222-8222-222222222222";
  const as = (id, role = "authenticated") => db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`);
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  for (const id of [owner, carer]) {
    await db.exec("RESET ROLE");
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [id, `${id}@example.invalid`]);
    await as(id, "service_role");
    await db.query("UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id=$1", [id]);
  }
  await db.exec("RESET ROLE; UPDATE care_reminder_config SET enabled=true,activity_queue_since=now();");
  await as(owner);
  assert.equal(await scalar("SELECT initialize_care_time_zone('America/Chicago')"), true);
  assert.equal(await scalar("SELECT initialize_care_time_zone('Europe/London')"), false, "traveling device cannot silently replace owner care time zone");
  await assert.rejects(() => db.query("SELECT initialize_care_time_zone('not-a-time-zone')"), /valid care time zone/);
  await db.query("SELECT register_expo_push_token('ExpoPushToken[owner]')");
  await db.query("SELECT activate_device_care_reminders('ExpoPushToken[owner]')");
  await db.query("SELECT register_expo_push_token('ExpoPushToken[legacy]')");
  const petId = await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Milo') RETURNING id", [owner]);
  assert.equal(await scalar("SELECT care_time_zone FROM pets WHERE id=$1", [petId]), "America/Chicago");
  const foodId = await scalar("INSERT INTO pet_foods(pet_id,brand,is_treat) VALUES($1,'Meals',false) RETURNING id", [petId]);
  const portions = (await db.query("INSERT INTO pet_food_portions(pet_food_id,feed_time,sort_order) VALUES($1,'08:00',0),($1,'18:00',1) RETURNING id", [foodId])).rows.map((r) => r.id);
  await as(owner, "service_role");
  await db.query("INSERT INTO pet_co_carers(pet_id,user_id,invited_by,permissions) VALUES($1,$2,$3,$4)", [petId, carer, owner, { can_log_activities: true }]);
  await as(carer);
  await db.query("SELECT initialize_care_time_zone('America/Los_Angeles')");
  await db.query("SELECT register_expo_push_token('ExpoPushToken[carer]')");
  await db.query("SELECT activate_device_care_reminders('ExpoPushToken[carer]')");
  await assert.rejects(() => db.query("SELECT * FROM care_reminder_inputs()"), /permission denied/);
  await assert.rejects(() => db.query("SELECT activate_device_care_reminders('ExpoPushToken[owner]')"), /Register this device/);
  await as(owner, "service_role");
  await db.exec("UPDATE user_expo_push_devices SET care_reminders_enabled_at=now()-interval '1 day' WHERE care_reminder_mode='server'");
  const source = (await db.query("SELECT * FROM care_reminder_inputs()")).rows[0].care_reminder_inputs;
  assert.equal(source.time_zone, "America/Chicago");
  assert.equal(source.pet.foods[0].pet_food_portions.length, 2);
  const date = await scalar("SELECT to_char(now() AT TIME ZONE 'America/Chicago','YYYY-MM-DD')");
  const scheduled_at = await scalar("SELECT to_char(now()-interval '2 minutes','YYYY-MM-DD\"T\"HH24:MI:SSOF')");
  const reminders = portions.map((id) => ({ local_date: date, source_kind: "food_portion", source_id: id,
    source_slot: "", reminder_key: "due", scheduled_at, category: "notify_meals_treats", title: "Meal reminder", body: "Milo: time for a meal.", href: "/(logged-in)/add-activity" }));
  const slot = await scalar("INSERT INTO pet_schedule_items(pet_id,local_date,scheduled_time,activity_type,source_kind,source_id,label,meta) VALUES($1,$2,'08:00','food','food_portion',$3,'Breakfast',$4) RETURNING id", [petId, date, portions[0], { food_id: foodId, portion_size: "1", portion_unit: "Cups" }]);
  await as(carer);
  await db.query("SELECT * FROM set_pet_schedule_item_completed($1,true)", [slot]);
  await as(owner, "service_role");
  const enqueue = () => db.query("SELECT enqueue_due_care_reminders($1,$2,$3)", [petId, source.version, reminders]);
  await enqueue(); await enqueue();
  await as(owner);
  await db.query("SELECT register_expo_push_token('ExpoPushToken[just-upgraded]')");
  await db.query("SELECT activate_device_care_reminders('ExpoPushToken[just-upgraded]')");
  await as(owner, "service_role");
  await enqueue();
  assert.equal(await scalar("SELECT count(*) FROM notifications WHERE type='care_task_due'"), 2, "one remaining task, two recipients");
  assert.equal(await scalar("SELECT count(*) FROM notification_push_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.type='care_task_due'"), 2, "legacy local devices never get duplicate server reminders");
  assert.equal(await scalar("SELECT count(*) FROM care_reminder_occurrences WHERE source_id=$1", [portions[0]]), 0, "another carer's completed breakfast is suppressed");
  const pendingSlot = await scalar("INSERT INTO pet_schedule_items(pet_id,local_date,scheduled_time,activity_type,source_kind,source_id,label,meta) VALUES($1,$2,'18:00','food','food_portion',$3,'Dinner',$4) RETURNING id", [petId, date, portions[1], { food_id: foodId }]);
  await as(carer);
  await db.query("SELECT * FROM set_pet_schedule_item_completed($1,true)", [pendingSlot]);
  await as(owner, "service_role");
  let jobs = (await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.filter((j) => j.data.type === "care_task_due");
  assert.equal(jobs.length, 2);
  assert.ok(jobs.every((j) => !j.deliverable), "completion after enqueue is checked again for every recipient");
  await db.exec("UPDATE notification_push_deliveries SET locked_until=NULL");
  await as(carer);
  await db.query("SELECT * FROM set_pet_schedule_item_completed($1,false)", [pendingSlot]);
  await as(owner, "service_role");
  await db.query("UPDATE profiles SET notify_meals_treats=false WHERE id=$1", [owner]);
  jobs = (await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.filter((j) => j.data.type === "care_task_due");
  assert.equal(jobs.find((j) => j.data.recipient_user_id === owner).deliverable, false);
  assert.equal(jobs.find((j) => j.data.recipient_user_id === carer).deliverable, true);
  await db.exec("UPDATE notification_push_deliveries SET locked_until=NULL");
  await db.query("UPDATE pet_food_portions SET feed_time='19:00' WHERE id=$1", [portions[1]]);
  jobs = (await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.filter((j) => j.data.type === "care_task_due");
  assert.ok(jobs.every((j) => !j.deliverable), "an edited source invalidates an old due event");
  assert.equal((await enqueue()).rows[0].enqueue_due_care_reminders, 0, "a stale planner snapshot cannot enqueue after an edit");
  await db.exec("UPDATE notification_push_deliveries d SET completed_at=now(),last_error='Device or preference no longer eligible',locked_until=NULL FROM notifications n WHERE n.id=d.notification_id AND n.type='care_task_due'");
  const fresh = (await db.query("SELECT * FROM care_reminder_inputs()")).rows[0].care_reminder_inputs;
  await db.query("SELECT enqueue_due_care_reminders($1,$2,$3)", [petId, fresh.version, [reminders[1]]]);
  assert.equal(await scalar("SELECT count(*) FROM notification_push_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.type='care_task_due' AND d.completed_at IS NULL"), 1, "refreshed eligible unsent payload is not lost after a source edit");
  await db.exec("UPDATE notification_push_deliveries d SET expo_ticket_id='accepted-ticket',completed_at=now() FROM notifications n WHERE n.id=d.notification_id AND n.type='care_task_due' AND d.completed_at IS NULL");
  await db.query("UPDATE pet_foods SET brand='Renamed meal' WHERE id=$1", [foodId]);
  const renamed = (await db.query("SELECT * FROM care_reminder_inputs()")).rows[0].care_reminder_inputs;
  await db.query("SELECT enqueue_due_care_reminders($1,$2,$3)", [petId, renamed.version, [reminders[1]]]);
  assert.equal(await scalar("SELECT count(*) FROM notification_push_deliveries d JOIN notifications n ON n.id=d.notification_id WHERE n.type='care_task_due' AND d.completed_at IS NULL"), 0, "an accepted push is never reset for a cosmetic source edit");
});

test("materialization pages through every pet and isolates a bad pet without losing other reminders", async () => {
  let pages = 0;
  const queued = [];
  const module = loadTS("supabase/functions/_shared/materializeCareReminders.ts", { "./careReminderPlan.ts": planner });
  const now = new Date("2026-10-28T13:00:00Z");
  const inputs = Array.from({ length: 101 }, (_, index) => ({ pet: pet({ id: String(index), foods: [food()] }), time_zone: "America/Chicago", vet_visits: [], version: "v" }));
  inputs[3].time_zone = "invalid-zone";
  const admin = { rpc: async (name, args) => {
    if (name === "care_reminder_inputs") return { data: pages++ === 0 ? inputs.slice(0, 100) : inputs.slice(100) };
    queued.push(args); return { data: 1 };
  } };
  const result = await module.materializeCareReminders(admin, now);
  assert.equal(result.pets, 101);
  assert.equal(result.failed, 1);
  assert.equal(queued.length, 100);
  assert.equal(pages, 2);
});
