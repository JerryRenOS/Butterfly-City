import { useEffect, useState, type CSSProperties } from 'react';
import { CharacterPortrait } from './PaintedCharacter';
import { scenePlan, locationEffects, civicPlaces } from './sceneDynamics';
import { Butterfly } from './Butterfly';
import { DisasterScene, DisasterBadge } from './DisasterScene';
import { LivingLandscape } from './LivingLandscape';
import { disasters, disasterConditions } from './disasters';
import { characters, formatNumber, type World, type Id } from './engine';
import { dialogueFor, voiceProfiles } from './characterDialogue';
import type { SpokenLine } from './useCharacterSpeech';
export {CharacterPortrait} from './PaintedCharacter';
type Position={id:string;x:number;y:number};
type Transfer={from:Position;to:Position;kind:'food'|'coin'};
export function TownScene({world,onCharacter,compact=false,motionEnabled=true,motionPaused=false,voiceScope='Your town',spokenLine=null,onNarrate,onStopSpeech}:{world:World;onCharacter?:(id:Id)=>void;compact?:boolean;accent?:string;motionEnabled?:boolean;motionPaused?:boolean;voiceScope?:string;spokenLine?:SpokenLine|null;onNarrate?:()=>void;onStopSpeech?:()=>void}){
 const [note,setNote]=useState<string|null>(null);
 const [phase,setPhase]=useState<'idle'|'walking'|'working'|'repairing'|'returning'>('idle');
 const [replay,setReplay]=useState(0);
 const [sceneTown,setSceneTown]=useState(world.town);
 useEffect(()=>{
  setNote(null);
  if(!world.day){setSceneTown(world.town);setPhase('idle');return;}
  const reduced=!motionEnabled;
  if(reduced){setSceneTown(world.town);setPhase('idle');return;}
  setPhase('walking');
  const timers=[setTimeout(()=>{setPhase('working');setSceneTown(world.town)},1900),setTimeout(()=>setPhase('repairing'),4200),setTimeout(()=>setPhase('returning'),6800),setTimeout(()=>setPhase('idle'),8700)];
  return()=>timers.forEach(clearTimeout);
 },[world,replay,motionEnabled]);
 const reacting=phase==='working';
 const travelling=phase==='walking'||phase==='returning';
 const t=sceneTown;
 const atmosphere=t.trust<40||t.mood<40||t.stability<35?'tense':t.trust>=55&&t.mood>=55&&t.stability>=50?'warm':'calm';
 const plans=scenePlan(world),places=locationEffects(world);
 const positions=plans.map(plan=>({id:plan.id,...(phase==='repairing'?plan.repairDestination||plan.destination:phase==='walking'||phase==='working'?plan.destination:plan.origin)}));
 const effects=world.history.at(-1)?.effects||[];
 const transfers=effects.flatMap<Transfer>(e=>{
  const actor=positions.find(p=>p.id===e.actor),target=positions.find(p=>p.id===e.target);
  if(e.kind==='cooperate'&&actor){const foodMatch=e.description.match(/contributed ([\d.]+) food/);const coinsMatch=e.description.match(/and ([\d.]+) wealth/);return [...(foodMatch&&Number(foodMatch[1])>0?[{from:actor,to:{id:'pantry',...civicPlaces.pantry},kind:'food' as const}]:[]),...(coinsMatch&&Number(coinsMatch[1])>0?[{from:actor,to:{id:'treasury',...civicPlaces.treasury},kind:'coin' as const}]:[])];}
  if(e.kind==='food-transfer'&&actor&&target)return [{from:actor,to:target,kind:'food'}];
  if(e.kind==='trade'&&actor&&target)return [{from:target,to:actor,kind:'coin'}];
  if((e.kind==='ask'||e.kind==='treasury-aid')&&actor)return [{from:{id:'town',...(e.kind==='ask'?civicPlaces.pantry:civicPlaces.treasury)},to:actor,kind:e.kind==='ask'?'food':'coin'}];
  return [];
 });
 return <div className={`painted-town atmosphere-${atmosphere} disaster-${world.disaster.type} ${disasterConditions(world.disaster,world.day).intensity?'under-weather':''} ${compact?'compact':''} ${reacting?'round-reaction':''} phase-${phase}`}>
  <LivingLandscape paused={motionPaused||!motionEnabled} reducedMotion={!motionEnabled} disaster={world.disaster} day={world.day} src={t.food<1?"/art/village-empty.png":"/art/village-painted.png"} alt={`A hand-painted village recovering from a ${disasters[world.disaster.type].name.toLowerCase()}`}/>
  <DisasterScene disaster={world.disaster} day={world.day}/>
  <DisasterBadge disaster={world.disaster} day={world.day}/>
  {phase==='repairing'&&places.repairs.length>0&&<div className="repair-worksite" style={{left:`${civicPlaces.repairs[world.disaster.type].x}%`,top:`${civicPlaces.repairs[world.disaster.type].y}%`}}><span aria-hidden="true">⚒</span><b>Repair crews at work</b></div>}
  <div className="living-garden" aria-hidden="true">{Array.from({length:Math.min(12,Math.floor((t.trust+t.stability)/14))},(_,i)=><i key={i} style={{left:`${7+i*7.5}%`,'--plant':i} as CSSProperties}><span>✿</span></i>)}</div>
  <div className={`oven-glow ${places.market.length&&reacting?'market-active':''}`} aria-hidden="true"/>
  <div className="chimney-smoke" aria-hidden="true"><i/><i/><i/></div>
  <div className={`civic-site pantry-site ${reacting&&places.pantry.length?'site-active':''}`} aria-hidden="true"><span className="site-ripple"/>{reacting&&places.pantry.length>0&&<b>{places.pantry.some(e=>e.kind==='ask')?'Public aid collected':'New contributions'}</b>}<div className="pantry-stock">{Array.from({length:Math.min(6,Math.floor(t.food))},(_,i)=><i key={i}/>)}</div></div>
  <div className={`civic-site treasury-site ${reacting&&places.treasury.length?'site-active':''}`} aria-hidden="true"><span className="site-ripple"/>{reacting&&places.treasury.length>0&&<b>Treasury at work</b>}</div>
  <div className="landscape-light"/><div className="landscape-vignette"/>
  <div className="wind-motes" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{'--mote':i} as CSSProperties}/>)}</div>
  <div className="scene-butterfly butterfly-one" aria-hidden="true"><Butterfly/></div><div className="scene-butterfly butterfly-two" aria-hidden="true"><Butterfly/></div>
  <div className="village-caption"><span>THE VILLAGE OF SMALL POSSIBILITIES</span><b>{t.outcome}</b></div><div className={`scene-playback ${spokenLine?'has-dialogue':''}`}><span role={spokenLine?'status':undefined}>{spokenLine?`${spokenLine.status==='loading'?'Loading':characters[spokenLine.id].name} · ${voiceProfiles[spokenLine.id].accent} voice`:phase==='walking'?'Neighbors are on the move…':phase==='working'?'Emergency supplies are changing hands':phase==='repairing'?places.repairs.length?'Neighbors are restoring the village':'No funded repair work today':phase==='returning'?'Returning home…':!motionEnabled?'Scenery paused · use Play scenery above':'Living scenery · click a resident or place'}</span><div className="scene-audio-controls">{onNarrate&&<button onClick={spokenLine?onStopSpeech:onNarrate} aria-label={spokenLine?'Stop dialogue':`Hear all citizens in ${voiceScope}`}>{spokenLine?'■ Stop dialogue':'♫ Hear neighbors'}</button>}{world.day>0&&<button disabled={phase!=='idle'} onClick={()=>setReplay(n=>n+1)} aria-label="Replay today’s village interactions">↻ Replay day</button>}</div></div>
  <button className="landmark pantry-landmark" aria-label="Inspect the public pantry" onClick={()=>setNote(`The shared pantry holds ${formatNumber(t.food)} food. Citizens can contribute supplies or ask for aid.`)}><span>◒</span><small>{formatNumber(t.food)}<span> pantry</span></small></button>
  <button className="landmark treasury-landmark" aria-label="Inspect the public treasury" onClick={()=>setNote(`The treasury holds ${formatNumber(t.wealth)} public coins. Emergency grants come first; successful contributors then organize repairs, removing 8 damage per public coin spent.`)}><span>◇</span><small>{formatNumber(t.wealth)}<span> coins</span></small></button>
  <button className="landmark bakery-landmark" aria-label="Read the relief station notice" onClick={()=>setNote(`${disasters[world.disaster.type].description} Damage: ${formatNumber(world.disaster.damage)}/100. Choose Supply & rebuild to contribute resources and organize funded repairs.`)}><span>⌂</span><small>Relief station</small></button>
  {note&&<div className="landmark-note" role="status"><p>{note}</p><button aria-label="Close village note" onClick={()=>setNote(null)}>×</button></div>}
  {positions.map(({id,x,y},i)=>{const p=world.people[id],action=world.lastDecisions?.[id];const failed=effects.some(e=>e.actor===id&&e.kind==='unfulfilled');const receiving=effects.some(e=>e.kind==='food-transfer'&&e.target===id);const expression=reacting?(failed?'thinking':receiving?'happy':action==='suspicion'?'angry':action==='hoard'?'thinking':action==='share'||action==='cooperate'||action==='support'?'happy':'idle'):p.mood<35?'thinking':'idle';return <button key={id} className={`painted-resident resident-${id} ${reacting&&action?`action-${action}`:''} ${travelling?'is-travelling':''} ${spokenLine?.id===id&&spokenLine.status==='speaking'?'is-speaking':''}`} style={{left:`${x}%`,top:`${y}%`,'--resident-delay':`${i*-.8}s`} as CSSProperties} onClick={()=>onCharacter?.(id)} aria-label={`Meet ${characters[id].name}`}>
   {(spokenLine?.id===id||action&&!travelling)&&<span className="painted-speech">{dialogueFor(world,id).text}</span>}
   <CharacterPortrait id={id} size={92} mood={p.mood} expression={travelling?'walking':expression}/>
   <span className="painted-name">{characters[id].name}{spokenLine?.id===id&&spokenLine.status==='speaking'&&<span className="speaking-bars" aria-label="Speaking"><i/><i/><i/></span>}<small>{phase==='repairing'&&plans.find(plan=>plan.id===id)?.repairDestination?'Helping repair the village':phase==='walking'?plans.find(plan=>plan.id===id)?.activity:p.food<1&&world.day>0?'Needs food':receiving&&reacting?'Received help':'↗'}</small></span>
  </button>})}
  {reacting&&<svg key={`${world.day}-${replay}`} className="painted-transfers" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">{transfers.map((tr,i)=>{const sx=tr.from.x*10,sy=tr.from.y*6-35,ex=tr.to.x*10,ey=tr.to.y*6-35;return <g key={i}>{tr.kind==='coin'?<circle r="6" fill="#e4c77e" stroke="#796039" strokeWidth="1.5"/>:<g><rect x="-8" y="-6" width="16" height="12" rx="2" fill="#cfb785" stroke="#806347" strokeWidth="1.3"/><path d="M-8 0H8M0-6V6" stroke="#efe1b7" strokeWidth="2"/></g>}<animateMotion dur="2.1s" path={`M${sx},${sy} Q${(sx+ex)/2},${Math.min(sy,ey)-95} ${ex},${ey}`} fill="freeze"/><set attributeName="opacity" to="0" begin="2.1s"/></g>})}</svg>}
 </div>
}
export default TownScene;
