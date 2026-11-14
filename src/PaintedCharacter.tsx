import type { CSSProperties } from 'react';
import type { CharacterMotion } from './characterMotion';
export type CharacterExpression = 'idle' | 'happy' | 'shocked' | 'angry' | 'thinking' | 'walking';
export type CharacterGesture = 'idle' | 'talk' | 'give' | 'concern' | 'listen' | 'work';
const columns:Record<string,number>={bob:0,alice:1,kevin:2,mia:3};
export function CharacterPortrait({id,size=100,mood=65,expression,motion,gesture='idle'}:{id:string;size?:number;mood?:number;expression?:CharacterExpression;motion?:CharacterMotion;gesture?:CharacterGesture}){
 const face=expression||(mood<35?'thinking':mood>80?'happy':'idle');
 if(motion){
  const turning=!motion.facingReady&&motion.turnProgress<.999;
  const frame=motion.moving?4+motion.walkFrame:turning?1:gesture==='work'||gesture==='give'?10:gesture==='talk'?8:gesture==='listen'?9:gesture==='concern'?11:motion.facing.startsWith('back')?3:motion.facing==='front'?0:2;
  return <span className={`painted-character animated-character painted-${id} facing-${motion.facing} gesture-${motion.moving?'walk':turning?'turn':gesture} ${motion.moving?'stride-active':''}`} style={{'--portrait-width':`${size}px`,'--pose-x':`${frame%4*100/3}%`,'--pose-y':`${Math.floor(frame/4)*50}%`,'--depth-scale':.91+motion.depth*.09,'--pose-sheet':`url('/art/${id}-animation.png')`} as CSSProperties} data-pose={frame} data-facing={motion.facing} aria-hidden="true"><span className="character-ground"/><span className="character-body"><span className="character-pose"/></span></span>
 }
 return <span className={`painted-character painted-${id} expression-${face}`} style={{'--portrait-width':`${size}px`,'--portrait-column':columns[id]??0} as CSSProperties} aria-hidden="true"><span className="character-image"/><span className="character-ground"/></span>
}
export default CharacterPortrait;
