const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadTS}=require('./load-typescript.cjs');
const {dailyProgressLayout}=loadTS('utils/dailyProgressLayout.ts');
const palettes=loadTS('theme/seasonalThemes.ts');
const {buildDailyProgressRings}=loadTS('utils/dailyProgressRings.ts',{
 '@/theme/seasonalThemes':palettes,
 '@/utils/exercisePlans':{dailyProgressExerciseTarget:()=>0},
 '@/utils/medicationDosageProgress':{sumMedicationDoseProgress:()=>({fulfilled:0,expected:0})},
 '@/utils/petFood':{dailyProgressFoodTarget:()=>0,isTreatFood:food=>food.is_treat===true},
});
const {isDailyProgressComplete}=loadTS('utils/dailyProgressComplete.ts');
function progress(pottyTimes,activities=[],petType='dog'){
 return buildDailyProgressRings({details:{id:'pet',pet_type:petType,potty_times:pottyTimes,foods:[],medications:[]},activities,householdCatToday:[],householdMaintenanceWindow:[],activePetId:'pet'});
}

test('potty is a fifth progress category only while the active pet has scheduled potty times',()=>{
 const unscheduled=[{pet_id:'pet',activity_type:'potty'}];
 for(const type of ['dog','cat']){
  assert.equal(progress(undefined,unscheduled,type).length,4);
  assert.equal(progress([],unscheduled,type).length,4);
  const scheduled=progress(['07:30:00','20:00:00'],[],type);
  assert.equal(scheduled.length,5);assert.equal(scheduled.at(-1).id,'potty');assert.equal(scheduled.at(-1).total,2);
  assert.equal(scheduled[2].id,type==='cat'?'maintenance':'treats');
 }
});
test('one potty log counts once for the active pet, including pee and poo together; the new goal participates in completion',()=>{
 const activities=[{pet_id:'pet',activity_type:'potty',potty_pee:true,potty_poo:true},{pet_id:'other',activity_type:'potty'},{pet_id:'pet',activity_type:'training'}];
 const rings=progress(['07:30:00','20:00:00','07:30'],activities);
 assert.equal(rings.at(-1).total,2);assert.equal(rings.at(-1).current,1);assert.equal(isDailyProgressComplete(rings),false);
 assert.equal(isDailyProgressComplete(progress(['07:30:00','20:00:00'],[...activities,{pet_id:'pet',activity_type:'potty'}])),true);
 assert.equal(progress([],activities).some(ring=>ring.id==='potty'),false);
});
test('four and five columns fit measured phone, tablet and minimized-header widths without overflow',()=>{
 for(const compact of [false,true])for(const count of [4,5])for(const width of compact?[56,64,80,87,96,112,160,240]:[200,230,246,264,280,304,334,380,480,600]){
  const layout=dailyProgressLayout(width,count,compact);
  assert.ok(layout.ringSize*count+layout.gap*(count-1)<=width,`${count} items in ${width}px, compact=${compact}`);
  assert.ok(layout.ringSize<=layout.columnWidth);
  assert.ok(layout.strokeWidth>0&&layout.strokeWidth<layout.ringSize/2);
  assert.ok(layout.iconSize<layout.ringSize-layout.strokeWidth*2);
  assert.ok(Number.isFinite(layout.ringSize));
 }
 assert.equal(dailyProgressLayout(600,4).ringSize,68);
 assert.equal(dailyProgressLayout(600,5).ringSize,56);
 assert.equal(dailyProgressLayout(87,5,true).ringSize,15);
});

