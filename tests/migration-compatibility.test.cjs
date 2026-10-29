const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("./database.cjs");
const earlierBilling = "20261026120000_subscription_reliability.sql";
const earlierSharing = "20261026123000_co_care_integrity.sql";
const owner = "11111111-1111-4111-8111-111111111111";

test("adding vaccinations preserves an existing All off and rerunning preserves an explicit vaccination opt-in", async (t) => {
  const db = await load({ beforeMigration: async (db, name) => {
    if (name !== "20261028120000_care_reminder_preferences.sql") return;
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,'all-off@example.invalid')", [owner]);
    await db.query("UPDATE profiles SET notify_meals_treats=false,notify_co_care_activities=false,notify_medications=false,notify_vet_visits=false WHERE id=$1", [owner]);
  } });
  t.after(() => db.close());
  assert.equal((await db.query("SELECT notify_vaccinations FROM profiles WHERE id=$1", [owner])).rows[0].notify_vaccinations, false);
  await db.query("UPDATE profiles SET notify_vaccinations=true WHERE id=$1", [owner]);
  await db.exec(fs.readFileSync("supabase/migrations/20261028120000_care_reminder_preferences.sql", "utf8"));
  assert.equal((await db.query("SELECT notify_vaccinations FROM profiles WHERE id=$1", [owner])).rows[0].notify_vaccinations, true);
});

test("new weight and push migrations run on the deployed schema before the billing rollout", async (t) => {
  const db = await load({ skipMigrations: [earlierBilling, earlierSharing, "20261028160000_revised_free_pro_tiers.sql"] });
  t.after(() => db.close());
  assert.equal((await db.query("SELECT to_regprocedure('public.account_has_verified_pro(uuid)') AS helper")).rows[0].helper, null);
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'legacy@example.invalid')", [owner]);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false); SELECT set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;`);
  const pet = (await db.query("INSERT INTO pets(owner_id,name) VALUES($1,'Legacy') RETURNING id", [owner])).rows[0].id;
  const saved = (await db.query("SELECT * FROM save_pet_weigh_in($1,'2026-10-26','2026-10-26T12:00:00Z',25,'lbs','Weigh-in',NULL)", [pet])).rows[0];
  assert.equal(saved.activity_type, "weigh_in");
  await db.query("SELECT register_expo_push_token('ExpoPushToken[legacy]')");
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO notifications(user_id,type,title) VALUES($1,'co_care_invite','Invitation')", [owner]);
  assert.equal((await db.query("SELECT * FROM claim_notification_push_deliveries()")).rows.length, 1);
  // SQL Editor users can rerun either corrected migration after a partial attempt.
  for (const name of ["20261026130000_daily_weigh_ins.sql", "20261026133000_push_delivery_queue.sql",
    "20261028120000_care_reminder_preferences.sql", "20261028123000_atomic_care_completion.sql", "20261028130000_care_push_eligibility.sql",
    "20261028140000_server_care_reminders.sql"]) {
    await db.exec(fs.readFileSync(`supabase/migrations/${name}`, "utf8"));
  }
  assert.equal((await db.query("SELECT count(*) AS n FROM pet_weight_entries")).rows[0].n, 1);
  const carer = "22222222-2222-4222-8222-222222222222";
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'legacy-carer@example.invalid')", [carer]);
  await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");
  await db.query("UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=now()+interval '1 month' WHERE id IN ($1,$2)", [owner, carer]);
  await db.query("INSERT INTO pet_co_carers(pet_id,user_id,invited_by) VALUES($1,$2,$3)", [pet, carer, owner]);
  assert.equal((await db.query("SELECT push_recipient_has_pet_access($1,$2) AS allowed", [pet, carer])).rows[0].allowed, true);
  const helperSql = fs.readFileSync("docs/sql/install-verified-pro-helper.sql", "utf8");
  await db.exec(helperSql);
  await db.exec(helperSql);
  assert.equal((await db.query("SELECT account_has_verified_pro($1) AS access", [owner])).rows[0].access, false);
  assert.equal((await db.query("SELECT push_recipient_has_pet_access($1,$2) AS allowed", [pet, carer])).rows[0].allowed, false);
  await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");
  await db.query("SELECT set_crittr_pro_admin_grant($1,now()+interval '1 day','Helper test')", [owner]);
  assert.equal((await db.query("SELECT account_has_verified_pro($1) AS access", [owner])).rows[0].access, true);
  await db.query("SELECT set_crittr_pro_admin_grant($1,now()+interval '1 day','Carer helper test')", [carer]);
  assert.equal((await db.query("SELECT push_recipient_has_pet_access($1,$2) AS allowed", [pet, carer])).rows[0].allowed, true);
  await db.exec("SET ROLE authenticated");
  await assert.rejects(() => db.query("SELECT account_has_verified_pro($1)", [owner]), /permission denied/);
  await db.exec("RESET ROLE");
  // Installing the helper alone does not break a later full billing migration.
  await db.exec(fs.readFileSync(`supabase/migrations/${earlierBilling}`, "utf8"));
});

test("historical duplicate weigh-ins are consolidated only after archiving their readings and activities", async (t) => {
  const db = await load({ beforeMigration: async (db, name) => {
    if (name !== "20261026130000_daily_weigh_ins.sql") return;
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,'duplicates@example.invalid')", [owner]);
    const pet = (await db.query("INSERT INTO pets(owner_id,name) VALUES($1,'Duplicate history') RETURNING id", [owner])).rows[0].id;
    for (const [weight, created] of [[20, "2026-10-26T10:00:00Z"], [22, "2026-10-26T11:00:00Z"]]) {
      const entry = (await db.query("INSERT INTO pet_weight_entries(pet_id,recorded_at,weight_lbs,created_at) VALUES($1,'2026-10-26',$2,$3) RETURNING id", [pet, weight, created])).rows[0].id;
      await db.query("INSERT INTO pet_activities(pet_id,logged_by,activity_type,label,weight_entry_id,weight_lbs) VALUES($1,$2,'weigh_in','Weigh-in',$3,$4)", [pet, owner, entry, weight]);
    }
  } });
  t.after(() => db.close());
  assert.equal((await db.query("SELECT count(*) AS n FROM pet_weight_entries")).rows[0].n, 1);
  const archived = (await db.query("SELECT entry,activity FROM pet_weight_entry_revisions")).rows[0];
  assert.equal(archived.entry.weight_lbs, 20);
  assert.equal(archived.activity.activity_type, "weigh_in");
  assert.equal((await db.query("SELECT weight_lbs FROM pet_weight_entries")).rows[0].weight_lbs, "22");
});
