import './character.css';

export type CharacterExpression = 'idle' | 'happy' | 'shocked' | 'angry' | 'thinking' | 'walking';
type Props = { id: string; size?: number; mood?: number; expression?: CharacterExpression };
const colors: Record<string, { skin: string; hair: string; coat: string; dark: string; light: string }> = {
  bob: { skin: '#ffd3a0', hair: '#82452e', coat: '#f16b35', dark: '#b5432e', light: '#ffb54a' },
  alice: { skin: '#ffe0b7', hair: '#75412f', coat: '#f48da8', dark: '#c84974', light: '#ffccd3' },
  kevin: { skin: '#f2c99c', hair: '#443847', coat: '#9270c7', dark: '#634b92', light: '#c8a8ef' },
  mia: { skin: '#bc7750', hair: '#302c38', coat: '#24ac9f', dark: '#167c78', light: '#ffce4c' },
};

/** Original human paper-cutout adventurers. No external artwork or character assets. */
export function CharacterPortrait({ id, size = 100, mood = 65, expression }: Props) {
  const who = colors[id] ? id : 'bob';
  const p = colors[who];
  const face = expression || (mood < 32 ? 'angry' : mood > 78 ? 'happy' : 'idle');
  const startled = face === 'shocked';
  const thinking = face === 'thinking';
  const angry = face === 'angry';
  const happy = face === 'happy';
  return <svg className={`paper-person person-${who} expression-${face}`} viewBox="0 0 150 180" width={size} height={size * 1.2} aria-hidden="true" focusable="false">
    <ellipse className="person-shadow" cx="76" cy="169" rx="39" ry="7" fill="#253b3529" />
    <g className="person-cutout" stroke="#302c36" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      {who === 'alice' && <path d="M41 61Q19 88 31 118l17-7 46 5 19 8q12-35-8-68Z" fill={p.hair} />}
      {who === 'mia' && <path d="M105 44q32 5 24 31l-8-5 8 21-19-3-9-26" fill={p.hair} />}
      <g className="person-leg leg-left"><path d="M51 143l-2 18 20 1 2-19" fill={who === 'alice' ? '#fff1dc' : '#4a4154'} /><path d="M48 157q-10 7-8 12h31v-13" fill={who === 'mia' ? '#704930' : p.dark} /><path d="M43 168h27" stroke="#f9e8c9" strokeWidth="2.3" /></g>
      <g className="person-leg leg-right"><path d="M82 143l1 19 20-1-3-18" fill={who === 'alice' ? '#fff1dc' : '#4a4154'} /><path d="M82 157v12h31q1-8-12-13" fill={who === 'mia' ? '#704930' : p.dark} /><path d="M85 168h25" stroke="#f9e8c9" strokeWidth="2.3" /></g>
      <g className="person-arm arm-left"><path d="M45 105q-14 0-20 24l13 6 18-20" fill={p.coat} /><path d="M27 126q-7 1-8 10-1 10 9 10 8-2 8-12" fill={p.skin} /><path d="M25 136l4 2" fill="none" strokeWidth="2" /></g>
      <g className="person-arm arm-right"><path d="M103 105q13 2 20 22l-13 8-18-20" fill={p.coat} /><path d="M113 130q12-9 17 0 6 12-3 16-7 2-13-7" fill={p.skin} /><path d="M124 135l-5 3" fill="none" strokeWidth="2" /></g>
      <path d={who === 'alice' ? 'M48 99h51l15 50q-39 14-76 0Z' : 'M48 98q27-10 52 0l9 51q-35 10-68 0Z'} fill={p.coat} />
      <path d="M47 144q29 8 58 0" fill="none" stroke={p.dark} strokeWidth="5" />
      {who === 'bob' && <><path d="M48 103l20 18 7-16 8 16 19-18" fill={p.light} /><path d="M75 111v40" fill="none" /><path d="M51 132h13v10H51m35-10h13v10H86" fill={p.dark} strokeWidth="2.2" /><circle cx="79" cy="129" r="2" fill="#ffe7a1" stroke="none" /><circle cx="79" cy="140" r="2" fill="#ffe7a1" stroke="none" /></>}
      {who === 'alice' && <><path d="M45 101q28 17 57-1l-6 14q-22 12-46 0Z" fill="#e84c79" /><path d="M88 110q-7 17 4 30l15-5-10-26" fill="#e84c79" /><path d="M96 131l7-2" stroke="#ffb1bd" strokeWidth="3" /><path d="M65 128q-8-9-12 0-2 8 13 17 16-11 12-18-5-8-12 1Z" fill="#fff2d6" strokeWidth="2.2" /></>}
      {who === 'kevin' && <><path d="M48 100l17 17 11-13 10 13 17-17" fill="#f7df9d" /><path d="M76 106v45" /><path d="M87 125h13v14H87Z" fill={p.light} strokeWidth="2.1" /><path d="M90 125v-8m6 8v-10" stroke="#e7c659" strokeWidth="3" /><circle cx="68" cy="126" r="2" fill="#f8e8be" stroke="none" /><circle cx="68" cy="139" r="2" fill="#f8e8be" stroke="none" /></>}
      {who === 'mia' && <><path d="M49 102l26 15 23-15-8 22H62Z" fill={p.light} /><path d="M75 119v31" /><path d="M101 101l-49 51" stroke="#342f35" strokeWidth="9" /><path d="M101 101l-49 51" stroke="#b97a3a" strokeWidth="5" /><rect x="31" y="132" width="29" height="25" rx="6" fill="#b87839" /><path d="M31 136q14 18 29 0" fill="#e0a34f" /><rect x="42" y="139" width="7" height="7" rx="1" fill="#ffe482" strokeWidth="2" /></>}
      <g className="person-head">
        {/* Visible round human ears, neck and oversized face. */}
        <path d="M63 91v13q13 9 25 0V91" fill={p.skin} />
        <ellipse cx="33" cy="67" rx="9" ry="12" fill={p.skin} /><ellipse cx="116" cy="67" rx="9" ry="12" fill={p.skin} />
        <path d="M34 57Q33 22 75 21q43 0 43 36l-2 23q-3 24-40 25-36-1-40-25Z" fill={p.skin} />
        <path d="M36 66l-4-15q0-34 42-34 37-1 43 26l-1 22-10-17q-25 3-34-13-5 18-26 20l-4 13" fill={p.hair} />
        {who === 'bob' && <><path d="M31 39Q25 16 57 10l39 2 19 21-27 11Z" fill="#f16a36" /><path d="M34 27q37-14 73 3" fill="none" stroke="#ffb65b" strokeWidth="4" /><path d="M30 36q44-12 89 2l4 10q-34 7-78-1l-18-3Z" fill="#f7923e" /><path d="M56 15l-3 10" fill="none" stroke="#b4472b" strokeWidth="2" /><path d="M72 23l4-7 5 7-5 7Z" fill="#ffe9a4" strokeWidth="2" /></>}
        {who === 'alice' && <><path d="M32 47q5-30 37-30 27-6 41 22-18-3-31-13-8 21-40 23" fill={p.hair} /><path d="M96 27q-7-17-16-9-5 9 10 14 8 17 18 8 8-9-12-13" fill="#ff8eac" /><circle cx="93" cy="29" r="5" fill="#ffe295" strokeWidth="2" /><path d="M39 55l-2 31m75-32 1 28" stroke="#9d5e3c" strokeWidth="4" /></>}
        {who === 'kevin' && <><path d="M37 34l9-20 24 1 8-9 27 14 6 19Z" fill="#8d6bc3" /><path d="M36 33q37-9 77 3l3 10q-43-8-82 0Z" fill="#b596df" /><path d="M88 15l8-9" /><circle cx="99" cy="5" r="4" fill="#f8d15b" strokeWidth="2" /><path d="M51 22l13 1m25-1 9 4" stroke="#dcc7ed" strokeWidth="3" /></>}
        {who === 'mia' && <><path d="M34 40q7-28 36-25 36-1 46 27-25 3-40-12-17 18-39 17" fill={p.hair} /><path d="M37 32q34-17 70 0l3 10q-35-16-74 0Z" fill={p.light} /><path d="M106 34l17-11-1 20-15-2" fill={p.light} /><path d="M118 43l6 10" stroke="#eebd3c" strokeWidth="5" /><circle cx="116" cy="79" r="5" fill="none" stroke="#ffd35b" strokeWidth="3" /></>}
        <g className="person-face">
          <ellipse cx="46" cy="81" rx="8" ry="4.3" fill="#ee8c7f" opacity=".55" stroke="none" /><ellipse cx="103" cy="81" rx="8" ry="4.3" fill="#ee8c7f" opacity=".55" stroke="none" />
          {happy ? <><path d="M48 68q7-11 14 0m26 0q7-11 14 0" fill="none" /></> : <><ellipse className="person-eye" cx="55" cy="69" rx={startled ? 5 : 3.7} ry={startled ? 7 : who === 'kevin' ? 5.3 : 5} fill="#302c36" stroke="none" /><ellipse className="person-eye" cx="95" cy="69" rx={startled ? 5 : 3.7} ry={startled ? 7 : 5} fill="#302c36" stroke="none" /><circle cx="56" cy="67" r="1.2" fill="#fff7dc" stroke="none" /><circle cx="96" cy="67" r="1.2" fill="#fff7dc" stroke="none" /></>}
          <path d={angry ? 'M47 55l15 6m26 0 15-6' : startled ? 'M47 51q8-6 15 0m26 0q8-6 15 0' : thinking || who === 'kevin' ? 'M46 57l14-5m29 3 14 5' : who === 'bob' ? 'M47 57l15 2m27-5 13-3' : 'M48 56q7-4 13 0m28 0q7-4 13 0'} fill="none" strokeWidth="3" />
          <path d="M74 70l-3 8 7 1" fill="none" stroke="#b57757" strokeWidth="2.2" />
          {startled ? <ellipse cx="76" cy="91" rx="6" ry="7" fill="#7d3d43" strokeWidth="2.5" /> : angry ? <path d="M65 93q11-9 22 0" fill="none" strokeWidth="2.8" /> : thinking || who === 'kevin' && !happy ? <path d="M65 90l8-2 7 3 7-2" fill="none" strokeWidth="2.5" /> : <><path d={who === 'bob' ? 'M61 86q16 6 30-2-5 17-19 13Z' : 'M63 86q12 6 25 0-2 15-14 14-9-1-11-14Z'} fill="#8a3e48" strokeWidth="2.5" /><path d="M66 88q11 4 20-1l-3 6H69Z" fill="#fff9e7" stroke="none" /></>}
          {who === 'kevin' && <><circle cx="54" cy="68" r="17" fill="#cfeafa" fillOpacity=".19" strokeWidth="3.7" /><circle cx="96" cy="68" r="17" fill="#cfeafa" fillOpacity=".19" strokeWidth="3.7" /><path d="M71 66q4-4 8 0m-42-3-7-3m83 3 7-3" fill="none" /><path d="M44 61l6-6m37 6 6-6" stroke="#fff9e7" strokeWidth="3" /></>}
          {who === 'bob' && <><circle cx="43" cy="80" r="1.2" stroke="none" fill="#aa6752" /><circle cx="48" cy="83" r="1.2" stroke="none" fill="#aa6752" /><circle cx="105" cy="80" r="1.2" stroke="none" fill="#aa6752" /></>}
        </g>
      </g>
    </g>
    {thinking && <g className="thought-motes" fill="#fff4ce" stroke="#302c36" strokeWidth="2"><circle cx="125" cy="40" r="3" /><circle cx="134" cy="28" r="5" /><circle cx="137" cy="12" r="8" /></g>}
    {startled && <g className="surprise-lines" stroke="#f5b53c" strokeWidth="4" strokeLinecap="round"><path d="M15 25l7 8m0-20 4 9m105-1 6-10" /></g>}
  </svg>;
}
export default CharacterPortrait;
