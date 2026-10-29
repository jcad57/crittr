const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTS } = require('./load-typescript.cjs');
const { createProPurchaseFlow, PURCHASE_CALLBACK_TIMEOUT_MS } = loadTS('lib/iap/proPurchaseFlow.ts');
const plan={billing:'annual',productId:'annual',amount:3999,currency:'usd'};
const pkg={product:{identifier:'annual',price:39.99,currencyCode:'USD'}};
const paid={customerInfo:{},hasCrittrPro:true,productIdentifier:'annual'};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
function harness(overrides={}) {
 const calls={purchase:0,restore:0,verify:0,prices:0};
 let session='account:1';
 const deps={
  sessionKey:()=>session,detect:async()=>({hasCrittrPro:false,customerInfo:null}),
  offering:async()=>({ok:true,package:pkg}),purchase:async()=>{calls.purchase++;return paid;},
  restore:async()=>{calls.restore++;return paid;},verify:async()=>{calls.verify++;},hasVerifiedAccess:()=>false,
  pricesChanged:()=>calls.prices++,pause:async()=>{},storeName:'App Store',...overrides,
 };
 const flow=createProPurchaseFlow(deps);
 return {flow,calls,deps,switchAccount:()=>{session='account:2';}};
}
test('purchase transitions only unlock after verification, with animated completion stages',async()=>{
 const verification=deferred();
 const h=harness({verify:()=>verification.promise});const seen=[];
 h.flow.subscribe(()=>seen.push({...h.flow.getSnapshot()}));
 const task=h.flow.purchase(plan);
 await new Promise(setImmediate);
 assert.equal(h.calls.purchase,1);assert.equal(h.flow.getSnapshot().phase,'activating');assert.equal(h.flow.getSnapshot().activationStage,1);
 assert.equal(seen.some(s=>s.phase==='complete'),false);
 verification.resolve();await task;
 assert.deepEqual([...new Set(seen.filter(s=>s.phase==='activating').map(s=>s.activationStage))],[1,2,3]);
 assert.equal(h.flow.getSnapshot().phase,'complete');assert.equal(h.flow.getSnapshot().source,'purchase');
});
test('double tap creates one store purchase and cancellation returns to review',async()=>{
 const store=deferred();let purchases=0;
 const h=harness({purchase:()=>{purchases++;return store.promise;}});
 const first=h.flow.purchase(plan);await new Promise(setImmediate);
 await h.flow.purchase(plan);assert.equal(purchases,1);
 store.reject({kind:'cancelled'});await first;
 assert.equal(h.flow.getSnapshot().phase,'review');assert.equal(h.flow.getSnapshot().message,null);
});
test('confirmed purchase recovery retries verification without charging again',async()=>{
 let verified=false;const h=harness({verify:async()=>{if(!verified)throw Error('Offline');}});
 await h.flow.purchase(plan);assert.equal(h.flow.getSnapshot().phase,'recovery');assert.equal(h.flow.getSnapshot().storeConfirmed,true);
 assert.match(h.flow.getSnapshot().message,/won’t charge you again/);
 verified=true;await h.flow.retry();assert.equal(h.calls.purchase,1);assert.equal(h.flow.getSnapshot().phase,'complete');
});
test('pending payments are status checks, including after a network failure',async()=>{
 let bought=0,online=true,active=false;
 const h=harness({purchase:async()=>{bought++;throw {kind:'pending'};},detect:async()=>{if(!online)throw Error('Offline');return {hasCrittrPro:active,customerInfo:active?{}:null};}});
 await h.flow.purchase(plan);assert.equal(h.flow.getSnapshot().phase,'pending');
 online=false;await h.flow.check();assert.equal(h.flow.getSnapshot().phase,'pending');
 online=true;await h.flow.purchase(plan);assert.equal(bought,1);assert.equal(h.flow.getSnapshot().phase,'pending');
 active=true;await h.flow.retry();assert.equal(h.flow.getSnapshot().phase,'complete');assert.equal(bought,1);
});
test('existing entitlements activate instead of buying another subscription',async()=>{
 const h=harness({detect:async()=>({hasCrittrPro:true,customerInfo:{}})});
 await h.flow.purchase(plan);assert.equal(h.calls.purchase,0);assert.equal(h.calls.verify,1);assert.equal(h.flow.getSnapshot().source,'paywall');
});
test('already-owned errors recover through access checks without a second purchase',async()=>{
 let purchases=0,active=false;
 const h=harness({purchase:async()=>{purchases++;throw {kind:'already_owned'};},detect:async()=>({hasCrittrPro:active,customerInfo:active?{}:null})});
 await h.flow.purchase(plan);assert.equal(h.flow.getSnapshot().storeConfirmed,true);
 active=true;await h.flow.retry();assert.equal(purchases,1);assert.equal(h.flow.getSnapshot().phase,'complete');
});
test('a changed price is shown for review before any store purchase',async()=>{
 const h=harness({offering:async()=>({ok:true,package:{product:{...pkg.product,price:49.99}}})});
 await h.flow.purchase(plan);assert.equal(h.calls.purchase,0);assert.equal(h.calls.prices,1);assert.match(h.flow.getSnapshot().message,/updated this plan’s price/);
});
test('offering failures remain recoverable without debug or secret configuration details',async()=>{
 const h=harness({offering:async()=>({ok:false,reason:'rc_not_configured'})});
 await h.flow.purchase(plan);assert.equal(h.calls.purchase,0);assert.match(h.flow.getSnapshot().message,/Update Crittr or contact support/);assert.doesNotMatch(h.flow.getSnapshot().message,/API key|\[debug\]/);
});
test('restore failures retry restore, never purchase; no-entitlement restore is explained',async()=>{
 let active=false,restores=0;
 const h=harness({restore:async()=>{restores++;return {...paid,hasCrittrPro:active};}});
 await h.flow.restore();assert.equal(h.flow.getSnapshot().phase,'recovery');assert.match(h.flow.getSnapshot().message,/account that made the purchase/);
 active=true;await h.flow.retry();assert.equal(restores,2);assert.equal(h.calls.purchase,0);assert.equal(h.flow.getSnapshot().source,'restore');
});
test('account changes and leaving the screen fence in-flight activation',async()=>{
 for(const mode of ['account','unmount']) {
  const verification=deferred();const h=harness({verify:()=>verification.promise});
  const task=h.flow.purchase(plan);await new Promise(setImmediate);
  if(mode==='account')h.switchAccount();else h.flow.dispose();
  verification.resolve();await task;
  assert.notEqual(h.flow.getSnapshot().phase,'complete',mode);
 }
});
test('an aborted attempt cannot finish after a new attempt has started',async()=>{
 const first=deferred();let verifies=0;
 const h=harness({verify:()=>++verifies===1?first.promise:Promise.resolve()});
 const old=h.flow.purchase(plan);await new Promise(setImmediate);h.flow.cancel();
 await h.flow.retry();first.resolve();await old;
 assert.equal(h.calls.purchase,1);assert.equal(h.flow.getSnapshot().phase,'complete');
});

