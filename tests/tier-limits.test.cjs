const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('./database.cjs');
const { loadTS } = require('./load-typescript.cjs');
const owner='11111111-1111-4111-8111-111111111111';
const carer='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const migration='20261028160000_revised_free_pro_tiers.sql';

test('revised tiers enforce owned-pet and per-pet co-care boundaries without losing downgrade data', async (t) => {
 const db=await load(); t.after(()=>db.close());
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 const as=(uid,role='authenticated')=>db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${uid}',false); SELECT set_config('request.jwt.claim.role','${role}',false); SET ROLE ${role};`);
 const pro=async(active)=>{await as(owner,'service_role'); await db.query("UPDATE profiles SET crittr_pro_active=$2,crittr_pro_until=NULL,crittr_pro_last_synced_at=now(),subscription_environment='promotional' WHERE id=$1",[owner,active]); await as(owner);};
 await db.query("INSERT INTO auth.users(id,email) VALUES($1,'owner@example.invalid'),($2,'carer@example.invalid'),($3,'other@example.invalid')",[owner,carer,other]);
 await as(owner);
 const first=await scalar("INSERT INTO pets(owner_id,name,created_at,is_memorialized) VALUES($1,'Remembered',now()-interval '3 days',true) RETURNING id",[owner]);
 const second=await scalar("INSERT INTO pets(owner_id,name,created_at) VALUES($1,'Second',now()-interval '2 days') RETURNING id",[owner]);
 const third=await scalar("INSERT INTO pets(owner_id,name,created_at) VALUES($1,'Third',now()-interval '1 day') RETURNING id",[owner]);
 await assert.rejects(()=>db.query("INSERT INTO pets(owner_id,name,is_memorialized) VALUES($1,'Fourth',true)",[owner]),/Free includes 3 pets/);
 await db.query('UPDATE pets SET is_memorialized=false WHERE id=$1',[first]);
 for(const pet of [first,second,third]) assert.equal(await scalar('SELECT pet_is_writable($1)',[pet]),true);
 // No saved-care count cap and no activity count cap on Free.
 await db.query("INSERT INTO pet_foods(pet_id,brand) SELECT $1,'Food '||g FROM generate_series(1,4) g",[second]);
 await db.query("INSERT INTO pet_medications(pet_id,name) SELECT $1,'Medication '||g FROM generate_series(1,4) g",[second]);
 await db.query("INSERT INTO pet_vaccinations(pet_id,name) SELECT $1,'Vaccine '||g FROM generate_series(1,4) g",[second]);
 await db.query("INSERT INTO pet_activities(pet_id,logged_by,activity_type,label) SELECT $1,$2,'exercise','Walk '||g FROM generate_series(1,125) g",[second,owner]);
 assert.equal(Number(await scalar('SELECT count(*) FROM pet_activities WHERE pet_id=$1',[second])),125);
 const invite=async(pet,who,email)=>scalar('INSERT INTO co_carer_invites(pet_id,invited_by,invited_user_id,email) VALUES($1,$2,$3,$4) RETURNING id',[pet,owner,who,email]);
 assert.equal(await scalar('SELECT can_invite_co_carer($1)',[second]),true);
 const invitation=await invite(second,carer,'carer@example.invalid');
 assert.equal(await scalar('SELECT can_invite_co_carer($1)',[second]),false);
 await assert.rejects(()=>invite(second,other,'other@example.invalid'),/Free includes 1 co-carer/);
 // The allowance is per pet, and revoking/declining releases a reservation.
 const thirdInvite=await invite(third,other,'other@example.invalid');
 await db.query('DELETE FROM co_carer_invites WHERE id=$1',[thirdInvite]);
 assert.equal(await scalar('SELECT can_invite_co_carer($1)',[third]),true);
 await as(carer);
 assert.equal(await scalar('SELECT accept_co_care_invite($1)',[invitation]),second);
 assert.equal(await scalar('SELECT accept_co_care_invite($1)',[invitation]),second);
 assert.equal(await scalar('SELECT can_access_pet($1)',[second]),true);
 assert.equal(await scalar('SELECT pet_is_writable($1)',[second]),true);
 assert.equal(await scalar('SELECT has_pet_permission($1,\'can_log_activities\')',[second]),true);
 assert.equal(await scalar('SELECT has_pet_permission($1,\'can_manage_medications\')',[second]),false);
 await db.query("INSERT INTO pet_activities(pet_id,logged_by,activity_type,label) VALUES($1,$2,'exercise','Shared walk')",[second,carer]);
 await assert.rejects(()=>db.query("INSERT INTO pet_medical_records(pet_id,title,created_by) VALUES($1,'Blocked',$2)",[second,carer]),/row-level security/);
 await as(other);
 assert.equal(await scalar('SELECT can_access_pet($1)',[second]),false);
 await pro(true);
 const fourth=await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Fourth') RETURNING id",[owner]);
 const secondInvite=await invite(second,other,'other@example.invalid');
 await as(other);
 assert.equal(await scalar('SELECT accept_co_care_invite($1)',[secondInvite]),second);
 assert.equal(await scalar('SELECT can_access_pet($1)',[second]),true,'Pro owner can invite Free carers');
 await pro(false);
 assert.equal(Number(await scalar('SELECT count(*) FROM pets')),4);
 assert.equal(await scalar('SELECT pet_is_writable($1)',[fourth]),false);
 assert.equal(Number(await scalar('SELECT count(*) FROM pet_co_carers WHERE pet_id=$1',[second])),2);
 // Oldest membership remains enabled on Free; the other is preserved for renewal.
 await as(owner,'service_role');
 await db.query("UPDATE pet_co_carers SET created_at=now()-interval '1 day' WHERE pet_id=$1 AND user_id=$2",[second,carer]);
 await as(carer);
 assert.equal(await scalar('SELECT can_access_pet($1)',[second]),true);
 await as(other);
 assert.equal(await scalar('SELECT can_access_pet($1)',[second]),false);
 await pro(true);
 assert.equal(await scalar('SELECT pet_is_writable($1)',[fourth]),true);
 await as(other);
 assert.equal(await scalar('SELECT can_access_pet($1)',[second]),true);
 await db.exec('RESET ROLE');
 await db.exec(fs.readFileSync(`supabase/migrations/${migration}`,'utf8'));
 assert.equal(Number(await scalar('SELECT count(*) FROM pets')),4,'migration can be reapplied without data loss');
});

