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

test('weight validation rejects partial numbers and values that round to zero before saving', () => {
  const {parseWeighInWeight} = loadTS('utils/weighInWeight.ts');
  for (const raw of ['12abc','1,2,3','Infinity','NaN','0','-2','0.001','1000000','1e2','']) assert.equal(parseWeighInWeight(raw),null,raw);
  assert.equal(parseWeighInWeight(' 24,5 '),24.5);
  assert.equal(parseWeighInWeight('24.567'),24.57);
  assert.equal(parseWeighInWeight('.5'),0.5);
});
test('weigh-in Save catches backend errors, preserves input and prevents duplicate taps', async () => {
  const runtime = require('react/jsx-runtime');
  let state = [], cursor = 0, currentSubmit, release, calls = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const weight = loadTS('utils/weighInWeight.ts');
  const {default: Step} = loadTS('components/activity/WeighInDetailStep.tsx', {
    'react/jsx-runtime':runtime,
    react: {
      forwardRef:fn=>fn,useCallback:fn=>fn,
      useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],next=>{state[i]=next;}];},
      useRef:initial=>{const i=cursor++;return state[i]??(state[i]={current:initial});},
      useImperativeHandle:(_ref,factory)=>{currentSubmit=factory().submit;},
    },
    'react-native':{StyleSheet:{create:x=>x},Pressable:'press',Text:'text',View:'view'},
    '@/components/activity/ActivityOccurredTimeRow':{default:'time'},
    '@/components/ui/form/FormInput':{__esModule:true,default:'input'},
    '@/components/ui/buttons/OrangeButton':{default:'button'},
    '@/theme/colors':require('./theme-mocks.cjs'),'@/theme/typography':{Font:{}},
    '@/utils/weighInWeight':weight,
    '@/stores/activityFormStore':{useActivityFormStore:select=>select({weighInForm:{weight:'24.5',weightUnit:'lbs',label:'',notes:''},updateWeighIn(){}})},
  });
  const render=()=>{cursor=0;return Step({onSave:async()=>{calls++;await pending;throw {code:'42883'};},onBack(){},embeddedInScreen:true,hideEmbeddedSave:true},{});};
  render();currentSubmit();currentSubmit();assert.equal(calls,1);
  release();await new Promise(setImmediate);
  const tree=render();
  const flatten=node=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node.props?.children)?node.props.children:[node.props?.children]).flatMap(flatten)];
  const alert=flatten(tree).find(node=>node.props?.accessibilityRole==='alert');
  assert.ok(alert);assert.match(alert.props.children,/temporarily unavailable/);
  assert.equal(flatten(tree).find(node=>node.type==='input').props.value,'24.5');
  assert.equal(state[0],false);
});
