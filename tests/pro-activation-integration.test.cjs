const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('./load-typescript.cjs');
function fixture({sync,profile,profileDelay=false}) {
  let writes=0;
  const checkout=loadTS('lib/iap/checkout.ts',{
    '@/lib/iap/nativePurchaseGuard':{createNativePurchaseGuard:()=>({})},
    '@/lib/sessionGeneration':{sessionGeneration:()=>1},
    '@/lib/query/client':{queryClient:{setQueryData(){writes++;}}},
    '@/lib/query/keys':{profileQueryKey:()=>['profile']},
    '@/lib/crittrPro':{isCrittrProFromProfile:p=>p.verified===true},
    '@/lib/iap/crittrProClientState':{ingestProfileMirror(){}},
    '@/lib/iap/crittrProRevenueCat':{},'@/lib/iap/purchaseErrors':{},'@/lib/iap/revenueCat':{},
    '@/lib/iap/entitlementSync':{syncCrittrProAfterCheckout:sync},
    '@/lib/iap/withTimeout':{withTimeout:promise=>promise},'@/lib/analytics':{},
    '@/lib/supabase':{supabase:{auth:{getUser:async()=>({data:{user:{id:'account'}}})},from:()=>({select:()=>({eq:()=>({single:async()=>{if(profileDelay)await new Promise(setImmediate);return {data:profile};}})})})}},
    'react-native':{Platform:{OS:'ios'}},'react-native-purchases':{},
  });
  return {checkout,writes:()=>writes};
}
test('activation accepts verified webhook access while a RevenueCat sync remains pending',async()=>{
 const h=fixture({sync:()=>new Promise(()=>{}),profile:{verified:true}});
 await h.checkout.waitForProActivation({timeoutMs:100});assert.equal(h.writes(),1);
});
test('activation exposes sandbox enrollment failures immediately rather than spinning until timeout',async()=>{
 const h=fixture({sync:async()=> 'sandbox_restricted',profile:{verified:false},profileDelay:true});
 await assert.rejects(h.checkout.waitForProActivation({timeoutMs:1000}),error=>error.kind==='sandbox_restricted'&&/TestFlight purchases never charge/.test(error.message));
});
