import { characters, ids, type Id, type World, type Effect } from './engine';
export type ScenePoint={x:number;y:number};
export const civicPlaces={pantry:{x:18,y:76},treasury:{x:84,y:74},square:{x:48,y:83},bakery:{x:49,y:66},repairs:{tornado:{x:65,y:73},tsunami:{x:50,y:81},snowstorm:{x:43,y:78}}};
const home:Record<Id,ScenePoint>={bob:{x:42,y:81},alice:{x:25,y:87},kevin:{x:76,y:83},mia:{x:60,y:91}};
export function contribution(effect:Effect,kind:'food'|'wealth'){
 if(effect.kind!=='cooperate')return 0;
 return Number(effect.description.match(kind==='food'?/contributed ([\d.]+) food/:/and ([\d.]+) wealth/)?.[1]||0);
}
export function scenePlan(world:World){
 const t=world.town;
 const tense=t.trust<40||t.mood<40||t.stability<35;
 const warm=t.trust>=55&&t.mood>=55&&t.stability>=50;
 const effects=world.history.at(-1)?.effects||[];
 return ids.map((id,index)=>{
  const action=world.lastDecisions?.[id];
  const origin={x:home[id].x+(tense?(home[id].x<50?-3:3):warm?(home[id].x<50?2:-2):0),y:home[id].y};
  const failed=effects.some(e=>e.actor===id&&e.kind==='unfulfilled');
  const own=effects.filter(e=>e.actor===id);
  const transfer=own.find(e=>e.kind==='food-transfer'&&e.target);
  let destination:ScenePoint={...origin};let activity='Watching the village';
  if(action==='cooperate'){const coinsOnly=own.some(e=>contribution(e,'wealth')>0)&&!own.some(e=>contribution(e,'food')>0);destination=coinsOnly?{x:78+index*3,y:78+index%2*5}:{x:civicPlaces.pantry.x+index*5,y:78+index%2*5};activity=failed?'Nothing to contribute':coinsOnly?'Contributing to the treasury':'Contributing to the pantry';}
  else if(action==='ask'){destination={x:civicPlaces.pantry.x+index*5,y:79+index%2*4};activity=failed?'Seeking help; no aid received':'Collecting public aid';}
  else if(action==='trade'){const other=ids[(index+1)%4];destination={x:(origin.x+home[other].x)/2+index*2,y:84+index%2*5};activity=failed?'Looking for a willing buyer':`Trading with ${characters[other].name}`;}
  else if(action==='support'||action==='influence'){if(transfer?.target){destination={x:(origin.x+home[transfer.target].x)/2,y:85+index%2*5};activity=`Bringing food to ${characters[transfer.target].name}`;}else activity='Unable to offer food';}
  else if(action==='share'){destination={x:37+index*8,y:81+index%2*7};activity=failed?'Nothing to share':'Sharing in the village square';}
  else if(action==='hoard'){destination={x:origin.x<50?origin.x-7:origin.x+7,y:origin.y-3};activity=world.people[id].food>0?'Taking supplies home':'Keeping to themselves';}
  else if(action==='suspicion'){destination={x:origin.x<50?33:69,y:80};activity='Spreading suspicion in the square';}
  const repairDestination=own.some(e=>e.kind==='repair')?{x:civicPlaces.repairs[world.disaster.type].x+(index-1.5)*8,y:civicPlaces.repairs[world.disaster.type].y+index%2*5}:undefined;
  return {id,origin,destination,repairDestination,activity,failed,action,receiving:effects.some(e=>e.kind==='food-transfer'&&e.target===id),effects:own};
 });
}
export function locationEffects(world:World){
 const effects=world.history.at(-1)?.effects||[];
 return {
  pantry:effects.filter(e=>contribution(e,'food')>0||e.kind==='ask'),
  treasury:effects.filter(e=>e.kind==='treasury-aid'||contribution(e,'wealth')>0),
  market:effects.filter(e=>e.kind==='trade'),
  tension:effects.filter(e=>e.kind==='hoard'||e.kind==='suspicion'),
  repairs:effects.filter(e=>e.kind==='repair'),
 };
}
