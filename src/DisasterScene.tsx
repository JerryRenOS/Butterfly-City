import { useId, type CSSProperties } from 'react';
import { disasters, disasterConditions, type DisasterState } from './disasters';

/** Decorative weather follows the shared calendar; lingering damage follows actual repair state. */
export function DisasterScene({ disaster, day }: { disaster: DisasterState; day: number }) {
  const funnelId = useId();
  const weather = disasterConditions(disaster, day);
  const active = weather.intensity > 0;
  return <div className={`disaster-scenery weather-${disaster.type} ${active ? 'weather-active' : 'weather-clearing'}`} style={{ '--damage': disaster.damage / 100 } as CSSProperties} aria-hidden="true">
    <div className="storm-clouds" />
    <div className="cloud-shadows"><i/><i/></div>
    <div className="passing-air">{Array.from({length:active?18:9},(_,i)=><i key={i} style={{'--air':i,top:`${22+i*19%70}%`} as CSSProperties}/>)}</div>
    {active&&disaster.type!=='snowstorm'&&<div className="wind-rain">{Array.from({length:28},(_,i)=><i key={i} style={{'--rain':i,left:`${i*37%120-10}%`,top:`${i*23%110-10}%`} as CSSProperties}/>)}</div>}
    {disaster.type === 'tornado' && <>
      {active && <><svg className="tornado-funnel" viewBox="0 0 240 330"><defs><linearGradient id={funnelId} x1="0" x2="1"><stop stopColor="#bcc2b7" stopOpacity=".15"/><stop offset=".3" stopColor="#6d7b77" stopOpacity=".8"/><stop offset=".62" stopColor="#3b5054" stopOpacity=".85"/><stop offset="1" stopColor="#b5bfb4" stopOpacity=".12"/></linearGradient></defs><path d="M10 20 Q110 5 230 25 Q166 123 143 190 Q107 245 131 313 Q95 272 101 206 Q77 115 10 20Z" fill={`url(#${funnelId})`} />{Array.from({ length: 19 }, (_, i) => <ellipse key={i} cx={120 + Math.sin(i) * 7} cy={25 + i * 15} rx={105 - i * 5.1} ry={12 - i * .35} fill="none" stroke={i % 2 ? '#c5c4ad' : '#394f50'} strokeOpacity=".25" strokeWidth="8" style={{ '--gust': i } as CSSProperties} />)}</svg><div className="vortex-dust">{Array.from({length:14},(_,i)=><i key={i} style={{'--debris':i,top:`${17+i*4.2}%`} as CSSProperties}/>)}</div></>}
      <div className="storm-debris">{Array.from({ length: Math.ceil(disaster.damage / 12) }, (_, i) => <i key={i} style={{ left: `${12 + i * 9}%`, top: `${70 + i % 3 * 6}%`, rotate: `${i * 31}deg` }} />)}</div>
      {active && <div className="wind-streaks">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--flake': i } as CSSProperties} />)}</div>}
    </>}
    {disaster.type === 'tsunami' && <>
      <div className="flood-water"><i /><i /><i /><div className="water-currents">{Array.from({length:16},(_,i)=><b key={i} style={{'--current':i,top:`${i*23%95}%`,left:`${i*37%110-10}%`} as CSSProperties}/>)}</div>{disaster.damage>0&&<div className="floating-debris"><b/><b/><b/></div>}</div>
      {active && <svg className="surge-wave" viewBox="0 0 800 230" preserveAspectRatio="none"><path d="M0 155 C100 110 190 200 280 115 S430 40 460 95 C420 20 530 -25 580 52 C550 17 511 75 557 105 C680 147 710 130 800 162 V230 H0Z" fill="#476e79" /><path d="M0 155 C100 110 190 200 280 115 S430 40 460 95 C420 20 530 -25 580 52" fill="none" stroke="#d2e2db" strokeWidth="9" opacity=".65" /></svg>}
    </>}
    {disaster.type === 'snowstorm' && <>
      <div className="snow-cover" />
      <div className="snow-drifts">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ left: `${8 + i * 16}%`, bottom: `${4 + i % 3 * 9}%`, scale: `${.4 + disaster.damage / 90}` }} />)}</div>
      {active && <div className="falling-snow">{Array.from({ length: 32 }, (_, i) => <i key={i} style={{ '--flake': i, left: `${i * 31 % 100}%`, top: `${i * 17 % 100}%` } as CSSProperties} />)}</div>}
    </>}
  </div>;
}

export function DisasterBadge({ disaster, day }: { disaster: DisasterState; day: number }) {
  const weather = disasterConditions(disaster, day);
  return <div className="disaster-badge"><span aria-hidden="true">{disasters[disaster.type].symbol}</span><div><b>{weather.phase}</b><small>{Math.round(disaster.damage)} / 100 damage</small></div></div>;
}
