const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadTS}=require('./load-typescript.cjs');
const {load}=require('./database.cjs');
const {pet,schedulePlan}=require('./care-plan-fixture.cjs');
const {normalizePottyTimes}=loadTS('utils/pottySchedule.ts');
const planner=loadTS('supabase/functions/_shared/careReminderPlan.ts',{'../../../utils/buildSchedulePlan.ts':schedulePlan});

test('potty times are optional, minute-precision, distinct and sorted',()=>{
 assert.deepEqual(Array.from(normalizePottyTimes([])),[]);
 assert.deepEqual(Array.from(normalizePottyTimes(['20:00','8:30','08:30:00'])),['08:30:00','20:00:00']);
 for(const time of ['24:00','08:61','08:00:05','-1:00','eight',''])assert.throws(()=>normalizePottyTimes([time]),/valid potty time/);
});
test('potty reminders repeat daily in the owner care zone with their own preference and log destination',()=>{
 const input={pet:pet({potty_times:['07:30:00','20:00:00']}),time_zone:'America/Chicago',vet_visits:[],version:'v'};
 for(const date of ['2026-10-28','2026-10-29'])for(const time of input.pet.potty_times){
  const instant=planner.careWallTimeToDate(date,time,input.time_zone);
  const events=planner.buildDueCareReminders(input,instant);
  assert.equal(events.length,1);assert.equal(events[0].category,'notify_potty_breaks');
  assert.equal(events[0].scheduled_at,instant.toISOString());assert.equal(events[0].source_slot,time.slice(0,5));
  assert.match(events[0].href,/type=potty/);
 }
 assert.equal(planner.buildDueCareReminders({...input,pet:pet()},new Date('2026-10-29T12:30:00Z')).length,0);
 assert.equal(planner.buildDueCareReminders({...input,pet:{...input.pet,potty_schedule_updated_at:'2026-10-29T12:31:00Z'}},new Date('2026-10-29T12:35:00Z')).length,0,'no immediate replay of a time added after it passed');
});
test('potty opt-out is independent and old All off remains off',()=>{
 const prefs=loadTS('utils/pushNotificationPreferences.ts',{'@react-native-async-storage/async-storage':{}});
 assert.equal(prefs.notificationPrefsFromProfile({}).notify_potty_breaks,true);
 const allOff={notify_meals_treats:false,notify_co_care_activities:false,notify_medications:false,notify_vet_visits:false,notify_vaccinations:false};
 assert.equal(prefs.notificationPrefsFromProfile(allOff).notify_potty_breaks,false);
 const profile={id:'user',notify_potty_breaks:false,notify_co_care_activities:true};
 assert.equal(prefs.shouldPresentNotification({type:'care_task_due',category:'notify_potty_breaks'},'user',profile),false);
 assert.equal(prefs.shouldPresentNotification({type:'care_task_due',category:'notify_co_care_activities'},'user',profile),true);
});

