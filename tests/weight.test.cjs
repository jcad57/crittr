const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./database.cjs");
const { loadTS } = require("./load-typescript.cjs");

test("weight ranges start with All and retain all historical points", () => {
  const weights = loadTS("utils/petWeightHistory.ts");
  assert.deepEqual(Array.from(weights.WEIGHT_HISTORY_RANGE_OPTIONS, (r) => r.id), ["ALL", "1W", "1M", "3M", "6M", "1Y"]);
  const points = [{ ts: 1 }, { ts: Date.now() }];
  assert.equal(weights.pointsForRange(points, "ALL"), points);
});

test("duplicate-date confirmation cancels without saving and continues with explicit replacement", async () => {
  class DuplicateWeighInError extends Error { recordedAt = "2026-10-26"; }
  for (const choice of ["Cancel", "Continue"]) {
    const calls = [];
    const module = loadTS("hooks/mutations/confirmWeighInReplacement.ts", {
      "@/services/activities/weighIn": { DuplicateWeighInError },
      "@/lib/sessionGeneration": { sessionGeneration: () => 0 },
      "react-native": { Alert: { alert: (_title, message, buttons) => {
        assert.match(message, /replace that day's weight and activity/);
        buttons.find((button) => button.text === choice).onPress();
      } } },
    });
    const activity = { id: "activity" };
    const result = await module.saveWithWeighInConfirmation(async (replace) => {
      calls.push(replace);
      if (!replace) throw new DuplicateWeighInError();
      return activity;
    });
    assert.deepEqual(calls, choice === "Continue" ? [false, true] : [false]);
    assert.equal(result, choice === "Continue" ? activity : null);
  }
});

test("daily weigh-ins are conflict-safe, atomic, permission checked, and keep the latest pet weight", async (t) => {
  const db = await load();
  t.after(() => db.close());
  const owner = "11111111-1111-4111-8111-111111111111";
  const stranger = "22222222-2222-4222-8222-222222222222";
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'weight-owner@example.invalid'),($2,'stranger@example.invalid')", [owner, stranger]);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false); SELECT set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;`);
  const pet = (await db.query("INSERT INTO pets(owner_id,name) VALUES($1,'Weight test') RETURNING id", [owner])).rows[0].id;
  const save = async (day, weight, replace = false, activityId = null) => (await db.query(
    "SELECT * FROM save_pet_weigh_in($1,$2,$3,$4,'lbs','Weigh-in','Test',$5,$6)",
    [pet, day, day + "T12:00:00Z", weight, replace, activityId],
  )).rows[0];
  const first = await save("2026-10-26", 20);
  await assert.rejects(() => save("2026-10-26", 22), (error) => error.code === "P2001");
  assert.equal((await db.query("SELECT weight_lbs FROM pets WHERE id=$1", [pet])).rows[0].weight_lbs, "20.00");
  const replacement = await save("2026-10-26", 22, true);
  assert.equal(replacement.id, first.id);
  assert.equal((await db.query("SELECT count(*) AS n FROM pet_weight_entries WHERE pet_id=$1", [pet])).rows[0].n, 1);
  const older = await save("2026-10-25", 19);
  assert.equal((await db.query("SELECT weight_lbs FROM pets WHERE id=$1", [pet])).rows[0].weight_lbs, "22.00");
  await assert.rejects(() => save("2026-10-26", 21, false, older.id), (error) => error.code === "P2001");
  await save("2026-10-26", 21, true, older.id);
  assert.equal((await db.query("SELECT count(*) AS n FROM pet_weight_entries WHERE pet_id=$1", [pet])).rows[0].n, 1);
  assert.equal((await db.query("SELECT count(*) AS n FROM pet_activities WHERE pet_id=$1", [pet])).rows[0].n, 1);
  await assert.rejects(() => db.query("INSERT INTO pet_weight_entries(pet_id,recorded_at,weight_lbs) VALUES($1,'2026-10-26',25)", [pet]), (error) => error.code === "23505");
  await assert.rejects(() => save("2026-10-27", -5), /valid weight/);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${stranger}',false)`);
  await assert.rejects(() => save("2026-10-28", 40), /permission/);
  await db.exec("RESET ROLE");
  assert.equal((await db.query("SELECT count(*) AS n FROM pet_weight_entry_revisions")).rows[0].n, 2);
});