test('verified server grants skip store purchase even without an SDK entitlement',async()=>{
 const h=harness({hasVerifiedAccess:()=>true,detect:async()=>{throw Error('SDK unavailable');}});
 await h.flow.purchase(plan);
 assert.equal(h.calls.purchase,0);assert.equal(h.calls.verify,1);assert.equal(h.flow.getSnapshot().phase,'complete');
});
test('pending orders can finish from a verified server projection while the SDK cache catches up',async()=>{
 let verified=false;
 const h=harness({purchase:async()=>{throw {kind:'pending'};},hasVerifiedAccess:()=>verified});
 await h.flow.purchase(plan);verified=true;await h.flow.check();
 assert.equal(h.flow.getSnapshot().phase,'complete');
});

function manualTimers() {
 const tasks=[];
 return {
  schedule(callback,ms) { const task={callback,ms,cancelled:false};tasks.push(task);return()=>{task.cancelled=true;}; },
  fire(ms) { const task=tasks.find(t=>!t.cancelled&&t.ms===ms);assert.ok(task,`Missing ${ms}ms timer`);task.cancelled=true;task.callback(); },
 };
}
const flush=()=>new Promise(setImmediate);

test('a missing native callback clears loading, guards repeat purchases, and can later cancel cleanly',async()=>{
 const timers=manualTimers(),store=deferred();let purchases=0;
 const h=harness({schedule:timers.schedule,purchase:()=>{purchases++;return store.promise;},verify:async()=>{throw Error('Not verified');}});
 const task=h.flow.purchase(plan);await flush();timers.fire(PURCHASE_CALLBACK_TIMEOUT_MS);await task;
 assert.equal(h.flow.getSnapshot().working,false);
 assert.equal(h.flow.getSnapshot().phase,'recovery');assert.equal(h.flow.getSnapshot().purchaseUnresolved,true);
 assert.equal(h.flow.getSnapshot().storeConfirmed,false);
 await h.flow.purchase(plan);await h.flow.restore();
 assert.equal(purchases,1);assert.equal(h.calls.restore,0);assert.equal(h.flow.getSnapshot().purchaseUnresolved,true);
 assert.equal(h.flow.getSnapshot().storeConfirmed,false);assert.equal(h.flow.getSnapshot().working,false);
 store.reject({kind:'cancelled'});await flush();
 assert.equal(h.flow.getSnapshot().phase,'review');assert.equal(h.flow.getSnapshot().working,false);assert.equal(h.flow.getSnapshot().purchaseUnresolved,false);
});
test('returning from the native sheet gives its callback a grace period, then exposes recovery',async()=>{
 const timers=manualTimers(),store=deferred();
 const h=harness({schedule:timers.schedule,purchase:()=>store.promise});
 const task=h.flow.purchase(plan);await flush();h.flow.onAppActive();timers.fire(2_500);await task;
 assert.equal(h.flow.getSnapshot().working,false);assert.equal(h.flow.getSnapshot().purchaseUnresolved,true);
 store.resolve(paid);await flush();
 assert.equal(h.flow.getSnapshot().phase,'complete');
});
test('normal native cancellation during the return grace period does not leave an error or spinner',async()=>{
 const timers=manualTimers(),store=deferred();
 const h=harness({schedule:timers.schedule,purchase:()=>store.promise});
 const task=h.flow.purchase(plan);await flush();h.flow.onAppActive();store.reject({userCancelled:true});await task;
 assert.equal(h.flow.getSnapshot().phase,'review');assert.equal(h.flow.getSnapshot().working,false);assert.equal(h.flow.getSnapshot().message,null);
});
test('a late native error after timeout is consumed without another purchase',async()=>{
 const timers=manualTimers(),store=deferred();let purchases=0;
 const h=harness({schedule:timers.schedule,purchase:()=>++purchases===1?store.promise:Promise.resolve(paid)});
 const task=h.flow.purchase(plan);await flush();timers.fire(PURCHASE_CALLBACK_TIMEOUT_MS);await task;
 store.reject(Error('Store unavailable'));await flush();
 assert.equal(h.flow.getSnapshot().phase,'recovery');assert.equal(h.flow.getSnapshot().working,false);assert.equal(h.flow.getSnapshot().purchaseUnresolved,false);
 assert.match(h.flow.getSnapshot().message,/Store unavailable/);
 assert.equal(purchases,1);await h.flow.retry();assert.equal(purchases,2);assert.equal(h.flow.getSnapshot().phase,'complete');
});
test('an unresolved purchase checks server access directly even when the SDK queue is stalled',async()=>{
 const timers=manualTimers(),store=deferred();let detects=0,verified=false;
 const h=harness({schedule:timers.schedule,detect:async()=>{detects++;return {hasCrittrPro:false,customerInfo:null};},purchase:()=>store.promise,verify:async()=>{if(!verified)throw Error('Offline');}});
 const task=h.flow.purchase(plan);await flush();timers.fire(PURCHASE_CALLBACK_TIMEOUT_MS);await task;
 verified=true;await h.flow.check();
 assert.equal(detects,1);assert.equal(h.flow.getSnapshot().phase,'complete');
 store.resolve(paid);await flush();assert.equal(h.flow.getSnapshot().phase,'complete');
});
test('a remounted checkout attaches to an outstanding native transaction without starting a second',async()=>{
 const store=deferred(),timers=manualTimers();
 const h=harness({schedule:timers.schedule,outstandingPurchase:()=>store.promise});
 await h.flow.resumeOutstanding();
 assert.equal(h.flow.getSnapshot().purchaseUnresolved,true);assert.equal(h.calls.purchase,0);
 store.resolve(paid);await flush();assert.equal(h.flow.getSnapshot().phase,'complete');
});
test('preflight, offering, restore and verification stalls have bounded recovery',async()=>{
 for(const stage of ['detect','offering','restore','verify']) {
  const timers=manualTimers();
  const h=harness({schedule:timers.schedule,[stage]:()=>new Promise(()=>{})});
  const task=stage==='restore'?h.flow.restore():h.flow.purchase(plan);
  await flush();timers.fire(15_000);await task;
  assert.equal(h.flow.getSnapshot().phase,'recovery',stage);assert.equal(h.flow.getSnapshot().working,false,stage);
 }
});
test('late native results after leaving checkout cannot activate its abandoned screen',async()=>{
 const timers=manualTimers(),store=deferred();
 const h=harness({schedule:timers.schedule,purchase:()=>store.promise});
 const task=h.flow.purchase(plan);await flush();h.flow.cancel();await task;store.resolve(paid);await flush();
 assert.equal(h.calls.verify,0);assert.notEqual(h.flow.getSnapshot().phase,'complete');
});