test('combined care save is atomic, keeps exercise identities, validates times and enforces profile edit permissions',async(t)=>{
 const db=await load();t.after(()=>db.close());
 const owner='11111111-1111-4111-8111-111111111111',stranger='22222222-2222-4222-8222-222222222222';
 await db.query("INSERT INTO auth.users(id,email) VALUES($1,'potty-owner@example.invalid'),($2,'potty-stranger@example.invalid')",[owner,stranger]);
 await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false); SELECT set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated`);
 const id=(await db.query("INSERT INTO pets(owner_id,name) VALUES($1,'Milo') RETURNING id",[owner])).rows[0].id;
 const save=async(plans,times)=> (await db.query('SELECT save_pet_exercise_and_potty($1,$2,$3,$4) AS result',[id,'medium',plans,times])).rows[0].result;
 const first=await save([{label:'Walk',days_of_week:[0,1,2,3,4,5,6],scheduled_time:'08:00',notes:null}],['07:30','20:00']);
 const exercise=first.exercise_plans[0];assert.equal(first.pet.potty_times.length,2);
 const same=await save([{...exercise,label:'Morning walk'}],['07:30','20:00']);
 assert.equal(same.exercise_plans[0].id,exercise.id);
 assert.equal(same.pet.potty_schedule_updated_at,first.pet.potty_schedule_updated_at);
 const slot=(await db.query("INSERT INTO pet_schedule_items(pet_id,local_date,scheduled_time,activity_type,source_kind,source_id,source_slot,label) VALUES($1::uuid,current_date,'07:30','potty','potty',($1::uuid)::text,'07:30','Potty break') RETURNING id",[id])).rows[0].id;
 await assert.rejects(()=>db.query('SELECT complete_pet_potty_schedule_item($1,false,false)',[slot]),/Choose pee, poo, or both/);
 const completed=(await db.query('SELECT (complete_pet_potty_schedule_item($1,true,false)).*',[slot])).rows[0];
 assert.ok(completed.activity_id);
 const activity=(await db.query('SELECT potty_pee,potty_poo FROM pet_activities WHERE id=$1',[completed.activity_id])).rows[0];
 assert.equal(activity.potty_pee,true);assert.equal(activity.potty_poo,false);
 const again=(await db.query('SELECT (complete_pet_potty_schedule_item($1,true,false)).*',[slot])).rows[0];
 assert.equal(again.activity_id,completed.activity_id);
 await db.query('SELECT set_pet_schedule_item_completed($1,false)',[slot]);
 assert.equal((await db.query('SELECT count(*) AS n FROM pet_activities WHERE id=$1',[completed.activity_id])).rows[0].n,0);
 await assert.rejects(()=>save([{...exercise,label:'Must roll back'}],['07:30','07:30']),/valid energy level and care schedule/);
 assert.equal((await db.query('SELECT label FROM pet_exercise_plans WHERE id=$1',[exercise.id])).rows[0].label,'Morning walk');
 await assert.rejects(()=>db.query("UPDATE pets SET potty_times=ARRAY['24:00'::time] WHERE id=$1",[id]),/valid_pet_potty_times/);
 await db.exec(`SELECT set_config('request.jwt.claim.sub','${stranger}',false)`);
 await assert.rejects(()=>save([],['10:00']),/permission/);
});
test('new potty preference preserves All off and migration reruns preserve explicit choices',async(t)=>{
 const owner='11111111-1111-4111-8111-111111111111';
 const db=await load({beforeMigration:async(db,name)=>{
  if(name!=='20261029160000_potty_schedules.sql')return;
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'potty-off@example.invalid')",[owner]);
  await db.query('UPDATE profiles SET notify_meals_treats=false,notify_co_care_activities=false,notify_medications=false,notify_vet_visits=false,notify_vaccinations=false WHERE id=$1',[owner]);
 }});t.after(()=>db.close());
 assert.equal((await db.query('SELECT notify_potty_breaks FROM profiles WHERE id=$1',[owner])).rows[0].notify_potty_breaks,false);
 await db.query('UPDATE profiles SET notify_potty_breaks=true WHERE id=$1',[owner]);
 await db.exec('RESET ROLE');
 await db.exec(fs.readFileSync('supabase/migrations/20261029160000_potty_schedules.sql','utf8'));
 assert.equal((await db.query('SELECT notify_potty_breaks FROM profiles WHERE id=$1',[owner])).rows[0].notify_potty_breaks,true);
});

test('potty time editor adds, edits, cancels and protects read-only access; Android duplicate rejection closes cleanly',()=>{
 const runtime=require('react/jsx-runtime');
 const flatten=node=>node==null||typeof node==='boolean'?[]:Array.isArray(node)?node.flatMap(flatten):typeof node!=='object'?[node]:[node,...flatten(node.props?.children)];
 for(const platform of ['ios','android']){
  let values=[],cursor=0,times=['08:00:00'],alerts=0;
  const timeUtils=loadTS('utils/petFoodTime.ts',{'@/utils/userDateTimeFormat':{formatUserTime:date=>date.toTimeString().slice(0,5)}});
  const {default:Section}=loadTS('components/pet/PottyScheduleSection.tsx',{
   'react/jsx-runtime':runtime,react:{useState:initial=>{const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return[values[i],value=>{values[i]=value;}];}},
   'react-native':{Platform:{OS:platform},Alert:{alert:()=>alerts++},Modal:'modal',Pressable:'press',StyleSheet:{create:x=>x},Text:'text',View:'view'},
   '@expo/vector-icons':{MaterialCommunityIcons:'icon'},
   '@/components/ui/InlineTimePickerSheet':{__esModule:true,default:'picker'},
   '@/hooks/useUserDateTimePrefs':{useUserDateTimePrefs:()=>({timeDisplay:'12h'})},
   '@/theme/colors':require('./theme-mocks.cjs'),'@/theme/typography':{Font:{}},
   '@/utils/petFoodTime':timeUtils,'@/utils/pottySchedule':{normalizePottyTimes},
  });
  const render=(readOnly=false)=>{cursor=0;return flatten(Section({times,onChange:next=>times=next,readOnly}));};
  assert.equal(render(true).some(node=>node?.type==='press'),false);
  render().find(node=>node?.props?.accessibilityLabel==='Add potty time').props.onPress();
  render().find(node=>node?.type==='picker').props.onCancel();assert.equal(times.length,1);
  render().find(node=>node?.props?.accessibilityLabel==='Add potty time').props.onPress();
  const picker=render().find(node=>node?.type==='picker');
  if(platform==='ios')picker.props.onConfirm();else picker.props.onNativeChange({type:'set'},timeUtils.pgTimeToDate('12:00'));
  assert.deepEqual(Array.from(times),['08:00:00','12:00:00']);
  render().find(node=>node?.props?.accessibilityLabel==='Edit potty time 08:00').props.onPress();
  render().find(node=>node?.type==='picker').props.onNativeChange({type:'set'},timeUtils.pgTimeToDate('09:00'));
  if(platform==='ios')render().find(node=>node?.type==='picker').props.onConfirm();
  assert.deepEqual(Array.from(times),['09:00:00','12:00:00']);
  if(platform==='android'){
   render().find(node=>node?.props?.accessibilityLabel==='Add potty time').props.onPress();
   render().find(node=>node?.type==='picker').props.onNativeChange({type:'set'},timeUtils.pgTimeToDate('09:00'));
   assert.equal(alerts,1);assert.equal(render().some(node=>node?.type==='modal'),false);
  }
  render().find(node=>node?.props?.accessibilityLabel==='Remove potty time 12:00').props.onPress();
  assert.deepEqual(Array.from(times),['09:00:00']);
 }
});

test('potty notification jobs deduplicate and honor preference changes or removed times before send',async(t)=>{
 const db=await load();t.after(()=>db.close());
 const owner='11111111-1111-4111-8111-111111111111';
 const as=role=>db.exec(`RESET ROLE;SELECT set_config('request.jwt.claim.sub','${owner}',false);SELECT set_config('request.jwt.claim.role','${role}',false);SET ROLE ${role}`);
 await db.query("INSERT INTO auth.users(id,email) VALUES($1,'potty-reminders@example.invalid')",[owner]);
 await db.exec('UPDATE care_reminder_config SET enabled=true');
 await as('authenticated');
 await db.query("SELECT initialize_care_time_zone('America/Chicago')");
 await db.query("SELECT register_expo_push_token('ExpoPushToken[potty]')");
 await db.query("SELECT activate_device_care_reminders('ExpoPushToken[potty]')");
 const id=(await db.query("INSERT INTO pets(owner_id,name,potty_times) VALUES($1,'Milo',ARRAY['08:00'::time]) RETURNING id",[owner])).rows[0].id;
 await as('service_role');
 await db.exec("UPDATE user_expo_push_devices SET care_reminders_enabled_at=now()-interval '1 day'");
 const source=(await db.query('SELECT * FROM care_reminder_inputs()')).rows[0].care_reminder_inputs;
 assert.deepEqual(source.pet.potty_times,['08:00:00']);
 const due=(await db.query("SELECT to_char(now()-interval '1 minute','YYYY-MM-DD\"T\"HH24:MI:SSOF') AS value")).rows[0].value;
 const reminder={local_date:due.slice(0,10),source_kind:'potty',source_id:id,source_slot:'08:00',reminder_key:'due',scheduled_at:due,category:'notify_potty_breaks',title:'Potty reminder',body:'Time for a break',href:'/(logged-in)/add-activity?type=potty'};
 for(let i=0;i<2;i++)await db.query('SELECT enqueue_due_care_reminders($1,$2,$3)',[id,source.version,[reminder]]);
 assert.equal((await db.query('SELECT count(*) AS n FROM notification_push_deliveries')).rows[0].n,1);
 await as('authenticated');await db.query('UPDATE profiles SET notify_potty_breaks=false WHERE id=$1',[owner]);
 await as('service_role');
 const jobs=(await db.query('SELECT * FROM claim_notification_push_deliveries()')).rows;
 assert.equal(jobs.length,1);assert.equal(jobs[0].deliverable,false);assert.equal(jobs[0].data.category,'notify_potty_breaks');
 const occurrence=(await db.query('SELECT id FROM care_reminder_occurrences')).rows[0].id;
 await db.query('UPDATE profiles SET notify_potty_breaks=true WHERE id=$1',[owner]);
 await db.exec('RESET ROLE');
 assert.equal((await db.query('SELECT care_reminder_is_deliverable($1,$2) AS allowed',[occurrence,owner])).rows[0].allowed,true);
 await as('authenticated');await db.query("UPDATE pets SET potty_times='{}' WHERE id=$1",[id]);
 await db.exec('RESET ROLE');
 assert.equal((await db.query('SELECT care_reminder_is_deliverable($1,$2) AS allowed',[occurrence,owner])).rows[0].allowed,false);
});

test('onboarding keeps potty times on Continue and Back beneath exercise entries',()=>{
 const runtime=require('react/jsx-runtime');
 const flatten=node=>node==null||typeof node==='boolean'?[]:Array.isArray(node)?node.flatMap(flatten):typeof node!=='object'?[node]:[node,...flatten(node.props?.children)];
 let state=[],cursor=0,saved,destination;
 const pet={clientRequestId:'draft',petType:'dog',name:'Milo',energyLevel:'medium',exercisePlans:[{localId:'walk',label:'Walk',daysOfWeek:[1],scheduledTimePg:'08:00',notes:''}],pottyTimes:[]};
 const theme=require('./theme-mocks.cjs');
 const {default:Step}=loadTS('components/onboarding/PetExerciseStep.tsx',{
  'react/jsx-runtime':runtime,react:{useState:initial=>{const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],v=>state[i]=v];},useEffect(){},useMemo:fn=>fn(),useCallback:fn=>fn},
  '@/theme/colors':theme,
  '@/components/onboarding/petCareStyles':{getPetCareStyles:()=>({})},
  '@/components/onboarding/petInfo/PetEnergyLevelToggle':{default:'energy'},
  '@/components/pet/ExercisePlanEditorModal':{default:'exercise-modal'},
  '@/components/pet/ExercisePlansSection':{__esModule:true,default:'exercise-list'},
  '@/components/pet/PottyScheduleSection':{__esModule:true,default:'potty-list'},
  '@/components/ui/buttons/OrangeButton':{__esModule:true,default:'continue'},
  '@/constants/activityTypeProgressIcons':{getExerciseActivityIcon:()=> 'walk'},
  '@/constants/authOnboardingStyles':{getAuthOnboardingStyles:()=>({})},
  '@/constants/petInfo':{shouldShowExerciseField:()=>true},
  '@/stores/onboardingStore':{useOnboardingStore:select=>select({pets:[pet],currentPetIndex:0,petFlowMode:'onboarding',updateCurrentPet:patch=>saved=patch,goToStep:step=>destination=step})},
  '@/utils/exercisePlans':{defaultExercisePlanDraft:()=>({})},
  '@/utils/onboardingPetFlow':{PET_DETAILS_STEP_INDEX:1,PET_FOOD_STEP_INDEX:3,shouldShowFirstCatLitterOnboardingStep:()=>false},
  '@/utils/petFoodTime':loadTS('utils/petFoodTime.ts',{'@/utils/userDateTimeFormat':{}}),
  'expo-image':{Image:'image'},'react-native':{Text:'text',TouchableOpacity:'back',View:'view'},
  'zustand/react/shallow':{useShallow:fn=>fn},
 });
 const render=()=>{cursor=0;return flatten(Step());};
 const nodes=render();assert.ok(nodes.findIndex(n=>n?.type==='exercise-list')<nodes.findIndex(n=>n?.type==='potty-list'));
 nodes.find(n=>n?.type==='potty-list').props.onChange(['07:30:00','20:00:00']);
 render().find(n=>n?.type==='continue').props.onPress();assert.deepEqual(saved.pottyTimes,['07:30:00','20:00:00']);assert.equal(destination,3);
 render().find(n=>n?.type==='back').props.onPress();assert.deepEqual(saved.pottyTimes,['07:30:00','20:00:00']);assert.equal(destination,1);
});

test('scheduled potty confirmation collects real outcomes, allows cancellation, and shares repeated taps',async()=>{
 let callback,buttons;
 const Platform={OS:'ios'};
 const {confirmPottyBreak}=loadTS('hooks/mutations/confirmPottyBreak.ts',{
  'react-native':{Platform,ActionSheetIOS:{showActionSheetWithOptions:(_options,fn)=>callback=fn},Alert:{alert:(_title,_message,choices)=>buttons=choices}},
  '@/lib/sessionGeneration':{sessionGeneration:()=>1},
 });
 const first=confirmPottyBreak('one');assert.equal(confirmPottyBreak('one'),first);callback(2);
 assert.deepEqual(JSON.parse(JSON.stringify(await first)),{pee:true,poo:true});
 const cancelled=confirmPottyBreak('one');callback(3);assert.equal(await cancelled,null);
 Platform.OS='android';const android=confirmPottyBreak('two');buttons.find(b=>b.text==='Poo').onPress();
 assert.deepEqual(JSON.parse(JSON.stringify(await android)),{pee:false,poo:true});
});
