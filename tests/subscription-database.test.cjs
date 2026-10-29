const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("./database.cjs");

test("scoped billing installer is repeatable, preserves pet policies/data and supports the later full rollout", async (t) => {
  const baseline = "20261026120000_subscription_reliability.sql";
  const db = await load({
    skipMigrations: [baseline, "20261026123000_co_care_integrity.sql", "20261028160000_revised_free_pro_tiers.sql"],
  });
  t.after(() => db.close());
  const id = "22222222-2222-4222-8222-222222222222";
  await db.query(
    "INSERT INTO auth.users(id,email) VALUES($1,'scoped-billing@example.invalid')",
    [id],
  );
  await db.query("INSERT INTO pets(owner_id,name) VALUES($1,'Preserved')", [
    id,
  ]);
  const before = await db.query(
    "SELECT pg_get_functiondef('public.can_access_pet(uuid)'::regprocedure) AS definition",
  );
  const installer = fs.readFileSync(
    "docs/sql/install-subscription-sync.sql",
    "utf8",
  );
  await db.exec(installer);
  await db.exec(installer);
  assert.deepEqual(
    await db.query(
      "SELECT pg_get_functiondef('public.can_access_pet(uuid)'::regprocedure) AS definition",
    ),
    before,
  );
  assert.equal(
    (await db.query("SELECT count(*) AS n FROM pets WHERE owner_id=$1", [id]))
      .rows[0].n,
    1,
  );
  await db.exec(
    `SELECT set_config('request.jwt.claim.role','service_role',false); SET ROLE service_role;`,
  );
  await db.query(
    "SELECT set_crittr_pro_admin_grant($1,now()+interval '1 day','Scoped installer QA')",
    [id],
  );
  assert.equal(
    (await db.query("SELECT user_has_crittr_pro($1) AS allowed", [id])).rows[0]
      .allowed,
    true,
  );
  const fence = (
    await db.query("SELECT begin_billing_reconciliation($1,0) AS token", [id])
  ).rows[0].token;
  await db.query("SELECT commit_billing_reconciliation($1,$2,$3)", [
    id,
    fence,
    {
      isActive: true,
      crittrProUntil: null,
      environment: "promotional",
      store: "promotional",
      productIdentifier: "rc_promo_crittr_pro_lifetime",
      willRenew: false,
    },
  ]);
  const profile = (
    await db.query(
      "SELECT subscription_environment,crittr_pro_until FROM profiles WHERE id=$1",
      [id],
    )
  ).rows[0];
  assert.equal(profile.subscription_environment, "promotional");
  assert.equal(profile.crittr_pro_until, null);
  await db.exec(
    "RESET ROLE; SELECT set_config('request.jwt.claim.role','',false)",
  );
  await db.exec(fs.readFileSync(`supabase/migrations/${baseline}`, "utf8"));
});

test("verified lifetime snapshots authorize access, expire verification and revoke without losing data", async (t) => {
  const db = await load();
  t.after(() => db.close());
  const id = "11111111-1111-4111-8111-111111111111";
  await db.query(
    "INSERT INTO auth.users(id,email) VALUES($1,'lifetime@example.invalid')",
    [id],
  );
  await db.exec(
    "SELECT set_config('request.jwt.claim.role','service_role',false)",
  );
  const fence = (
    await db.query("SELECT begin_billing_reconciliation($1,0) AS token", [id])
  ).rows[0].token;
  await db.query("SELECT commit_billing_reconciliation($1,$2,$3)", [
    id,
    fence,
    {
      isActive: true,
      crittrProUntil: null,
      environment: "promotional",
      store: "promotional",
      productIdentifier: "rc_promo_crittr_pro_lifetime",
      willRenew: false,
    },
  ]);
  const allowed = async () =>
    (await db.query("SELECT account_has_verified_pro($1) AS allowed", [id]))
      .rows[0].allowed;
  assert.equal(await allowed(), true);
  await db.query(
    "UPDATE profiles SET crittr_pro_last_synced_at=now()-interval '73 hours' WHERE id=$1",
    [id],
  );
  assert.equal(await allowed(), false);
  await db.query(
    "UPDATE profiles SET crittr_pro_last_synced_at=now() WHERE id=$1",
    [id],
  );
  assert.equal(await allowed(), true);
  const revokeFence = (
    await db.query("SELECT begin_billing_reconciliation($1,0) AS token", [id])
  ).rows[0].token;
  await db.query("SELECT commit_billing_reconciliation($1,$2,$3)", [
    id,
    revokeFence,
    { isActive: false },
  ]);
  assert.equal(await allowed(), false);
  assert.equal(
    (await db.query("SELECT count(*) AS n FROM profiles WHERE id=$1", [id]))
      .rows[0].n,
    1,
  );
  const sql = fs.readFileSync(
    "supabase/migrations/20261026140000_subscription_profile_realtime.sql",
    "utf8",
  );
  await db.exec(sql);
  assert.equal(
    (
      await db.query(
        "SELECT count(*) AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles'",
      )
    ).rows[0].n,
    1,
  );
});
