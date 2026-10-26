const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./database.cjs");
const owner = "11111111-1111-4111-8111-111111111111",
  carer = "22222222-2222-4222-8222-222222222222";
test("migrations and authenticated subscription invariants", async (t) => {
  const db = await load();
  t.after(() => db.close());
  const scalar = async (sql, args = []) =>
    Object.values((await db.query(sql, args)).rows[0])[0];
  const as = async (id, role = "authenticated") =>
    db.exec(
      `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`,
    );
  await db.query(
    `INSERT INTO auth.users(id,email) VALUES($1,'owner@example.invalid'),($2,'carer@example.invalid')`,
    [owner, carer],
  );
  const pro = async (id) => {
    await as(id, "service_role");
    await db.query(
      `UPDATE profiles SET crittr_pro_active=true,crittr_pro_until=now()+interval '1 month',crittr_pro_last_synced_at=now(),subscription_environment='production' WHERE id=$1`,
      [id],
    );
  };
  await as(owner);
  let first;
  await t.test(
    "free account creates one living pet and cannot forge Pro",
    async () => {
      first = await scalar(
        `INSERT INTO pets(owner_id,name) VALUES($1,'First') RETURNING id`,
        [owner],
      );
      await assert.rejects(
        () =>
          db.query(`INSERT INTO pets(owner_id,name) VALUES($1,'Second')`, [
            owner,
          ]),
        /Additional pets/,
      );
      await db.query(
        `UPDATE profiles SET crittr_pro_until=now()+interval '10 years',crittr_pro_last_synced_at=now(),subscription_environment='production' WHERE id=$1`,
        [owner],
      );
      assert.equal(await scalar("SELECT user_has_crittr_pro()"), false);
    },
  );
  let extra;
  await t.test(
    "renewed access allows extra pets and records; downgrade retains all data",
    async () => {
      await pro(owner);
      await as(owner);
      extra = await scalar(
        `INSERT INTO pets(owner_id,name) VALUES($1,'Second') RETURNING id`,
        [owner],
      );
      await db.query(
        `INSERT INTO pet_medical_records(pet_id,title,created_by) VALUES($1,'History',$2)`,
        [extra, owner],
      );
      await as(owner, "service_role");
      await db.query(
        `UPDATE profiles SET crittr_pro_until=now()-interval '1 second' WHERE id=$1`,
        [owner],
      );
      await as(owner);
      assert.equal(Number(await scalar("SELECT count(*) FROM pets")), 2);
      assert.equal(
        Number(await scalar("SELECT count(*) FROM pet_medical_records")),
        1,
      );
      assert.equal(await scalar("SELECT pet_is_writable($1)", [extra]), false);
      await assert.rejects(
        () =>
          db.query(
            `INSERT INTO pet_medical_records(pet_id,title,created_by) VALUES($1,'Blocked',$2)`,
            [first, owner],
          ),
        /row-level security/,
      );
      await assert.rejects(
        () =>
          db.query(
            `INSERT INTO storage.objects(bucket_id,name,owner) VALUES('medical-records',$1,$2)`,
            [first + "/file/doc.pdf", owner],
          ),
        /row-level security/,
      );
      assert.equal(
        (
          await db.query(
            `UPDATE pets SET name='Blocked' WHERE id=$1 RETURNING id`,
            [extra],
          )
        ).rows.length,
        0,
      );
    },
  );
  await t.test(
    "co-care access expires and restores without deleting membership",
    async () => {
      await pro(owner);
      await pro(carer);
      await as(owner, "service_role");
      await db.query(
        `INSERT INTO pet_co_carers(pet_id,user_id,invited_by) VALUES($1,$2,$3)`,
        [first, carer, owner],
      );
      await as(carer);
      assert.equal(await scalar("SELECT can_access_pet($1)", [first]), true);
      await as(carer, "service_role");
      await db.query(
        `UPDATE profiles SET crittr_pro_until=now()-interval '1 second' WHERE id=$1`,
        [carer],
      );
      await as(carer);
      assert.equal(await scalar("SELECT can_access_pet($1)", [first]), false);
      await pro(carer);
      await as(carer);
      assert.equal(await scalar("SELECT can_access_pet($1)", [first]), true);
    },
  );
  await t.test("sandbox and stale verification fail closed", async () => {
    await as(owner, "service_role");
    await db.query(
      `UPDATE profiles SET subscription_environment='sandbox' WHERE id=$1`,
      [owner],
    );
    await as(owner);
    assert.equal(await scalar("SELECT user_has_crittr_pro()"), false);
    await as(owner, "service_role");
    await db.query("INSERT INTO billing_test_accounts VALUES($1)", [owner]);
    await as(owner);
    assert.equal(await scalar("SELECT user_has_crittr_pro()"), true);
    await as(owner, "service_role");
    await db.query(
      `UPDATE profiles SET crittr_pro_last_synced_at=now()-interval '73 hours' WHERE id=$1`,
      [owner],
    );
    await as(owner);
    assert.equal(await scalar("SELECT user_has_crittr_pro()"), false);
  });
  await t.test(
    "reconciliation fences stale workers and prevents client RPC access",
    async () => {
      await as(owner);
      await assert.rejects(
        () => db.query("SELECT begin_billing_reconciliation($1)", [owner]),
        /permission denied/,
      );
      await as(owner, "service_role");
      const fence = await scalar("SELECT begin_billing_reconciliation($1,0)", [
        owner,
      ]);
      assert.equal(
        await scalar("SELECT begin_billing_reconciliation($1,0)", [owner]),
        null,
      );
      assert.equal(
        await scalar(
          `SELECT commit_billing_reconciliation($1,gen_random_uuid(),'{}')`,
          [owner],
        ),
        false,
      );
      assert.equal(
        await scalar(`SELECT commit_billing_reconciliation($1,$2,$3)`, [
          owner,
          fence,
          JSON.stringify({
            isActive: true,
            crittrProUntil: new Date(Date.now() + 3600000),
            environment: "production",
            store: "app_store",
          }),
        ]),
        true,
      );
      assert.equal(
        await scalar(`SELECT claim_billing_webhook('event-1','TRANSFER')`),
        true,
      );
      assert.equal(
        await scalar(`SELECT claim_billing_webhook('event-1','TRANSFER')`),
        false,
      );
    },
  );
  await t.test(
    "admin grants are explicit, expire, survive reconciliation, and can be revoked",
    async () => {
      await as(owner);
      await assert.rejects(
        () =>
          db.query(
            "SELECT set_crittr_pro_admin_grant($1,now()+interval '1 day','Test')",
            [owner],
          ),
        /permission denied/,
      );
      await as(owner, "service_role");
      await db.query(
        "SELECT set_crittr_pro_admin_grant($1,now()+interval '1 day','QA test account')",
        [owner],
      );
      await as(owner);
      assert.equal(await scalar("SELECT user_has_crittr_pro()"), true);
      await as(owner, "service_role");
      const fence = await scalar("SELECT begin_billing_reconciliation($1,0)", [
        owner,
      ]);
      await db.query("SELECT commit_billing_reconciliation($1,$2,'{}')", [
        owner,
        fence,
      ]);
      await as(owner);
      assert.equal(await scalar("SELECT user_has_crittr_pro()"), true);
      await as(owner, "service_role");
      await db.query("DELETE FROM billing_admin_grants WHERE user_id=$1", [
        owner,
      ]);
      await as(owner);
      assert.equal(await scalar("SELECT user_has_crittr_pro()"), false);
    },
  );
  await t.test(
    "co-care invitations cannot be retargeted, escalated or replayed after removal",
    async () => {
      await pro(owner);
      await pro(carer);
      await as(owner);
      const permissions = {
        can_log_activities: true,
        can_edit_pet_profile: false,
      };
      const invite = await scalar(
        `INSERT INTO co_carer_invites(pet_id,invited_by,email,invited_user_id,permissions) VALUES($1,$2,'carer@example.invalid',$3,$4) RETURNING id`,
        [extra, owner, carer, JSON.stringify(permissions)],
      );
      await as(carer);
      await assert.rejects(
        () =>
          db.query("UPDATE co_carer_invites SET pet_id=$1 WHERE id=$2", [
            first,
            invite,
          ]),
        /identity cannot be changed/,
      );
      await assert.rejects(
        () =>
          db.query(
            `UPDATE co_carer_invites SET permissions='{"can_edit_pet_profile":true}' WHERE id=$1`,
            [invite],
          ),
        /Only the inviter/,
      );
      await assert.rejects(
        () =>
          db.query(
            `UPDATE co_carer_invites SET status='accepted' WHERE id=$1`,
            [invite],
          ),
        /membership transaction/,
      );
      await db.query(
        `INSERT INTO pet_co_carers(pet_id,user_id,invited_by,permissions) VALUES($1,$2,$3,'{"can_edit_pet_profile":true}')`,
        [extra, carer, owner],
      );
      const granted = await scalar(
        "SELECT permissions FROM pet_co_carers WHERE pet_id=$1 AND user_id=$2",
        [extra, carer],
      );
      assert.equal(granted.can_edit_pet_profile, false);
      assert.equal(granted.can_log_activities, true);
      assert.equal(
        await scalar("SELECT status FROM co_carer_invites WHERE id=$1", [
          invite,
        ]),
        "accepted",
      );
      assert.equal(
        await scalar("SELECT accept_co_care_invite($1)", [invite]),
        extra,
      );
      await as(owner);
      await db.query(
        "DELETE FROM pet_co_carers WHERE pet_id=$1 AND user_id=$2",
        [extra, carer],
      );
      await as(carer);
      await assert.rejects(
        () =>
          db.query(`INSERT INTO pet_co_carers(pet_id,user_id) VALUES($1,$2)`, [
            extra,
            carer,
          ]),
        /pending owner invitation/,
      );
      await assert.rejects(
        () => db.query("SELECT accept_co_care_invite($1)", [invite]),
        /no longer pending/,
      );
      await assert.rejects(
        () =>
          db.query(`UPDATE co_carer_invites SET status='pending' WHERE id=$1`, [
            invite,
          ]),
        /cannot be reopened/,
      );
      await assert.rejects(
        () =>
          db.query(
            `INSERT INTO co_carer_invites(pet_id,invited_by,email,invited_user_id) VALUES($1,$2,'carer@example.invalid',$2)`,
            [first, carer],
          ),
        /Only the pet owner/,
      );
    },
  );
  await t.test(
    "atomic co-care acceptance is idempotent and requires both verified subscriptions",
    async () => {
      await as(owner);
      const invite = await scalar(
        `INSERT INTO co_carer_invites(pet_id,invited_by,email,invited_user_id) VALUES($1,$2,'carer@example.invalid',$3) RETURNING id`,
        [extra, owner, carer],
      );
      await as(owner, "service_role");
      await db.query(
        `UPDATE profiles SET crittr_pro_last_synced_at=now()-interval '73 hours' WHERE id=$1`,
        [owner],
      );
      await as(carer);
      await assert.rejects(
        () => db.query("SELECT accept_co_care_invite($1)", [invite]),
        /Both accounts/,
      );
      assert.equal(
        await scalar("SELECT status FROM co_carer_invites WHERE id=$1", [
          invite,
        ]),
        "pending",
      );
      await pro(owner);
      await as(carer);
      assert.equal(
        await scalar("SELECT accept_co_care_invite($1)", [invite]),
        extra,
      );
      assert.equal(
        await scalar("SELECT accept_co_care_invite($1)", [invite]),
        extra,
      );
      assert.equal(
        Number(
          await scalar(
            "SELECT count(*) FROM pet_co_carers WHERE pet_id=$1 AND user_id=$2",
            [extra, carer],
          ),
        ),
        1,
      );
      await as(owner);
    },
  );
  await t.test(
    "legacy memberships with an invalid inviter stay stored without granting access",
    async () => {
      await as(owner, "service_role");
      await db.query(
        "UPDATE pet_co_carers SET invited_by=$1 WHERE pet_id=$2 AND user_id=$3",
        [carer, first, carer],
      );
      await as(carer);
      assert.equal(await scalar("SELECT can_access_pet($1)", [first]), false);
      assert.equal(
        Number(
          await scalar(
            "SELECT count(*) FROM pet_co_carers WHERE pet_id=$1 AND user_id=$2",
            [first, carer],
          ),
        ),
        1,
      );
      await as(owner, "service_role");
      await db.query(
        "UPDATE pet_co_carers SET invited_by=$1 WHERE pet_id=$2 AND user_id=$3",
        [owner, first, carer],
      );
      await as(owner);
    },
  );
});