test('a late cancellation is consumed after a concurrent status check fails',async()=>{
 const timers=manualTimers(),store=deferred(),verification=deferred();
 const h=harness({schedule:timers.schedule,purchase:()=>store.promise,verify:()=>verification.promise});
 const purchase=h.flow.purchase(plan);await flush();timers.fire(PURCHASE_CALLBACK_TIMEOUT_MS);await purchase;
 const check=h.flow.check();await flush();store.reject({kind:'cancelled'});await flush();
 verification.reject(Error('Offline'));await check;await flush();
 assert.equal(h.flow.getSnapshot().phase,'review');assert.equal(h.flow.getSnapshot().working,false);
 assert.equal(h.flow.getSnapshot().purchaseUnresolved,false);assert.equal(h.flow.getSnapshot().nativeRequestPending,false);
});

test('an ambiguous store rejection offers restore after its native request has settled',async()=>{
 const h=harness({purchase:async()=>{throw {kind:'result_unknown'};},verify:async()=>{}});
 await h.flow.purchase(plan);
 assert.equal(h.flow.getSnapshot().purchaseUnresolved,true);assert.equal(h.flow.getSnapshot().nativeRequestPending,false);
 await h.flow.restore();
 assert.equal(h.calls.restore,1);assert.equal(h.flow.getSnapshot().phase,'complete');assert.equal(h.flow.getSnapshot().source,'restore');
});

test('reattaching the same controller consumes a settled native result only once',async()=>{
 const store=deferred(),timers=manualTimers();let verifies=0;
 const h=harness({schedule:timers.schedule,purchase:()=>store.promise,verify:async()=>{verifies++;throw Error('Offline');}});
 const purchase=h.flow.purchase(plan);await flush();h.flow.cancel();await purchase;
 store.resolve(paid);await flush();
 await h.flow.resumeOutstanding();await flush();
 assert.equal(verifies,1);assert.equal(h.flow.getSnapshot().working,false);assert.equal(h.flow.getSnapshot().phase,'recovery');
});
