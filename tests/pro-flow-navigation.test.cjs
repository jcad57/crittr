const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTS}=require('./load-typescript.cjs');
const runtime=require('react/jsx-runtime');
function flatten(node){if(node==null||typeof node==='boolean')return[];if(Array.isArray(node))return node.flatMap(flatten);if(typeof node!=='object')return[node];return[node,...flatten(node.props?.children)];}
function textOf(node){return flatten(node).filter(n=>typeof n==='string').join(' ');}
function renderMake({pets,loading=false,error=false}={}) {
 const destinations=[];
 const module=loadTS('app/(logged-in)/make-pro-yours.tsx',{
  'react/jsx-runtime':runtime,react:{useCallback:f=>f,useEffect(){},useState:x=>[x,()=>{}]},
  '@expo/vector-icons':{MaterialCommunityIcons:'icon'},'expo-image':{Image:'image'},
  'expo-router':{useLocalSearchParams:()=>({}),useRouter:()=>({replace:href=>destinations.push(href)})},
  'react-native':{StyleSheet:{create:x=>x},Pressable:'pressable',Text:'text',View:'view'},
  '@/components/ui/buttons/OrangeButton':{default:'button'},
  '@/components/profile/profileHelpers':{displayNameFromProfile:()=> 'Person Name',initialsFromProfile:()=> 'PN'},
  '@/components/pro/flow/ProFlowUi':{OrganicSurface:'surface',ProFlowPage:'page',ProLink:'link',flowStyles:{}},
  '@/hooks/queries':{useProfileQuery:()=>({data:{avatar_url:'user-avatar'}}),usePetsQuery:()=>({data:pets,isLoading:loading,isError:error,refetch(){}})},
  '@/hooks/useProGateNavigation':{useProGateNavigation:()=>({runWithProOrUpgrade:allow=>allow()})},
  '@/lib/proEvents':{trackProEvent(){}},'@/lib/proEngagementPersistence':{markProOnboardingCompleted:async()=>{}},
  '@/stores/authStore':{useAuthStore:Object.assign(selector=>selector({session:{user:{email:'person@example.invalid'}}}),{getState:()=>({session:{user:{id:'person'}}})})},
  '@/theme/colors':{Colors:{}},'@/theme/typography':{Font:{}},'@/utils/petParticipation':{isPetActiveForDashboard:p=>!p.is_archived&&!p.is_memorialized},
 });
 return {tree:module.default(),destinations};
}
test('Make Pro Yours uses the person avatar and routes every card to the right feature',()=>{
 const {tree,destinations}=renderMake({pets:[{id:'shared',role:'co_carer',avatar_url:'shared-avatar',name:'Shared'}, {id:'owned',role:'owner',is_active:true,avatar_url:'pet-avatar',name:'Charlie'}]});
 const nodes=flatten(tree);
 const avatars=nodes.filter(n=>n?.type==='image');
 assert.equal(avatars.length,1);assert.equal(avatars[0].props.source.uri,'user-avatar');
 const cards=nodes.filter(n=>n?.type==='pressable');assert.equal(cards.length,3);
 for(const card of cards)card.props.onPress();
 assert.deepEqual(destinations,['/(logged-in)/add-pet','/(logged-in)/pet/owned/medical-records','/(logged-in)/crittr-ai']);
});
test('record setup waits for pets and explains the empty-pet destination',()=>{
 const waiting=renderMake({loading:true});
 const record=flatten(waiting.tree).find(n=>n?.type==='pressable'&&textOf(n).includes('Upload a medical record'));
 assert.equal(record.props.disabled,true);
 const empty=renderMake({pets:[]});
 const emptyRecord=flatten(empty.tree).find(n=>n?.type==='pressable'&&textOf(n).includes('Upload a medical record'));
 assert.match(textOf(emptyRecord),/Add a pet/);emptyRecord.props.onPress();
 assert.equal(empty.destinations[0],'/(logged-in)/add-pet');
});
test('the welcome CTA opens Make Pro Yours and preserves the final subscription destination',()=>{
 const routes=[];
 const module=loadTS('app/(logged-in)/welcome-to-pro.tsx',{
  'react/jsx-runtime':runtime,react:{useEffect(){},useCallback:f=>f},
  'expo-router':{useLocalSearchParams:()=>({returnTo:'subscriptions'}),useRouter:()=>({replace:r=>routes.push(r)})},
  '@/components/pro/ProOnboardingView':{ProOnboardingView:'welcome'},'@/components/pro/flow/ProFlowUi':{ProFlowPage:'page'},
  '@/hooks/useProGateNavigation':{useProGateNavigation:()=>({runWithProOrUpgrade:f=>f()})},
  '@/lib/proEvents':{trackProEvent(){}},'@/lib/proEngagementPersistence':{markProOnboardingCompleted:async()=>{}},
  '@/stores/authStore':{useAuthStore:{getState:()=>({session:{user:{id:'person'}}})}},
 });
 const welcome=flatten(module.default()).find(n=>n?.type==='welcome');welcome.props.onContinue();
 assert.equal(routes[0].pathname,'/(logged-in)/make-pro-yours');assert.equal(routes[0].params.returnTo,'subscriptions');
});
test('management copy distinguishes renewal, cancellation, family access and grants',()=>{
 const {subscriptionRenewalCopy}=loadTS('components/screens/subscriptions/SubscriptionDetailsView.tsx',{
  'react/jsx-runtime':runtime,'@expo/vector-icons':{MaterialCommunityIcons:'icon'},'expo-image':{Image:'image'},
  'react-native':{StyleSheet:{create:x=>x},Text:'text',View:'view'},'@/components/pro/flow/ProFlowUi':{OrganicSurface:'surface'},
  '@/theme/colors':{Colors:{}},'@/theme/typography':{Font:{}},'@/utils/subscriptionDisplay':{formatSubscriptionDate:x=>x,formatStatus:x=>x},
 });
 const sub={status:'active',currentPeriodEnd:'2027-10-28',cancelAtPeriodEnd:false,isLifetime:false,isPromotional:false,isFamilyShared:false};
 assert.match(subscriptionRenewalCopy(sub),/Next renewal/);
 assert.match(subscriptionRenewalCopy({...sub,cancelAtPeriodEnd:true}),/Access ends/);
 assert.match(subscriptionRenewalCopy({...sub,isLifetime:true}),/No recurring charges/);
 assert.match(subscriptionRenewalCopy({...sub,isPromotional:true}),/Complimentary/);
 assert.match(subscriptionRenewalCopy({...sub,isFamilyShared:true}),/family organizer/);
 assert.match(subscriptionRenewalCopy({...sub,status:'billing_issue'}),/Update your payment method/);
});

