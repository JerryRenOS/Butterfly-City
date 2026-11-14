import { characters, ids, civicChain, formatNumber, type World, type Id } from './engine';
export function CivilizationHud({world,compact=false}:{world:World;compact?:boolean}){
 const t=world.town, last=world.history.at(-1)?.civic;
 const tone=t.stability<35||t.trust<40||t.mood<40?'tense':t.trust>=55&&t.mood>=55&&t.stability>=50?'thriving':'uncertain';
 return <section className={`civilization-hud civic-${tone} ${compact?'compact-civic':''}`} aria-label={`Day ${world.day} civilization status`}>
 <div className="civic-heading"><span className="civic-seal" aria-hidden="true">{tone==='thriving'?'❀':tone==='tense'?'ϟ':'⚑'}</span><div><span className="eyebrow">{world.day?'TODAY’S CIVIC OUTCOME':'YOUR TINY CIVILIZATION'}</span><h2>{t.outcome}</h2></div><span className="stability-medal" title="Stability: 0 to 100">Order <b>{formatNumber(t.stability)}</b></span></div>
 <p className="civic-summary">{t.summary}</p>
 <div className="public-stats"><div><span>Public pantry</span><strong>◒ {formatNumber(t.food)}</strong><small>shared food</small></div><div><span>Town treasury</span><strong>◈ {formatNumber(t.wealth)}</strong><small>public coins</small></div><div><span>Social trust</span><strong>♥ {formatNumber(t.trust)}</strong><small>out of 100</small></div><div><span>Town morale</span><strong>☀ {formatNumber(t.mood)}</strong><small>out of 100</small></div></div>
 {last&&<div className="civic-footnote"><span>{last.cooperativeActions} successful cooperative actions</span><span>{last.hungry} hungry citizens</span><span>Order {last.stabilityDelta>=0?'+':''}{formatNumber(last.stabilityDelta)}</span></div>}
 {world.history.length>1&&<div className="civic-trajectory" aria-label="Recent civic history">{world.history.slice(-3).map(e=><span key={e.day}>D{e.day} · {e.civic.outcome}</span>)}</div>}
 </section>
}
export function CivicRipples({worlds}:{worlds:[World,World]}){
 return <div className="civic-ripples">{worlds.map((w,i)=><div className="civic-chain" key={i}><span className="eyebrow">{i?'THE WHAT IF':'THE ORIGINAL'} · RECORDED RIPPLE</span><ol>{civicChain(w).map((line,j)=><li key={j}>{line}</li>)}</ol></div>)}<p>First-choice effects follow the game rules. Later actions are observed responses to each evolving world; their individual motives are not proven by this chain.</p></div>
}
export function SocialMemory({world,id}:{world:World;id:Id}){const p=world.people[id];return <div className="social-memory"><div className="trait-pills">{p.traits.map(t=><span key={t}>{t}</span>)}</div><h3>{characters[id].name}’s trust toward neighbors</h3><div className="relationship-list">{ids.filter(other=>other!==id).map(other=><div key={other}><span>{characters[other].name}</span><meter min="0" max="100" value={world.trust[id][other]} aria-label={`Trust toward ${characters[other].name}`}/><b>{formatNumber(world.trust[id][other])}</b></div>)}</div><p><b>Social memory:</b> {p.recentActions.length?p.recentActions.join(' → '):'A fresh start. No decisions yet.'}</p></div>}
