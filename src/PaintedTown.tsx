import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CharacterPortrait, type CharacterGesture } from './PaintedCharacter';
import { scenePlan, locationEffects, civicPlaces, type ScenePoint } from './sceneDynamics';
import { Butterfly } from './Butterfly';
import { DisasterScene, DisasterBadge } from './DisasterScene';
import { LivingLandscape } from './LivingLandscape';
import { disasters, disasterConditions } from './disasters';
import { characters, formatNumber, ids, type World, type Id } from './engine';
import { dialogueFor, voiceProfiles } from './characterDialogue';
import type { SpokenLine } from './useCharacterSpeech';
import { useCharacterMotion } from './useCharacterMotion';
import type { FacingTargets } from './characterMotion';
export {CharacterPortrait} from './PaintedCharacter';
type Position={id:string;x:number;y:number};
type Transfer={from:Position;to:Position;kind:'food'|'coin'};
type ScenePhase = 'idle'|'walking'|'working'|'repairing'|'repair-work'|'returning';
export function TownScene({world,onCharacter,compact=false,motionEnabled=true,motionPaused=false,voiceScope='Your town',spokenLine=null,onNarrate,onStopSpeech,onSpeechReady}:{world:World;onCharacter?:(id:Id)=>void;compact?:boolean;accent?:string;motionEnabled?:boolean;motionPaused?:boolean;voiceScope?:string;spokenLine?:SpokenLine|null;onNarrate?:()=>void;onStopSpeech?:()=>void;onSpeechReady?:(turnId:string)=>void}){
 const [note,setNote]=useState<string|null>(null);
 const [phase,setPhase]=useState<ScenePhase>('idle');
 const [replay,setReplay]=useState(0);
 const [sceneTown,setSceneTown]=useState(world.town);
 const sceneRef=useRef<HTMLDivElement>(null);
 const lastPositions=useRef<Record<Id,ScenePoint>|null>(null);
 const meeting=useRef<{key:string;pair:Id[];bystanders:Id[]}|null>(null);
 const [sceneWidth,setSceneWidth]=useState(compact?600:1200);
 useEffect(()=>{
  const scene=sceneRef.current;
  if(!scene||typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(([entry])=>setSceneWidth(entry.contentRect.width));
  observer.observe(scene);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  setNote(null);
  if(!world.day||!motionEnabled){setSceneTown(world.town);setPhase('idle');return;}
  setPhase('walking');
 },[world,replay,motionEnabled]);
 const plans=scenePlan(world),places=locationEffects(world);
 const initial=Object.fromEntries(plans.map(plan=>[plan.id,plan.origin])) as Record<Id,ScenePoint>;
 const targets=Object.fromEntries(plans.map(plan=>[plan.id,phase==='repairing'||phase==='repair-work'?plan.repairDestination||plan.destination:phase==='walking'||phase==='working'?plan.destination:plan.origin])) as Record<Id,ScenePoint>;
 const facingTargets:FacingTargets={};
 const partner=spokenLine?.target;
 if(spokenLine&&partner){
  // The same two foot positions survive the reply: speakers do not swap places.
  // Keep a physical conversational gap even when the split view gets narrow.
  const pairKey=[spokenLine.id,partner].sort().join(':')+`:${world.disaster.type}:${world.day}`;
  if(meeting.current?.key!==pairKey){
   const positions=lastPositions.current||initial;
   meeting.current={key:pairKey,pair:[spokenLine.id,partner].sort((a,b)=>positions[a].x-positions[b].x),bystanders:ids.filter(id=>id!==spokenLine.id&&id!==partner).sort((a,b)=>positions[a].x-positions[b].x)};
  }
  const pair=meeting.current.pair;
  const gap=Math.min(28,Math.max(16,10000/sceneWidth));
  targets[pair[0]]={x:49-gap/2,y:84};
  targets[pair[1]]={x:49+gap/2,y:84};
  facingTargets[spokenLine.id]=partner;
  facingTargets[partner]=spokenLine.id;
  meeting.current.bystanders.forEach((id,index)=>{
   targets[id]={x:index?82:17,y:75};
   facingTargets[id]={x:49,y:84};
  });
 }else if(phase==='working'||phase==='repair-work'){
  for(const plan of plans){
   if(phase==='repair-work'&&plan.repairDestination)facingTargets[plan.id]=civicPlaces.repairs[world.disaster.type];
   else if(plan.action==='cooperate'||plan.action==='ask')facingTargets[plan.id]=civicPlaces.pantry;
  }
 }
 const motion=useCharacterMotion({targets,initial,facingTargets,enabled:motionEnabled,paused:motionPaused});
 lastPositions.current=motion;
 if(!spokenLine)meeting.current=null;
 const allArrived=ids.every(id=>motion[id].arrived);
 useEffect(()=>{
  if(!motionEnabled||motionPaused||spokenLine)return;
  // Arrival gates the activity; slow walkers and detours never get cut short by a timer.
  let next:ScenePhase|undefined,delay=180;
  if(phase==='walking'&&allArrived)next='working';
  if(phase==='working'&&allArrived){next=places.repairs.length?'repairing':'returning';delay=2400;}
  if(phase==='repairing'&&allArrived)next='repair-work';
  if(phase==='repair-work'&&allArrived){next='returning';delay=2400;}
  if(phase==='returning'&&allArrived)next='idle';
  if(!next)return;
  const timer=setTimeout(()=>{if(next==='working')setSceneTown(world.town);setPhase(next)},delay);
  return()=>clearTimeout(timer);
 },[phase,allArrived,motionEnabled,motionPaused,spokenLine,places.repairs.length,world.town]);
 const pairReady=!!spokenLine&&allArrived&&motion[spokenLine.id].facingReady&&(!partner||motion[partner].facingReady);
 useEffect(()=>{
  if(spokenLine?.status!=='approaching'||!pairReady||motionPaused)return;
  const timer=setTimeout(()=>onSpeechReady?.(spokenLine.turnId),180);
  return()=>clearTimeout(timer);
 },[spokenLine?.turnId,spokenLine?.status,pairReady,motionPaused,onSpeechReady]);
 useEffect(()=>{
  // The current civic atmosphere is already true while neighbors discuss the day.
  if(spokenLine?.status==='speaking')setSceneTown(world.town);
 },[spokenLine?.status,world.town]);
 const reacting=phase==='working'&&!spokenLine&&allArrived;
 const t=sceneTown;
 const atmosphere=t.trust<40||t.mood<40||t.stability<35?'tense':t.trust>=55&&t.mood>=55&&t.stability>=50?'warm':'calm';
 const positions=ids.map(id=>({id,...motion[id]}));
 const effects=world.history.at(-1)?.effects||[];
 const transfers=effects.flatMap<Transfer>(e=>{
  const actor=positions.find(p=>p.id===e.actor),target=positions.find(p=>p.id===e.target);
  if(e.kind==='cooperate'&&actor){const foodMatch=e.description.match(/contributed ([\d.]+) food/);const coinsMatch=e.description.match(/and ([\d.]+) wealth/);return [...(foodMatch&&Number(foodMatch[1])>0?[{from:actor,to:{id:'pantry',...civicPlaces.pantry},kind:'food' as const}]:[]),...(coinsMatch&&Number(coinsMatch[1])>0?[{from:actor,to:{id:'treasury',...civicPlaces.treasury},kind:'coin' as const}]:[])];}
  if(e.kind==='food-transfer'&&actor&&target)return [{from:actor,to:target,kind:'food'}];
  if(e.kind==='trade'&&actor&&target)return [{from:target,to:actor,kind:'coin'}];
  if((e.kind==='ask'||e.kind==='treasury-aid')&&actor)return [{from:{id:'town',...(e.kind==='ask'?civicPlaces.pantry:civicPlaces.treasury)},to:actor,kind:e.kind==='ask'?'food':'coin'}];
  return [];
 });
 return <div ref={sceneRef} data-speaker={spokenLine?.id} data-listener={partner} data-dialogue-status={spokenLine?.status} className={`painted-town atmosphere-${atmosphere} disaster-${world.disaster.type} ${disasterConditions(world.disaster,world.day).intensity?'under-weather':''} ${compact?'compact':''} ${reacting?'round-reaction':''} phase-${phase}`}>
  <LivingLandscape paused={motionPaused||!motionEnabled} reducedMotion={!motionEnabled} disaster={world.disaster} day={world.day} src={t.food<1?"/art/village-empty.png":"/art/village-painted.png"} alt={`A hand-painted village recovering from a ${disasters[world.disaster.type].name.toLowerCase()}`}/>
  <DisasterScene disaster={world.disaster} day={world.day} paused={motionPaused||!motionEnabled} reducedMotion={!motionEnabled}/>
  <DisasterBadge disaster={world.disaster} day={world.day}/>
  {phase==='repair-work'&&!spokenLine&&allArrived&&places.repairs.length>0&&<div className="repair-worksite" style={{left:`${civicPlaces.repairs[world.disaster.type].x}%`,top:`${civicPlaces.repairs[world.disaster.type].y}%`}}><span aria-hidden="true">⚒</span><b>Repair crews at work</b></div>}
  <div className="living-garden" aria-hidden="true">{Array.from({length:Math.min(12,Math.floor((t.trust+t.stability)/14))},(_,i)=><i key={i} style={{left:`${7+i*7.5}%`,'--plant':i} as CSSProperties}><span>✿</span></i>)}</div>
  <div className={`oven-glow ${places.market.length&&reacting?'market-active':''}`} aria-hidden="true"/>
  <div className="chimney-smoke" aria-hidden="true"><i/><i/><i/></div>
  <div className={`civic-site pantry-site ${reacting&&places.pantry.length?'site-active':''}`} aria-hidden="true"><span className="site-ripple"/>{reacting&&places.pantry.length>0&&<b>{places.pantry.some(e=>e.kind==='ask')?'Public aid collected':'New contributions'}</b>}<div className="pantry-stock">{Array.from({length:Math.min(6,Math.floor(t.food))},(_,i)=><i key={i}/>)}</div></div>
  <div className={`civic-site treasury-site ${reacting&&places.treasury.length?'site-active':''}`} aria-hidden="true"><span className="site-ripple"/>{reacting&&places.treasury.length>0&&<b>Treasury at work</b>}</div>
  <div className="landscape-light"/><div className="landscape-vignette"/>
  <div className="wind-motes" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{'--mote':i} as CSSProperties}/>)}</div>
  <div className="scene-butterfly butterfly-one" aria-hidden="true"><Butterfly/></div><div className="scene-butterfly butterfly-two" aria-hidden="true"><Butterfly/></div>
  <div className="village-caption"><span>THE VILLAGE OF SMALL POSSIBILITIES</span><b>{t.outcome}</b></div>
  <div className={`scene-playback ${spokenLine?'has-dialogue':''}`}>
   <span role={spokenLine?'status':undefined}>{spokenLine?spokenLine.status==='approaching'?`${characters[spokenLine.id].name}${partner?` & ${characters[partner].name}`:''} are meeting…`:`${spokenLine.status==='loading'?'Loading':characters[spokenLine.id].name} · ${voiceProfiles[spokenLine.id].accent} voice`:phase==='walking'?'Neighbors are on the move…':phase==='working'?'Emergency supplies are changing hands':phase==='repairing'?'Heading to the repair site…':phase==='repair-work'?'Neighbors are restoring the village':phase==='returning'?'Returning home…':!motionEnabled?'Scenery paused · use Play scenery above':'Living scenery · click a resident or place'}</span>
   <div className="scene-audio-controls">{onNarrate&&<button onClick={spokenLine?onStopSpeech:onNarrate} aria-label={spokenLine?'Stop dialogue':`Hear all citizens in ${voiceScope}`}>{spokenLine?'■ Stop dialogue':'♫ Hear neighbors'}</button>}{world.day>0&&<button disabled={phase!=='idle'||!!spokenLine} onClick={()=>setReplay(n=>n+1)} aria-label="Replay today’s village interactions">↻ Replay day</button>}</div>
  </div>
  <button className="landmark pantry-landmark" aria-label="Inspect the public pantry" onClick={()=>setNote(`The shared pantry holds ${formatNumber(t.food)} food. Citizens can contribute supplies or ask for aid.`)}><span>◒</span><small>{formatNumber(t.food)}<span> pantry</span></small></button>
  <button className="landmark treasury-landmark" aria-label="Inspect the public treasury" onClick={()=>setNote(`The treasury holds ${formatNumber(t.wealth)} public coins. Emergency grants come first; successful contributors then organize repairs, removing 8 damage per public coin spent.`)}><span>◇</span><small>{formatNumber(t.wealth)}<span> coins</span></small></button>
  <button className="landmark bakery-landmark" aria-label="Read the relief station notice" onClick={()=>setNote(`${disasters[world.disaster.type].description} Damage: ${formatNumber(world.disaster.damage)}/100. Choose Supply & rebuild to contribute resources and organize funded repairs.`)}><span>⌂</span><small>Relief station</small></button>
  {note&&<div className="landmark-note" role="status"><p>{note}</p><button aria-label="Close village note" onClick={()=>setNote(null)}>×</button></div>}
  {positions.map(({id,x,y},i)=>{
   const p=world.people[id],plan=plans.find(plan=>plan.id===id)!;
   const speaker=spokenLine?.id===id;
   const listening=partner===id;
   const talking=speaker&&spokenLine.status==='speaking';
   const repairing=phase==='repair-work'&&!!plan.repairDestination&&!spokenLine&&allArrived;
   const gesture:CharacterGesture=talking?spokenLine.gesture:listening&&!motion[id].moving?'listen':repairing?'work':reacting?plan.failed||plan.action==='hoard'||plan.action==='suspicion'?'concern':plan.receiving?'listen':plan.action==='share'||plan.action==='support'?'give':plan.action==='cooperate'?'work':'talk':p.mood<35?'concern':'idle';
   return <button key={id} className={`painted-resident animated-resident resident-${id} ${reacting&&plan.action?`action-${plan.action}`:''} ${motion[id].moving?'is-travelling':''} ${talking?'is-speaking':''} ${listening?'is-listening':''}`} style={{left:`${x}%`,top:`${y}%`,zIndex:5+positions.filter(other=>other.y<y).length,'--resident-delay':`${i*-.8}s`} as CSSProperties} data-arrived={motion[id].arrived} data-facing-ready={motion[id].facingReady} data-speed={motion[id].speed.toFixed(2)} data-turn={speaker?spokenLine.turnId:undefined} onClick={()=>onCharacter?.(id)} aria-label={`Meet ${characters[id].name}`}>
    {(talking||!spokenLine&&reacting)&&<span className="painted-speech">{talking?spokenLine.text:dialogueFor(world,id).text}</span>}
    <CharacterPortrait id={id} size={92} mood={p.mood} motion={motion[id]} gesture={gesture}/>
    <span className="painted-name">{characters[id].name}{talking&&<span className="speaking-bars" aria-label="Speaking"><i/><i/><i/></span>}<small>{talking&&partner?`To ${characters[partner].name}`:listening?`Listening to ${characters[spokenLine!.id].name}`:motion[id].moving?speaker?'Meeting a neighbor':phase==='returning'?'Heading home':plan.activity:repairing?'Repairing the village':p.food<1&&world.day>0?'Needs food':'↗'}</small></span>
   </button>
  })}
  {reacting&&<svg key={`${world.day}-${replay}`} className="painted-transfers" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">{transfers.map((tr,i)=>{const sx=tr.from.x*10,sy=tr.from.y*6-35,ex=tr.to.x*10,ey=tr.to.y*6-35;return <g key={i}>{tr.kind==='coin'?<circle r="6" fill="#e4c77e" stroke="#796039" strokeWidth="1.5"/>:<g><rect x="-8" y="-6" width="16" height="12" rx="2" fill="#cfb785" stroke="#806347" strokeWidth="1.3"/><path d="M-8 0H8M0-6V6" stroke="#efe1b7" strokeWidth="2"/></g>}<animateMotion dur="2.1s" path={`M${sx},${sy} Q${(sx+ex)/2},${Math.min(sy,ey)-95} ${ex},${ey}`} fill="freeze"/><set attributeName="opacity" to="0" begin="2.1s"/></g>})}</svg>}
 </div>
}
export default TownScene;
