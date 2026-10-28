const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("./database.cjs");

test("orphaned invite actions are retired and new responses/revocations retire every matching inbox action", async (t) => {
  const migration = "20261026153000_retire_resolved_invite_notifications.sql";
  const db = await load({ skipMigrations: [migration] });
  t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111";
  const carer = "22222222-2222-4222-8222-222222222222";
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  const as = (id, role = "authenticated") => db.exec(
    `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`,
  );
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'owner@example.invalid'),($2,'carer@example.invalid')", [owner, carer]);
  await as(owner, "service_role");
  await db.query("UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id IN ($1,$2)", [owner, carer]);
  await as(owner);
  const pet = await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Lifecycle pet') RETURNING id", [owner]);
  const invite = async () => {
    await as(owner);
    return scalar("INSERT INTO co_carer_invites(pet_id,invited_by,invited_user_id,email) VALUES($1,$2,$3,'carer@example.invalid') RETURNING id", [pet, owner, carer]);
  };
  const pending = await invite();
  await as(owner, "service_role");
  const orphan = await scalar("INSERT INTO notifications(user_id,type,title,data) VALUES($1,'co_care_invite','Old invite',jsonb_build_object('invite_id',gen_random_uuid())) RETURNING id", [carer]);
  const unrelated = await scalar("INSERT INTO notifications(user_id,type,title) VALUES($1,'co_care_removed','Other update') RETURNING id", [carer]);
  const snapshot = await db.query("SELECT * FROM co_carer_invites");
  const sql = fs.readFileSync(`supabase/migrations/${migration}`, "utf8");
  await db.exec("RESET ROLE");
  await db.exec(sql);
  await db.exec(sql);
  assert.equal(await scalar("SELECT read FROM notifications WHERE id=$1", [orphan]), true);
  assert.equal(await scalar("SELECT read FROM notifications WHERE id=$1", [unrelated]), false);
  assert.equal(await scalar("SELECT read FROM notifications WHERE data->>'invite_id'=$1", [pending]), false);
  assert.deepEqual(await db.query("SELECT * FROM co_carer_invites"), snapshot);
  assert.equal(await scalar("SELECT count(*) FROM pet_co_carers"), 0);

  await as(owner);
  await db.query("UPDATE co_carer_invites SET permissions=permissions WHERE id=$1", [pending]);
  await as(carer);
  assert.equal(await scalar("SELECT read FROM notifications WHERE data->>'invite_id'=$1", [pending]), false);
  await db.query("UPDATE co_carer_invites SET status='declined',responded_at=now() WHERE id=$1", [pending]);
  assert.equal(await scalar("SELECT read FROM notifications WHERE data->>'invite_id'=$1", [pending]), true);

  const revoked = await invite();
  await db.query("DELETE FROM co_carer_invites WHERE id=$1", [revoked]);
  await as(carer);
  assert.equal(await scalar("SELECT count(*) FROM co_carer_invites WHERE id=$1", [revoked]), 0);
  assert.equal(await scalar("SELECT read FROM notifications WHERE data->>'invite_id'=$1", [revoked]), true);

  const accepted = await invite();
  await as(owner, "service_role");
  await db.query("INSERT INTO notifications(user_id,type,title,data) VALUES($1,'co_care_invite_requires_pro','Duplicate invite',jsonb_build_object('invite_id',$2::text))", [carer, accepted]);
  await as(carer);
  assert.equal(await scalar("SELECT accept_co_care_invite($1)", [accepted]), pet);
  assert.equal(await scalar("SELECT count(*) FROM notifications WHERE data->>'invite_id'=$1 AND NOT read", [accepted]), 0);
  assert.equal(await scalar("SELECT accept_co_care_invite($1)", [accepted]), pet);
  assert.equal(await scalar("SELECT count(*) FROM pet_co_carers"), 1);
});