const runtime=require('react/jsx-runtime');
const flatten=node=>node==null||typeof node==='boolean'?[]:Array.isArray(node)?node.flatMap(flatten):typeof node!=='object'?[node]:[node,...flatten(node.props?.children)];
const style=value=>Object.assign({},...(Array.isArray(value)?value.flat(Infinity):[value]).filter(Boolean));
function renderProgress(width,compact,overrides={}){
 const theme=overrides.theme??require('./theme-mocks.cjs');
 const {default:Progress}=loadTS('components/ui/dashboard/DailyProgress.tsx',{
  'react/jsx-runtime':runtime,react:{useMemo:fn=>fn()},
  '@/theme/dashboardProgressColors':loadTS('theme/dashboardProgressColors.ts',{'./colors':theme}),
  '@/constants/activityTypeProgressIcons':{getDailyProgressRingIcons:()=>({potty:'dog-pee.png'})},
  '@/theme/colors':theme,'@/theme/typography':{Font:{}},
  '@/hooks/useDailyProgressLayout':{useDailyProgressLayout:(count,small)=>({layout:dailyProgressLayout(width,count,small),onLayout(){},measured:true})},
  'expo-image':{Image:'image'},'react-native':{StyleSheet:{create:x=>x},Text:'text',View:'view'},
  './ProgressRing':{__esModule:true,default:'ring'},
 });
 return flatten(Progress({categories:progress(['08:00','20:00']),compact,...overrides}));
}
test('expanded and minimized render all five indicators using the same measured geometry and full accessibility labels',()=>{
 for(const compact of [false,true]){
  const width=compact?87:246;
  const nodes=renderProgress(width,compact);
  const rings=nodes.filter(node=>node?.type==='ring');assert.equal(rings.length,5);
  assert.ok(rings.every(node=>node.props.size===dailyProgressLayout(width,5,compact).ringSize));
  assert.ok(nodes.some(node=>node?.props?.accessibilityLabel==='Potty, 0 of 2'));
  if(compact)assert.equal(nodes.filter(node=>node?.type==='text').length,0);
  else{
   assert.equal(nodes.find(node=>node?.type==='image').props.source,'dog-pee.png');
   assert.ok(nodes.filter(node=>node?.type==='text').every(node=>node.props.numberOfLines===1&&node.props.adjustsFontSizeToFit));
   assert.ok(nodes.filter(node=>node?.type==='view'&&node.props.accessible).every(node=>style(node.props.style).minWidth===0));
  }
 }
});
test('loading skeletons use five matching columns in expanded and minimized modes',()=>{
 for(const compact of [false,true]){
  const {default:Skeleton}=loadTS('components/ui/dashboard/DailyProgressSkeleton.tsx',{
   'react/jsx-runtime':runtime,'@/theme/colors':require('./theme-mocks.cjs'),
   '@/hooks/useSkeletonPulse':{useSkeletonPulse:()=>({})},
   '@/hooks/useDailyProgressLayout':{useDailyProgressLayout:(count,small)=>({layout:dailyProgressLayout(compact?87:246,count,small),onLayout(){},measured:true})},
   'react-native':{StyleSheet:{create:x=>x},View:'view'},
   'react-native-reanimated':{__esModule:true,default:{View:'placeholder'}},
  });
  const columns=flatten(Skeleton({compact,count:5})).filter(node=>typeof node?.type==='function');
  assert.equal(columns.length,5);
  assert.ok(columns.every(column=>column.props.layout.ringSize===dailyProgressLayout(compact?87:246,5,compact).ringSize));
 }
});

function themeFor(season){
 const theme=loadTS('theme/colors.ts',{react:{useSyncExternalStore:(_subscribe,getSnapshot)=>getSnapshot()},'./seasonalThemes':palettes});
 theme.updateTheme({preview:season});return theme;
}
test('each individual goal turns green independently in every theme and in expanded/minimized mode',()=>{
 for(const season of ['summer','spring','fall','winter'])for(const compact of [false,true])for(const id of ['exercise','meals','treats','meds','maintenance','potty']){
  const theme=themeFor(season),colors=theme.getThemeColors();
  const category={id,label:id,current:1,total:1,ringColor:'#123456',trackColor:'#EEEEEE'};
  const pendingId=id==='potty'?'exercise':'potty';
  const zeroId=id==='meds'?'meals':'meds';
  const categories=[category,{...category,id:pendingId,label:pendingId,current:0,total:2},{...category,id:zeroId,label:zeroId,current:5,total:0}];
  const rings=renderProgress(compact?100:304,compact,{theme,categories,allComplete:false}).filter(node=>node?.type==='ring');
  assert.equal(rings[0].props.color,colors.progressCompleteRing,`${season}:${id}:${compact}`);
  assert.equal(rings[0].props.trackColor,colors.progressCompleteTrack);
  assert.equal(rings[1].props.color,pendingId==='exercise'?colors.dashboardExercise:colors.progressTraining);
  assert.notEqual(rings[2].props.color,colors.progressCompleteRing,'untracked goals never claim completion');
  const undone=renderProgress(compact?100:304,compact,{theme,categories:[{...category,current:0}],allComplete:false}).find(node=>node?.type==='ring');
  assert.notEqual(undone.props.color,colors.progressCompleteRing,'undo restores the category color');
  const beyond=renderProgress(compact?100:304,compact,{theme,categories:[{...category,current:2}],allComplete:false}).find(node=>node?.type==='ring');
  assert.equal(beyond.props.color,colors.progressCompleteRing);
 }
});
test('the completed card background follows all daily goals and uses the same theme in both modes',()=>{
 for(const season of ['summer','spring','fall','winter'])for(const expanded of [false,true])for(const allComplete of [false,true]){
  const theme=themeFor(season),colors=theme.getThemeColors();
  const {default:Card}=loadTS('components/ui/dashboard/DailyProgressCard.tsx',{
   'react/jsx-runtime':runtime,react:{useState:()=>[expanded,()=>{}]},
   '@/components/ui/dashboard/DailyProgress':{default:'progress'},
   '@/components/ui/dashboard/DailyProgressSkeleton':{default:'skeleton'},
   '@/components/ui/dashboard/SectionLabel':{default:'label'},
   '@/theme/colors':theme,'@expo/vector-icons':{MaterialCommunityIcons:'icon'},
   'react-native':{LayoutAnimation:{},Pressable:'press',StyleSheet:{create:x=>x},View:'view'},
   'react-native-reanimated':{__esModule:true,default:{View:'animated'},useReducedMotion:()=>true,FadeIn:{duration:()=>({reduceMotion:()=>null})},ReduceMotion:{System:'system'}},
  });
  const tree=Card({categories:progress(['08:00','20:00']),allComplete,loading:false});
  assert.equal(style(tree.props.style).backgroundColor,allComplete?colors.progressCompleteBackground:colors.peach);
  if(allComplete)assert.equal(style(tree.props.style).borderColor,colors.progressCompleteBorder);
 }
});
