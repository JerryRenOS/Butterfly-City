import { useEffect, useState, type CSSProperties } from 'react';
import { CharacterPortrait } from './PaintedCharacter';
import { Butterfly } from './Butterfly';
import { characters, formatNumber, type World, type Id, type Action } from './engine';
export {CharacterPortrait} from './PaintedCharacter';
const dialogue:Record<Id,Record<Action,string>>={
 bob:{share:'All right. A slice for everyone.',hoard:'I found it, didn’t I?',trade:'A fair price, my friend.',influence:'Remember who helped you.',cooperate:'Let’s build something together.',support:'Here. You need this more.',ask:'Perhaps I could use a hand.',suspicion:'Something isn’t quite right.'},
 alice:{share:'There is enough if we share.',hoard:'I have to save a little, too.',trade:'Something fair for both of us.',influence:'I hope you’ll remember this.',cooperate:'For everyone’s tomorrow.',support:'No one should go hungry.',ask:'Would you help me today?',suspicion:'I wish I knew who to trust.'},
 kevin:{share:'Trust is worth a little risk.',hoard:'Best to be prepared.',trade:'Let me check the numbers.',influence:'We should look out for each other.',cooperate:'Perhaps this could work.',support:'Here. Just in case.',ask:'I could use a little help.',suspicion:'I have a worrying theory…'},
 mia:{share:'An investment in our neighbors.',hoard:'Saving something for tomorrow.',trade:'A good day for a fair trade.',influence:'Let’s make an alliance.',cooperate:'A town is built together.',support:'We all need a hand sometimes.',ask:'A little help to get started.',suspicion:'These accounts don’t add up.'}
};
type Position={id:string;x:number;y:number};
type Transfer={from:Position;to:Position;kind:'food'|'coin'};
export function TownScene({world,onCharacter,compact=false}:{world:World;onCharacter?:(id:Id)=>void;compact?:boolean;accent?:string}){
 const [note,setNote]=useState<string|null>(null),[reacting,setReacting]=useState(false);
 useEffect(()=>{if(!world.day)return;setReacting(true);const timer=setTimeout(()=>setReacting(false),4200);return()=>clearTimeout(timer)},[world.day]);
 const t=world.town;
 const atmosphere=t.trust<40||t.mood<40||t.stability<35?'tense':t.trust>=55&&t.mood>=55&&t.stability>=50?'warm':'calm';
 const base:{id:Id;x:number;y:number}[]=[{id:'bob',x:42,y:81},{id:'alice',x:25,y:87},{id:'kevin',x:76,y:83},{id:'mia',x:60,y:91}];
 const positions=base.map(p=>({...p,x:p.x+(atmosphere==='tense'?(p.x<50?-3:3):atmosphere==='warm'?(p.x<50?2:-2):0)}));
 const effects=world.history.at(-1)?.effects||[];
 const transfers=effects.flatMap<Transfer>(e=>{
  const actor=positions.find(p=>p.id===e.actor),target=positions.find(p=>p.id===e.target);
  if(e.kind==='food-transfer'&&actor&&target)return [{from:actor,to:target,kind:'food'}];
  if(e.kind==='trade'&&actor&&target)return [{from:target,to:actor,kind:'coin'}];
  if((e.kind==='ask'||e.kind==='treasury-aid')&&actor)return [{from:{id:'town',x:e.kind==='ask'?15:85,y:70},to:actor,kind:e.kind==='ask'?'food':'coin'}];
  return [];
 });
 return <div className={`painted-town atmosphere-${atmosphere} ${compact?'compact':''} ${reacting?'round-reaction':''}`}>
  <img className="painted-landscape" src={t.food<1?"/art/village-empty.png":"/art/village-painted.png"} alt="A hand-painted hillside village with warm tiled roofs, a stone bakery, gardens and a sunlit square" draggable="false"/>
  <div className="landscape-light"/><div className="landscape-vignette"/>
  <div className="wind-motes" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{'--mote':i} as CSSProperties}/>)}</div>
  <div className="scene-butterfly butterfly-one" aria-hidden="true"><Butterfly/></div><div className="scene-butterfly butterfly-two" aria-hidden="true"><Butterfly/></div>
  <div className="village-caption"><span>THE VILLAGE OF SMALL POSSIBILITIES</span><b>{t.outcome}</b></div>
  <button className="landmark pantry-landmark" aria-label="Inspect the public pantry" onClick={()=>setNote(`The shared pantry holds ${formatNumber(t.food)} food. Citizens can contribute supplies or ask for aid.`)}><span>◒</span><small>{formatNumber(t.food)}<span> pantry</span></small></button>
  <button className="landmark treasury-landmark" aria-label="Inspect the public treasury" onClick={()=>setNote(`The treasury holds ${formatNumber(t.wealth)} public coins. Its safety net helps hungry neighbors with little money.`)}><span>◇</span><small>{formatNumber(t.wealth)}<span> coins</span></small></button>
  <button className="landmark bakery-landmark" aria-label="Read the bakery notice" onClick={()=>setNote(world.day?t.summary:'The ovens have gone quiet. Bob has found the last pizza. Four neighbors, eight slices, and a future waiting to unfold.')}><span>⌂</span><small>The bakery</small></button>
  {note&&<div className="landmark-note" role="status"><p>{note}</p><button aria-label="Close village note" onClick={()=>setNote(null)}>×</button></div>}
  {positions.map(({id,x,y},i)=>{const p=world.people[id],action=world.lastDecisions?.[id];const failed=effects.some(e=>e.actor===id&&e.kind==='unfulfilled');const receiving=effects.some(e=>e.kind==='food-transfer'&&e.target===id);const expression=reacting?(failed?'thinking':receiving?'happy':action==='suspicion'?'angry':action==='hoard'?'thinking':action==='share'||action==='cooperate'||action==='support'?'happy':'idle'):p.mood<35?'thinking':'idle';return <button key={`${id}-${world.day}`} className={`painted-resident resident-${id} ${reacting&&action?`action-${action}`:''}`} style={{left:`${x}%`,top:`${y}%`,'--resident-delay':`${i*-.8}s`} as CSSProperties} onClick={()=>onCharacter?.(id)} aria-label={`Meet ${characters[id].name}`}>
   {action&&<span className="painted-speech">{failed?'Perhaps another way…':dialogue[id][action]}</span>}
   <CharacterPortrait id={id} size={92} mood={p.mood} expression={expression}/>
   <span className="painted-name">{characters[id].name}<small>{p.food<1&&world.day>0?'Needs food':receiving&&reacting?'Received help':'↗'}</small></span>
  </button>})}
  {reacting&&<svg key={world.day} className="painted-transfers" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">{transfers.map((tr,i)=>{const sx=tr.from.x*10,sy=tr.from.y*6-35,ex=tr.to.x*10,ey=tr.to.y*6-35;return <g key={i}>{tr.kind==='coin'?<circle r="6" fill="#e4c77e" stroke="#796039" strokeWidth="1.5"/>:<g><path d="M-8-5 8-5 0 10Z" fill="#e3bf76" stroke="#806347" strokeWidth="1.3"/><path d="M-8-5h16" stroke="#b87f4a" strokeWidth="3"/></g>}<animateMotion dur="2.1s" path={`M${sx},${sy} Q${(sx+ex)/2},${Math.min(sy,ey)-95} ${ex},${ey}`} fill="freeze"/><set attributeName="opacity" to="0" begin="2.1s"/></g>})}</svg>}
 </div>
}
export default TownScene;
