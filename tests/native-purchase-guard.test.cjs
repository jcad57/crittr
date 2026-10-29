const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTS}=require('./load-typescript.cjs');
const {createNativePurchaseGuard}=loadTS('lib/iap/nativePurchaseGuard.ts');

test('native purchases stay single-flight across screen instances until the SDK actually settles',async()=>{
 const guard=createNativePurchaseGuard();let resolve,calls=0;
 const sdk=new Promise(done=>{resolve=done;});
 const first=guard.run('session',()=>{calls++;return sdk;});
 assert.equal(guard.run('session',()=>{throw Error('Must not charge twice');}),first);
 assert.equal(guard.pending('session'),first);assert.equal(guard.pending('other'),null);
 await assert.rejects(guard.run('other',()=>{throw Error('Wrong account');}),error=>error.kind==='result_unknown');
 resolve('receipt');assert.equal(await first,'receipt');assert.equal(calls,1);assert.equal(guard.pending('session'),null);
 assert.equal(await guard.run('session',async()=> 'new receipt'),'new receipt');
});
test('a native cancellation clears the shared guard for a legitimate later attempt',async()=>{
 const guard=createNativePurchaseGuard();
 await assert.rejects(guard.run('session',async()=>{throw Error('Cancelled');}),/Cancelled/);
 assert.equal(guard.pending('session'),null);
 assert.equal(await guard.run('session',async()=> 'receipt'),'receipt');
});

test('numeric/native cancellation and ambiguous store errors map to safe recovery actions',()=>{
 const codes={PURCHASE_CANCELLED_ERROR:'1',STORE_PROBLEM_ERROR:'2',OPERATION_ALREADY_IN_PROGRESS_ERROR:'15',PURCHASE_NOT_ALLOWED_ERROR:'3',PAYMENT_PENDING_ERROR:'20',PRODUCT_ALREADY_PURCHASED_ERROR:'6',RECEIPT_ALREADY_IN_USE_ERROR:'7',RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:'13',NETWORK_ERROR:'10',OFFLINE_CONNECTION_ERROR:'35',CONFIGURATION_ERROR:'23',PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:'5',INELIGIBLE_ERROR:'18'};
 const {mapPurchasesError}=loadTS('lib/iap/purchaseErrors.ts',{
  '@/lib/iap/storeTerms':{storeAccountLabel:()=> 'Apple account',storePhrase:()=> 'the App Store'},
  'react-native-purchases':{PURCHASES_ERROR_CODE:codes},
 });
 assert.equal(mapPurchasesError({code:1},'Failed').kind,'cancelled');
 assert.equal(mapPurchasesError({userCancelled:true},'Failed').kind,'cancelled');
 assert.equal(mapPurchasesError({code:'2'},'Failed').kind,'result_unknown');
 assert.equal(mapPurchasesError({code:'15'},'Failed').kind,'result_unknown');
 assert.equal(mapPurchasesError({code:'20'},'Failed').kind,'pending');
 for(const code of ['7','13']) {
  const conflict=mapPurchasesError({code},'Failed');
  assert.equal(conflict.kind,'account_conflict');assert.match(conflict.message,/original purchase/);
 }
});

test('checkout fences account changes before native dispatch and during SDK setup',async()=>{
 for(const operation of ['purchase','restore'])for(const stage of ['queued','configuration']) {
  let generation=1,nativeCalls=0,finishSetup;
  const setup=new Promise(resolve=>{finishSetup=resolve;});
  const {purchaseProPackage,restoreProPurchases}=loadTS('lib/iap/checkout.ts',{
   '@/lib/iap/nativePurchaseGuard':{createNativePurchaseGuard},
   '@/lib/sessionGeneration':{sessionGeneration:()=>generation},
   '@/lib/query/client':{},'@/lib/query/keys':{},'@/lib/crittrPro':{},
   '@/lib/iap/crittrProClientState':{},'@/lib/iap/crittrProRevenueCat':{},
   '@/lib/iap/purchaseErrors':{},
   '@/lib/iap/revenueCat':{configureRevenueCat:()=>setup,isRevenueCatConfigured:()=>true,withRevenueCatUser:async(_id,action)=>action()},
   '@/lib/iap/entitlementSync':{},'@/lib/iap/withTimeout':{withTimeout:promise=>promise},
   '@/lib/analytics':{},
   '@/lib/supabase':{supabase:{auth:{getUser:async()=>({data:{user:{id:'account'}}})}}},
   'react-native':{Platform:{OS:'ios'}},
   'react-native-purchases':{__esModule:true,default:{purchasePackage:async()=>{nativeCalls++;}}},
  });
  const purchase=operation==='purchase'?purchaseProPackage({}):restoreProPurchases();
  if(stage==='configuration')await new Promise(setImmediate);
  generation++;finishSetup();
  await assert.rejects(purchase,/account changed|Sign in to restore/);assert.equal(nativeCalls,0,`${operation}:${stage}`);
 }
});

test('an unavailable entitlement lookup permits browsing but blocks purchase preflight',async()=>{
 const {detectExistingCrittrProEntitlement}=loadTS('lib/iap/checkout.ts',{
  '@/lib/iap/nativePurchaseGuard':{createNativePurchaseGuard},
  '@/lib/sessionGeneration':{sessionGeneration:()=>1},
  '@/lib/query/client':{},'@/lib/query/keys':{},'@/lib/crittrPro':{},
  '@/lib/iap/crittrProClientState':{},'@/lib/iap/crittrProRevenueCat':{},'@/lib/iap/purchaseErrors':{},
  '@/lib/iap/revenueCat':{getIdentifiedRevenueCatCustomerInfo:async()=>null},
  '@/lib/iap/entitlementSync':{},'@/lib/iap/withTimeout':{withTimeout:promise=>promise},
  '@/lib/analytics':{},'@/lib/supabase':{supabase:{auth:{getUser:async()=>({data:{user:{id:'account'}}})}}},
  'react-native':{Platform:{OS:'ios'}},'react-native-purchases':{},
 });
 assert.equal((await detectExistingCrittrProEntitlement()).hasCrittrPro,false);
 await assert.rejects(detectExistingCrittrProEntitlement({strict:true}),/before starting another purchase/);
});
