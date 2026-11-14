import type { CSSProperties } from 'react';
export type CharacterExpression = 'idle' | 'happy' | 'shocked' | 'angry' | 'thinking' | 'walking';
const columns:Record<string,number>={bob:0,alice:1,kevin:2,mia:3};
export function CharacterPortrait({id,size=100,mood=65,expression}:{id:string;size?:number;mood?:number;expression?:CharacterExpression}){
 const face=expression||(mood<35?'thinking':mood>80?'happy':'idle');
 return <span className={`painted-character painted-${id} expression-${face}`} style={{'--portrait-width':`${size}px`,'--portrait-column':columns[id]??0} as CSSProperties} aria-hidden="true"><span className="character-image"/><span className="character-ground"/></span>
}
export default CharacterPortrait;