test('recovery primary actions distinguish status checks, activation, purchase retry and restore',()=>{
 const {ProRecoveryView}=loadTS('components/pro/flow/ProRecoveryView.tsx',{
  'react/jsx-runtime':runtime,'react-native':{Text:'text',View:'view'},
  '@/components/ui/buttons/OrangeButton':{__esModule:true,default:'primary'},'@/theme/colors':{Colors:{}},
  './ProFlowUi':{ProIllustration:'art',ProLink:'link',ProNotice:'notice',ProOutlineButton:'outline',flowStyles:{}},
 });
 for(const [variant,expected] of [[{uncertain:true,nativeRequestPending:true},'retry'],[{uncertain:true},'retry'],[{pending:true},'retry'],[{confirmed:true},'retry'],[{purchaseFailed:true},'retry'],[{},'restore']]) {
  const calls=[];
  const tree=ProRecoveryView({...variant,message:'Connection unavailable',onRetry:()=>calls.push('retry'),onRestore:()=>calls.push('restore'),onExit(){}});
  flatten(tree).find(n=>n?.type==='primary').props.onPress();
  assert.deepEqual(calls,[expected]);
  if(variant.uncertain) {
   assert.match(textOf(tree),/Check purchase status/);
   assert.equal(flatten(tree).some(n=>n?.type==='outline'),!variant.nativeRequestPending);
  }
 }
});
