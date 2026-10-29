const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTS}=require('./load-typescript.cjs');
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const week={durationLabel:'7-day',iso8601:'P1W'};
const monthly={identifier:'monthly',product:{identifier:'monthly',price:4.99,priceString:'$4.99',currencyCode:'USD',trial:week}};
const annual={identifier:'annual',product:{identifier:'annual',price:39.99,priceString:'$39.99',currencyCode:'USD',trial:week}};
function fixture(overrides={}) {
 let generation=1,logins=0,catalogs=0;
 const service=loadTS('services/proPricing.ts',{
  '@/lib/iap/checkout':{fetchCurrentProPackages:()=>{catalogs++;return overrides.catalog?.()??Promise.resolve({monthly,annual});}},
  '@/lib/iap/revenueCat':{loginRevenueCatUser:async()=>{logins++;return null;}},
  '@/lib/supabase':{supabase:{auth:{getUser:()=>overrides.auth?.()??Promise.resolve({data:{user:{id:'account'}}})}}},
  '@/lib/iap/withTimeout':{withTimeout:overrides.withTimeout??(promise=>promise)},
  '@/lib/sessionGeneration':{sessionGeneration:()=>generation},
  '@/lib/iap/trialEligibility':loadTS('lib/iap/trialEligibility.ts'),
  '@/lib/iap/storeTerms':{trialOfferFromProduct:p=>p.trial??null},
  'react-native':{Platform:{OS:'ios'}},
  'react-native-purchases':{__esModule:true,default:{checkTrialOrIntroductoryPriceEligibility:overrides.eligibility??(async()=>({monthly:{status:2},annual:{status:2}}))},INTRO_ELIGIBILITY_STATUS:{INTRO_ELIGIBILITY_STATUS_ELIGIBLE:2,INTRO_ELIGIBILITY_STATUS_INELIGIBLE:1,INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS:3}},
 });
 return {service,switchAccount(){generation++;},calls:()=>({logins,catalogs})};
}
test('a pricing auth lookup from a previous account cannot identify or return prices for the next account',async()=>{
 const auth=deferred(),h=fixture({auth:()=>auth.promise});
 const request=h.service.fetchProPricing();h.switchAccount();auth.resolve({data:{user:{id:'old-account'}}});
 assert.equal(await request,null);assert.deepEqual(h.calls(),{logins:0,catalogs:0});
});
test('a stalled catalog returns unresolved pricing instead of an infinite price spinner',async()=>{
 const stalled=new Promise(()=>{});
 const h=fixture({catalog:()=>stalled,withTimeout:promise=>promise===stalled?Promise.resolve(undefined):promise});
 assert.equal(await h.service.fetchProPricing(),null);
});
test('trial eligibility is read again for the chosen package and unknown eligibility does not promise a trial',async()=>{
 let eligible=true,calls=0;
 const h=fixture({eligibility:async()=>{calls++;return {annual:{status:eligible?2:0},monthly:{status:2}};}});
 assert.equal((await h.service.fetchProPricing()).annual.trial.durationLabel,'7-day');
 eligible=false;assert.equal(await h.service.fetchProTrialForPackage(annual),null);assert.equal(calls,2);
});
test('an account change during eligibility lookup discards the old pricing result',async()=>{
 const eligibility=deferred(),h=fixture({eligibility:()=>eligibility.promise});
 const request=h.service.fetchProPricing();await new Promise(setImmediate);h.switchAccount();
 eligibility.resolve({monthly:{status:2},annual:{status:2}});assert.equal(await request,null);
});