test('client pet gate uses a fresh owned count, fails closed on errors, and gates the fourth pet', async()=>{
 for(const count of [0,1,2,3,8,null]) {
  let allowed=0,denied=0,verified=0,alerts=0;
  const {useTierLimitGate: createGate}=loadTS('hooks/useTierLimitGate.ts',{
   react:{useCallback:(f)=>f},'react-native':{Alert:{alert:()=>alerts++}},
   '@/constants/tierLimits':{FREE_PET_LIMIT:3},
   '@/stores/authStore':{useAuthStore:{getState:()=>({session:{user:{id:'owner'}}})}},
   '@/hooks/useProGateNavigation':{useProGateNavigation:()=>({runWithProOrUpgrade:async(_allow,deny)=>{verified++;deny();return false;}})},
   '@/lib/supabase':{supabase:{from:(table)=>({select:(_fields,opts)=>({eq:async(field,id)=>{assert.equal(table,'pets');assert.equal(field,'owner_id');assert.equal(id,'owner');assert.equal(opts.head,true);return {count,error:count==null?Error('Offline'):null};}})})}},
  });
  await createGate().canAddPetOrUpgrade(()=>allowed++,()=>denied++);
  assert.equal(allowed,count!=null&&count<3?1:0);
  assert.equal(denied,count!=null&&count>=3?1:0);
  assert.equal(verified,denied);
  assert.equal(alerts,count==null?1:0);
 }
});

test('client co-care gate rechecks per-pet capacity and verifies Pro before the upgrade action', async()=>{
 for(const result of [{data:true,error:null},{data:false,error:null},{data:null,error:Error('Offline')}]) {
  let allowed=0,denied=0,verified=0,alerts=0;
  const {useTierLimitGate:createGate}=loadTS('hooks/useTierLimitGate.ts',{
   react:{useCallback:(f)=>f},'react-native':{Alert:{alert:()=>alerts++}},
   '@/constants/tierLimits':{FREE_PET_LIMIT:3},
   '@/stores/authStore':{useAuthStore:{getState:()=>({session:{user:{id:'owner'}}})}},
   '@/hooks/useProGateNavigation':{useProGateNavigation:()=>({runWithProOrUpgrade:async(_allow,deny)=>{verified++;deny();return false;}})},
   '@/lib/supabase':{supabase:{rpc:async(name,args)=>{assert.equal(name,'can_invite_co_carer');assert.equal(args.p_pet_id,'pet');return result;}}},
  });
  await createGate().canInviteCoCarerOrUpgrade('pet',()=>allowed++,()=>denied++);
  assert.equal(allowed,result.data===true?1:0);
  assert.equal(denied,result.data===false?1:0);
  assert.equal(verified,denied);
  assert.equal(alerts,result.error?1:0);
 }
});

test('pending email invites link into actionable Free notifications and decline frees the slot',async(t)=>{
 const db=await load(); t.after(()=>db.close());
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 await db.query("INSERT INTO auth.users(id,email) VALUES($1,'link-owner@example.invalid')",[owner]);
 await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false); SELECT set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;`);
 const pet=await scalar("INSERT INTO pets(owner_id,name) VALUES($1,'Link pet') RETURNING id",[owner]);
 const invite=await scalar("INSERT INTO co_carer_invites(pet_id,invited_by,email) VALUES($1,$2,'new-carer@example.invalid') RETURNING id",[pet,owner]);
 await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.role','',false)");
 await db.query("INSERT INTO auth.users(id,email) VALUES($1,'new-carer@example.invalid')",[carer]);
 assert.equal(await scalar('SELECT invited_user_id FROM co_carer_invites WHERE id=$1',[invite]),carer);
 assert.equal(await scalar("SELECT type FROM notifications WHERE data->>'invite_id'=$1",[invite]),'co_care_invite');
 await db.exec(`SELECT set_config('request.jwt.claim.sub','${carer}',false); SELECT set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;`);
 await db.query("UPDATE co_carer_invites SET status='declined' WHERE id=$1",[invite]);
 await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${owner}',false); SET ROLE authenticated;`);
 assert.equal(await scalar('SELECT can_invite_co_carer($1)',[pet]),true);
});
