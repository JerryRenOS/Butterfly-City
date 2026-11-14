import { useId, useState, useEffect } from 'react';
import { CharacterPortrait } from './CharacterPortrait';
export { CharacterPortrait } from './CharacterPortrait';
import type { Id } from './engine';
import './town.css';

const palettes: Record<string, {body:string;light:string;shirt:string;name:string}> = {
  bob: {body:'#ed8c49',light:'#ffe3b5',shirt:'#bd533d',name:'Bob'},
  alice:{body:'#ec9db6',light:'#fff0da',shirt:'#c75786',name:'Alice'},
  kevin:{body:'#9c8bc1',light:'#e8d9ed',shirt:'#645580',name:'Kevin'},
  mia:{body:'#63aea1',light:'#d9eed1',shirt:'#f5c660',name:'Mia'},
};
function Cloud({x,y,s=1}:{x:number;y:number;s?:number}){return <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fffdf2"><path d="M0 28q-10-22 13-25 8-28 34-13 22-12 30 13 28-3 28 22Z"/><path d="M-10 38h122" stroke="#fffdf2" strokeWidth="3" strokeLinecap="round" opacity=".65"/></g>}
function Tree({x,y,s=1,shade='#58b363'}:{x:number;y:number;s?:number;shade?:string}){return <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#345f42" strokeWidth="3"><ellipse cy="10" rx="36" ry="8" fill="#3b684127" stroke="none"/><path d="M-6 3l3-66h12L7 3Z" fill="#aa7c52"/><path d="M0-31l-16-16m21 1 17-15" fill="none"/><path d="M-40-56q-8-23 12-31-5-25 20-27 17-22 34-1 24-4 24 25 24 15 6 33-24 24-52 5-27 12-44-4" fill={shade}/><path d="M-26-78q2-16 16-16m21-6q13-5 19 5" fill="none" stroke="#d5e4a0" strokeWidth="5" opacity=".5"/></g>}
function Cottage({x,y,s=1,color='#ffd171',roof='#eb724d',flip=false}:{x:number;y:number;s?:number;color?:string;roof?:string;flip?:boolean}){return <g transform={`translate(${x} ${y}) scale(${flip?-s:s} ${s})`} stroke="#4b4140" strokeWidth="3.5" strokeLinejoin="round"><ellipse cx="55" cy="93" rx="76" ry="12" fill="#3b684123" stroke="none"/><path d="M0 23h108v69H0Z" fill={color}/><path d="M88 14V-26h18v50" fill="#da9470"/><path d="M-15 24L24-23h72l29 47Z" fill={roof}/><path d="M-15 24h140" strokeWidth="6" stroke="#8d514b"/><path d="M1 9h109M12-5h89M29-20l-7 43M57-20l-2 43M81-20l7 43" fill="none" stroke="#f5a57f" strokeWidth="2"/><path d="M43 93V52q13-19 27 0v41" fill="#785d4f"/><circle cx="62" cy="71" r="2" fill="#efd289"/><rect x="9" y="44" width="23" height="27" rx="6" fill="#8ee1e5"/><path d="M20 45v25M9 57h23" fill="none"/><rect x="80" y="44" width="19" height="25" rx="6" fill="#8ee1e5"/><path d="M89 45v24M80 56h19" fill="none"/><path d="M6 74h29m43-2h24" stroke="#b4644e" strokeWidth="6"/><path d="M12 74l-4-8m16 8 3-8m56 6-2-7m13 7 4-8" stroke="#74975b" strokeWidth="4"/></g>}
function Flower({x,y,c='#fff3c2'}:{x:number;y:number;c?:string}){return <g transform={`translate(${x} ${y})`}><path d="M0 0v12m0-4 5-3" stroke="#5e8752" strokeWidth="2"/><path d="M0-5C-7-11-10-2-4 0-10 6-1 10 1 4 6 10 12 2 6-1 11-7 3-11 0-5" fill={c}/><circle cy="0" cx="1" r="2.4" fill="#e7af4f"/></g>}
const quips: Record<string, Record<string, string>> = {
 bob:{share:'Okay, one slice each!',hoard:'Finders, eaters.',trade:'Let’s make a deal.',influence:'You owe me a favor.',cooperate:'Fine. Teamwork it is!',support:'Let’s keep this town going.',ask:'A little help over here?',suspicion:'Something smells fishy.'},
 alice:{share:'Nobody eats alone.',hoard:'I need a little, too.',trade:'A fair swap, promise.',influence:'Remember who helped.',cooperate:'We can do this together!',support:'For everyone’s tomorrow.',ask:'Could someone lend a hand?',suspicion:'Is everyone being honest?'},
 kevin:{share:'Trust. An experiment.',hoard:'It’s a pizza conspiracy.',trade:'Terms and conditions?',influence:'You’re in my circle.',cooperate:'A controlled collaboration.',support:'Reinforcing the system.',ask:'Requesting backup!',suspicion:'I have a theory…'},
 mia:{share:'Investing in us.',hoard:'Saving for tomorrow.',trade:'A delicious opportunity.',influence:'Let’s build an alliance.',cooperate:'Better when we build together.',support:'Investing in our town.',ask:'A little working capital?',suspicion:'Those numbers don’t add up.'},
};
export default function TownScene({world,onCharacter,compact=false,accent}:{world:any;onCharacter?:(id:Id)=>void;compact?:boolean;accent?:string}){
 const [lore,setLore]=useState<string|null>(null);
 const [clicked,setClicked]=useState<string|null>(null);
 const [reacting,setReacting]=useState(false);
 useEffect(()=>{if(!world?.day)return;setReacting(true);const timer=setTimeout(()=>setReacting(false),3600);return()=>clearTimeout(timer)},[world?.day]);
 const uid=useId().replace(/:/g,'');
 const trustValues = Object.entries(world?.trust||{}).flatMap(([id,row])=>Object.entries(row as Record<string,number>).filter(([other])=>id!==other).map(([,value])=>value));
 const trust = world?.town?.trust ?? (trustValues.length ? trustValues.reduce((a,b)=>a+b,0)/trustValues.length : 50);
 const residents = Object.values(world?.people||{}) as {food:number;mood:number}[];
 const mood = world?.town?.mood ?? (residents.length?residents.reduce((sum,p)=>sum+p.mood,0)/residents.length:50);
 const stability = world?.town?.stability ?? 50;
 // The market stall is public food only; private inventories belong to their residents.
 const food: number = world?.town?.food ?? 0;
 const wealth: number = world?.town?.wealth ?? 0;
 const atmosphere = trust<40||mood<40||stability<35?'tense':trust>=55&&mood>=55&&stability>=50?'friendly':'hopeful';
 const outcome = typeof world?.town?.outcome==='string'?world.town.outcome:'A town at a crossroads';
 const positions: {id:Id;x:number;y:number}[]=[{id:'bob',x:43,y:68},{id:'alice',x:27,y:73},{id:'kevin',x:73,y:70},{id:'mia',x:58,y:81}];
 const physicalPositions=positions.map(p=>({...p,x:p.x+(atmosphere==='tense'?(p.x<50?-4:4):atmosphere==='friendly'?(p.x<50?2:-2):0)}));
 const recentEffects: {actor:Id;target?:Id;kind:string;description:string}[] = world?.history?.at(-1)?.effects||[];
 type Gift = {from:{id:string;x:number;y:number};to:{id:string;x:number;y:number};resource:'food'|'coin'};
 const gifts = recentEffects.flatMap<Gift>(effect=>{
   if(effect.kind==='ask'){
     const to=physicalPositions.find(p=>p.id===effect.actor);
     return to?[{from:{id:'public-pantry',x:14.8,y:79},to,resource:'food' as const}]:[];
   }
   if(effect.kind==='trade'&&effect.target){
     const from=physicalPositions.find(p=>p.id===effect.target),to=physicalPositions.find(p=>p.id===effect.actor);
     return from&&to?[{from,to,resource:'coin' as const}]:[];
   }
   if(effect.kind!=='food-transfer'||!effect.target)return [];
   const from=physicalPositions.find(p=>p.id===effect.actor),to=physicalPositions.find(p=>p.id===effect.target);
   return from&&to?[{from,to,resource:'food' as const}]:[];
 });
 const succeeded=(id:Id,action:string)=>recentEffects.some(effect=>effect.actor===id&&effect.kind===action);
 const failed=(id:Id)=>recentEffects.some(effect=>effect.actor===id&&effect.kind==='unfulfilled');
 const civicLabels: Record<string,string>={cooperate:'TEAMWORK',support:'AID DELIVERED',ask:'HELP RECEIVED',suspicion:'DOUBT SPREAD'};

 return <div className={`town-scene atmosphere-${atmosphere} ${food<4?'low-food':''} ${compact?'compact':''}`} style={{'--scene-accent':accent||'#d8edc1'} as React.CSSProperties}>
 <svg className="village-art" viewBox="0 0 1200 610" preserveAspectRatio="none" role="img" aria-label="An illustrated hillside village with red-roofed cottages, flower gardens, and a little pizza shop">
 <defs><linearGradient id={`${uid}sky`} x2="0" y2="1"><stop stopColor={atmosphere==='tense'?"#83a9d8":"#65c9ed"}/><stop offset="1" stopColor={atmosphere==='tense'?"#c4d8e9":"#c6eff2"}/></linearGradient><linearGradient id={`${uid}grass`} x2="0" y2="1"><stop stopColor={atmosphere==='tense'?"#8bbc7a":"#99dc62"}/><stop offset="1" stopColor={atmosphere==='tense'?"#6c9b69":"#74bd4c"}/></linearGradient><pattern id={`${uid}paper`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".6" fill="#fff" opacity=".14"/><circle cx="5" cy="5" r=".5" fill="#4c603b" opacity=".08"/></pattern></defs>
 <rect width="1200" height="610" fill={`url(#${uid}sky)`}/><g className="sun-rays" opacity=".4" stroke="#fff7b6" strokeWidth="5" strokeLinecap="round">{Array.from({length:12},(_,i)=><path key={i} d="M986 13v-10" transform={`rotate(${i*30} 986 83)`}/>)}</g><circle cx="986" cy="83" r="43" fill="#fff2b2"/><circle cx="986" cy="83" r="58" fill="#fff5c6" opacity=".25"/>
 <g className="cloud-drift"><Cloud x={90} y={84} s={1.2}/><Cloud x={390} y={50} s={.75}/><Cloud x={733} y={100} s={.8}/><Cloud x={1080} y={153} s={.9}/></g>
 <path stroke="#4c9077" strokeWidth="3" d="M0 235Q150 91 317 222 485 60 681 218 838 119 1000 234 1129 148 1200 211v399H0Z" fill="#8dcc9d"/><path stroke="#44845d" strokeWidth="3" d="M0 261Q125 194 285 269 406 177 565 252 774 172 932 266 1083 219 1200 266v344H0Z" fill="#63ba80"/>
 <path d="M0 310Q219 251 410 288 683 232 888 297 1066 263 1200 302v308H0Z" fill={`url(#${uid}grass)`}/>
 <path d="M557 610Q550 526 440 477 364 430 473 399 551 371 600 310" fill="none" stroke="#a7885a" strokeWidth="76" opacity=".2"/><path d="M557 610Q550 526 440 477 364 430 473 399 551 371 600 310" fill="none" stroke="#f5d28b" strokeWidth="67"/><path d="M438 451Q243 431 197 344M459 454Q788 424 999 358" fill="none" stroke="#f5d28b" strokeWidth="43"/>
 <path d="M445 449Q660 401 795 443 914 492 1200 454" fill="none" stroke="#cbd4a2" strokeWidth="3" strokeDasharray="8 12"/>
 <g opacity=".85"><Tree x={68} y={310} s={.7}/><Tree x={1114} y={299} s={.8}/><Tree x={377} y={294} s={.65}/><Tree x={869} y={297} s={.7}/><Tree x={929} y={282} s={.5}/></g>
 <Cottage x={111} y={247} s={1.3}/><Cottage x={949} y={250} s={1.22} color="#e0c896" roof="#a66f64"/><Cottage x={327} y={242} s={.64} color="#e2ca99" roof="#b8735d"/>
 <g transform="translate(490 195) scale(1.18)" stroke="#493c39" strokeWidth="2.6" strokeLinejoin="round"><ellipse cx="92" cy="150" rx="135" ry="19" fill="#54724128" stroke="none"/><path d="M-4 29h193v120H-4Z" fill="#ffdf9b"/><path d="M167 7v-39h21V25" fill="#c68463"/><path d="M-26 28 20-35h144l47 63Z" fill="#e36847"/><path d="M-26 28h237" stroke="#754d43" strokeWidth="7"/><path d="M-12 11h207M1-6h183M15-23h157M39-33l-13 60M70-33l-7 60M103-33v60M136-33l9 60M161-33l22 60" stroke="#ffae62" fill="none" strokeWidth="2"/>
 <path d="M65 147V94q27-23 53 0v53" fill="#745d4e"/><path d="M72 140V99q20-17 39 0v41" fill="#a8c5b6"/><path d="M92 91v52m-18-25h36" fill="none"/><circle cx="104" cy="126" r="2" fill="#f5d595"/>
 <rect x="8" y="86" width="41" height="42" rx="4" fill="#9cbab2"/><rect x="135" y="86" width="41" height="42" rx="4" fill="#9cbab2"/><path d="M28 87v39m-19-20h39m106-20v39m-18-20h39" fill="none"/>
 <path d="M-14 67h211l10 23H-23Z" fill="#fff1ce"/>{[0,1,2,3,4,5].map(i=><path key={i} d={`M${i*38-8} 67h19l4 23h-24Z`} fill="#d97861" stroke="none"/>)}<path d="M-23 90q9 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 19 0 10 12 21 0" fill="#fff1ce"/>
 <rect x="37" y="37" width="110" height="26" rx="5" fill="#34767a"/><text x="92" y="55" textAnchor="middle" fill="#fff2ca" stroke="none" fontSize="15" fontWeight="800" letterSpacing="2" fontFamily="Georgia,serif">PIZZA POST</text><path d="M-10 146h201" stroke="#d4b98b" strokeWidth="7"/>
 <g transform="translate(203 107) rotate(6)"><path d="M0 3h29v43H0Z" fill="#5b7053"/><path d="M-4 51 1 0m28 0 5 51"/><text x="15" y="17" textAnchor="middle" stroke="none" fill="#fff0c2" fontSize="8" fontFamily="sans-serif" fontWeight="bold">LAST</text><text x="15" y="29" textAnchor="middle" stroke="none" fill="#fff0c2" fontSize="9" fontFamily="sans-serif" fontWeight="bold">SLICE!</text><path d="M9 35h13" stroke="#f3c56b"/></g></g>
 <g stroke="#e8dfb9" strokeWidth="5" strokeLinecap="round"><path d="M772 331v42m22-43v39m22-41v40m22-42v39m22-42v38m22-40v38M765 342l126-8m-126 23 126-7"/><path d="M30 369v42m22-43v39m22-41v40m22-42v39M22 381l82-7m-82 23 82-7"/></g>

 <g className="game-platform" stroke="#4a6335" strokeWidth="3" strokeLinejoin="round"><path d="M-20 551Q188 508 373 552T739 549T1220 545V630H-20Z" fill="#a16e42"/><path d="M-20 547Q188 504 373 548T739 545T1220 541v22q-15 22-29 0-17 21-29 2-16 22-33 2-21 20-35 3-14 22-31 3-21 19-34 3-13 23-32 3-17 20-34 0-15 22-34 2-13 21-31 2-14 20-30 1-20 17-34-1-15 21-32 0-17 18-34-1-13 19-33-2-15 20-30-1-16 19-30-3-16 19-30-1-15 18-30-2-17 19-32-2-17 18-32 0-17 20-34-1-15 20-32 1-19 21-35 0-16 20-32 0-16 20-35 0-17 20-31-1-14 20-32-3-18 19-34-1-17 19-32-1-18 18-32-2-18 19-34-3-17 16-31-3-19 18-32-3-18 18-35-2-16 18-32-3-18 17-33-2-16 18-32-2-17 18-32-1-17 19-34 0-18 18-34 0Z" fill="#75c947"/><path d="M0 550q183-37 370 3t370-3 460-4" fill="none" stroke="#c6f17c" strokeWidth="7"/>{Array.from({length:18},(_,i)=><path key={i} d={`M${i*73+19} ${587+(i%3)*8}l9-4 8 5-8 5Z`} fill="#c7955c" stroke="#865d3f" strokeWidth="1.5"/>)}</g>
 <g transform="translate(125 470)" stroke="#48473a" strokeWidth="3" strokeLinejoin="round"><path d="M0 0h105v57H0Z" fill="#eab966"/><path d="M-10-8h125l-10-30H0Z" fill="#f8df8e"/>{[0,1,2].map(i=><path key={i} d={`M${i*42}-38h20l3 30h-25Z`} fill="#f18b59" stroke="none"/>)}<path d="M0-8v-42m105 42v-42M-6 5h116"/><path d="M9 18h86v31H9Z" fill="#bf8a4e"/><text x="52" y="39" fill="#fff2c5" stroke="none" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="sans-serif">PANTRY</text>{Array.from({length:Math.min(8,Math.floor(food))},(_,i)=><g key={i} transform={`translate(${12+i%4*24} ${-14-Math.floor(i/4)*14})`}><ellipse rx="11" ry="7" fill="#efae51"/><path d="M-5-3 0 1m2-5 4 4" stroke="#ad723d" strokeWidth="1.5"/></g>)}{food<1&&<text x="52" y="-17" textAnchor="middle" stroke="none" fill="#664d3d" fontWeight="900" fontSize="10">SOLD OUT</text>}</g>
 <g transform="translate(887 455)" stroke="#453d3b" strokeWidth="3" strokeLinejoin="round"><path d="M0 0v80m57-80v80" fill="none"/><path d="M-10 3 30-29 72 3Z" fill="#e75f58"/><path d="M-5 4h70v43H-5Z" fill="#f5df9c"/><path d="M5 14h47v24H5Z" fill="#c2deab"/><text x="29" y="30" textAnchor="middle" fontSize="11" fontWeight="900" stroke="none" fill="#4b654c">TOWN MAP</text><path d="M29-29v-27l29 8-29 10" fill="#ffcb58"/></g>
 <g stroke="#524737" strokeWidth="2.5"><path d="M316 548v-20h12v20" fill="#fff0be"/><path d="M303 529q19-33 38 0Z" fill="#ea6763"/><circle cx="317" cy="519" r="4" fill="#fff4cc" stroke="none"/><circle cx="331" cy="526" r="3" fill="#fff4cc" stroke="none"/><path d="M994 551v-29h15v29" fill="#fff0be"/><path d="M976 527q26-42 52 0Z" fill="#b18ce0"/><circle cx="994" cy="513" r="5" fill="#fff4cc" stroke="none"/><circle cx="1014" cy="521" r="4" fill="#fff4cc" stroke="none"/></g>
 <g transform="translate(1044 481)" stroke="#564637" strokeWidth="2.5" strokeLinejoin="round"><path d="M-25 8h57v39h-57Z" fill="#bf8a4b"/><path d="M-28 7q31-24 63 0v11h-63Z" fill="#e8b861"/><path d="M-7 0v18m24-18v18" stroke="#f9df9a" strokeWidth="5"/><rect x="-3" y="17" width="13" height="11" rx="2" fill="#ffe575"/>{Array.from({length:Math.min(4,Math.floor(wealth/2))},(_,i)=><g key={i} transform={`translate(${-22+i*15} ${-4-i%2*6})`}><ellipse rx="7" ry="4" fill="#ffdb4f"/><path d="M-6 0v4q6 5 12 0V0" fill="#e9aa36"/></g>)}<path d="M-31 44h70v20h-70Z" fill="#fff0bb"/><text x="4" y="58" textAnchor="middle" stroke="none" fill="#634f36" fontSize="11" fontWeight="900">{Math.round(wealth)} COINS</text></g>
 <g className="festival-bunting" stroke="#556044" strokeWidth="2"><path d="M238 279q130 92 254 8" fill="none"/>{Array.from({length:8},(_,i)=>{const x=253+i*29,y=289+Math.sin(i/7*Math.PI)*37;return <path key={i} d={`M${x} ${y}l19 6-15 23Z`} fill={['#f27b6b','#ffdb69','#65bbc3'][i%3]}/>})}</g>
 <Tree x={63} y={455} s={1.35}/><Tree x={1134} y={431} s={1.4} shade="#3f9b57"/><Tree x={1043} y={466} s={.85} shade="#63b95d"/>
 <g fill="#51a058"><ellipse cx="141" cy="420" rx="38" ry="17"/><ellipse cx="166" cy="420" rx="27" ry="15"/><ellipse cx="882" cy="369" rx="29" ry="16"/><ellipse cx="910" cy="369" rx="22" ry="13"/><ellipse cx="305" cy="339" rx="25" ry="12"/></g>
 {[{x:111,y:440},{x:133,y:452},{x:155,y:443},{x:187,y:454},{x:885,y:388},{x:909,y:391},{x:948,y:415},{x:954,y:431},{x:974,y:419},{x:270,y:363},{x:287,y:367},{x:752,y:512},{x:773,y:521},{x:792,y:510},{x:305,y:533},{x:331,y:548},{x:354,y:539}].map((f,i)=><Flower key={i} {...f} c={['#fff3c2','#e5a4a5','#efe8da'][i%3]}/>)}
 <g fill="#739552" opacity=".75">{Array.from({length:36},(_,i)=><path key={i} d={`M${(i*173+31)%1190} ${480+(i*41)%120}l-3-7 7 4 3-6 1 10Z`}/>)}</g>
 <g transform="translate(802 408)" stroke="#6f614c" strokeWidth="3"><path d="M0 0h66v11H0Z" fill="#cd9659"/><path d="M4 16h60v8H4Z" fill="#e4ad6a"/><path d="M10 11v27m45-27v27M9-1v-12m46 12v-12"/><path d="M0-17h66v9H0Z" fill="#e4ad6a"/></g>
 <g className="little-butterfly" transform="translate(390 198)"><path d="M0 0q-16-19-20-5-3 13 18 10-17 14-5 15 8 0 8-17 5 17 13 11 7-9-11-11 20-4 13-15-7-10-16 12" fill="#f5ca73" stroke="#9c8354" strokeWidth="1.5"/></g>
 <g transform="translate(940 182)"><path d="M0 0q5-7 10 0 5-7 10 0" stroke="#688c80" strokeWidth="2" fill="none"/></g><rect width="1200" height="610" fill={`url(#${uid}paper)`} pointerEvents="none"/>
 <g className="world-butterflies">{[0,1,2].map(i=><g key={i} transform={`translate(${210+i*309} ${173+i%2*60})`}><g className="wingbeat"><path d="M0 0q-19-24-23-8-3 14 20 12-16 10-6 15 9 3 10-15 5 17 14 12 9-10-10-12 20-6 12-18-8-7-17 14" fill={['#ffd058','#e78ad0','#7a91e1'][i]} stroke="#4e5356" strokeWidth="2"/></g></g>)}</g>
 <g className="trust-petals" opacity={atmosphere==='friendly'?1:.2}>{Array.from({length:8},(_,i)=><Flower key={i} x={386+i*45} y={550+(i%2)*12} c={atmosphere==='friendly'?'#ff8db5':'#c5d8bd'}/>)}</g>
 <rect className="atmosphere-tint" width="1200" height="610" fill={atmosphere==='tense'?'#6684c1':atmosphere==='friendly'?'#ffe78c':'transparent'} opacity={atmosphere==='tense'?.16:atmosphere==='friendly'?.1:0} pointerEvents="none"/>
 </svg>
 <svg key={`gifts-${world?.day}`} className="gift-layer" viewBox="0 0 1200 610" preserveAspectRatio="none" aria-hidden="true">{gifts.map(({from,to,resource},i)=>{const sx=from.x*12,sy=from.y*6.1-25,ex=to.x*12,ey=to.y*6.1-25;const path=`M${sx} ${sy} Q${(sx+ex)/2} ${Math.min(sy,ey)-75} ${ex} ${ey}`;return <g key={`${from.id}-${to.id}-${i}`} className="gift-token">{resource==='coin'?<><circle r="11" fill="#ffdc53" stroke="#a37332" strokeWidth="2.5"/><circle r="7" fill="none" stroke="#e4a93e" strokeWidth="1.5"/><path d="M0-5v10" stroke="#a37332" strokeWidth="2"/></>:<><path d="M-10-7 10-7 0 14Z" fill="#ffd262" stroke="#84513f" strokeWidth="2"/><path d="M-10-7h20" stroke="#c77845" strokeWidth="5" strokeLinecap="round"/><circle cx="-2" cy="1" r="2" fill="#df6550"/><circle cx="3" cy="-3" r="2" fill="#df6550"/></>}<animateMotion dur="1.8s" begin="0s" path={path} fill="freeze"/><set attributeName="opacity" to="0" begin="1.8s"/></g>})}</svg>
 <button className="world-hotspot pizza-door" aria-label="Read the Pizza Post sign" onClick={()=>setLore('THE PIZZA POST • Eight slices. Four hungry neighbors. This little kitchen has never had such a big responsibility.')}><span>?</span></button>
 <button className="world-hotspot pantry-door" aria-label="Inspect town food pantry" onClick={()=>setLore(`THE PUBLIC PANTRY • ${Number(food.toFixed(1))} shared food is available to the town. Private food is stored by each resident.`)}><span>?</span></button>
 <button className="world-hotspot treasury-door" aria-label="Inspect public treasury" onClick={()=>setLore(`THE TOWN TREASURY • ${Number(wealth.toFixed(1))} public coins. These belong to the town, separate from each resident’s own wealth.`)}><span>?</span></button>
 <button className="world-hotspot map-sign" aria-label="Read the town noticeboard" onClick={()=>setLore(`TOWN NOTICEBOARD • ${world?.town?.summary||'One town. Four people. Every decision matters.'} Trust ${Math.round(trust)}, mood ${Math.round(mood)}, stability ${Math.round(stability)}.`)}><span>?</span></button>
 {lore&&<div className="world-lore" role="status"><p>{lore}</p><button onClick={()=>setLore(null)} aria-label="Close town note">×</button></div>}
 <div className="world-weather"><span>{atmosphere==='tense'?'☁':atmosphere==='friendly'?'☀':'✦'}</span><b>{outcome}</b><small>{food<1?'Public pantry empty':`${Number(food.toFixed(1))} public food`} · {Math.round(wealth)} public coins</small></div>
 <div className="town-place-label"><span className="place-dot"/> BUTTERFLY CITY <span>Population: 4 little personalities</span></div>
 {physicalPositions.map(({id,x,y},i)=>{const person=world?.people?.[id]; const decision=world?.lastDecisions?.[id];return <button type="button" key={`${id}-${world?.day}`} className={`town-resident resident-${id} action-${reacting&&succeeded(id,decision)?decision:'idle'} ${clicked===id?'just-clicked':''}`} style={{left:`${x}%`,top:`${y}%`,'--delay':`${i*-.8}s`,'--approach-x':`${Math.sign(physicalPositions[(i+1)%4].x-x)*14}px`} as React.CSSProperties} onClick={()=>{setClicked(id);setTimeout(()=>setClicked(null),650);onCharacter?.(id)}} aria-label={`Meet ${palettes[id].name}`}>
 {decision&&<span className="resident-speech">{failed(id)?'That plan didn’t work.':typeof decision==='string'?(quips[id]?.[decision]||decision):decision.action||decision.choice||''}</span>}
 <span className="resident-paper">
 {reacting&&succeeded(id,decision)&&civicLabels[decision]&&<span className={`civic-feedback civic-${decision}`} aria-hidden="true">{civicLabels[decision]}</span>}
 {world.day>0&&<span className={`relationship-spark ${person?.mood<40||atmosphere==='tense'?"worried":"friendly"}`} aria-hidden="true">{person?.food<1?"…":person?.mood<40||atmosphere==='tense'?"ϟ":atmosphere==='friendly'?"♥":""}</span>}
 <CharacterPortrait id={id} size={125} mood={person?.mood} expression={reacting?failed(id)?'thinking':succeeded(id,'suspicion')?'angry':recentEffects.some(effect=>effect.kind==='hoard'&&effect.actor!==id)?'shocked':succeeded(id,decision)&&['share','support','cooperate','ask'].includes(decision)?'happy':'thinking':world.day>0&&person?.food<1?'thinking':person?.mood<30?'angry':atmosphere==='tense'?'thinking':atmosphere==='friendly'&&person?.mood>60?'happy':undefined}/>
</span><span className="resident-name">{palettes[id].name}<span>↗</span></span></button>})}
 <div className="scene-bottom-note"><span>✦</span> A small town. An infinite number of tomorrows.</div>
 </div>
}

export { TownScene };
