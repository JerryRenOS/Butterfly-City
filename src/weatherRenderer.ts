import { weatherRandom as random, wrap, type WeatherVisuals } from './weatherVisuals';

type Context = CanvasRenderingContext2D;
export type WeatherTextures = { cloud: HTMLCanvasElement; dust: HTMLCanvasElement; mist: HTMLCanvasElement; turbulence: HTMLCanvasElement };
const TAU = Math.PI * 2;

/** Soft, internally textured cloud billows are cached once, not blurred every frame. */
export function makeWeatherTextures(): WeatherTextures {
  const make = (color: string) => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 160;
    const c = canvas.getContext('2d')!;
    for (let i = 0; i < 72; i++) {
      const x = 45 + random(i, 1) * 166, y = 39 + random(i, 2) * 80;
      const radius = 17 + random(i, 3) * 43;
      const g = c.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `rgba(${color},.15)`); g.addColorStop(.35, `rgba(${color},.1)`); g.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = g; c.fillRect(x-radius, y-radius, radius*2, radius*2);
    }
    return canvas;
  };
  const turbulence=document.createElement('canvas');turbulence.width=128;turbulence.height=256;
  const context=turbulence.getContext('2d')!,pixels=context.createImageData(128,256);
  const noise=(x:number,y:number,grid:number)=>{
    const px=x*grid,py=y*grid,ix=Math.floor(px),iy=Math.floor(py);
    let fx=px-ix,fy=py-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
    const at=(a:number,b:number)=>random(wrap(a,grid)+wrap(b,grid)*grid,81+grid);
    return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
  };
  for(let y=0;y<256;y++)for(let x=0;x<128;x++){
    const n=noise(x/128,y/256,8)*.55+noise(x/128,y/256,16)*.3+noise(x/128,y/256,32)*.15;
    const i=(y*128+x)*4,v=Math.max(0,Math.min(255,(n-.25)*410));
    pixels.data[i]=v*.85;pixels.data[i+1]=v*.94;pixels.data[i+2]=v;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  return { cloud: make('92,110,117'), dust: make('126,111,87'), mist: make('222,235,238'), turbulence };
}

function ellipse(c: Context, x: number, y: number, rx: number, ry: number, color: string) {
  c.beginPath(); c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU); c.fillStyle=color; c.fill();
}

function ceiling(c: Context, w: number, h: number, t: number, p: WeatherVisuals, textures: WeatherTextures) {
  if (!p.active) return;
  const winter = p.type === 'snowstorm';
  const sky = c.createLinearGradient(0,0,0,h*.8);
  sky.addColorStop(0,winter?'rgba(111,139,155,.55)':'rgba(14,31,42,.72)');
  sky.addColorStop(.4,winter?'rgba(164,191,201,.2)':'rgba(28,48,57,.27)'); sky.addColorStop(1,'rgba(40,57,68,0)');
  c.fillStyle=sky; c.fillRect(0,0,w,h*.8);
  for(let i=0;i<9;i++) {
    const x=wrap(i*w/6-t*(winter?12:23),w*1.7)-w*.35;
    const y=-h*.25+Math.sin(i*3+t*.2)*h*.05;
    c.globalAlpha=(winter?.38:.46)*(.6+p.strength*.4);
    c.drawImage(winter?textures.mist:textures.cloud,x,y,w*.62,h*.62);
  }
  c.globalAlpha=1;
}

function rain(c: Context,w:number,h:number,t:number,p:WeatherVisuals,front:boolean) {
  if(!p.active||p.type==='snowstorm')return;
  const count=Math.round((front?38:150)*Math.min(1,w/650)*(.55+p.strength*.45));
  const dx=p.type==='tornado'?-1:-.55;
  for(let i=0;i<count;i++) {
    const depth=.3+random(i,7)*.7, speed=(front?490:280)*depth;
    const y=wrap(random(i,8)*h+t*speed,h+100)-50;
    const x=wrap(random(i,9)*w+t*speed*dx,w+140)-70;
    const length=(front?38:23)*depth;
    c.strokeStyle=`rgba(198,221,230,${(front?.18:.25)*depth})`; c.lineWidth=front?1.1:.65;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+dx*length,y+length); c.stroke();
  }
  if(!front)for(let i=0;i<30;i++) {
    const age=wrap(t*1.4+random(i,10),1), x=random(i,11)*w, y=(.72+random(i,12)*.27)*h;
    c.strokeStyle=`rgba(213,231,229,${(1-age)*.23})`;c.lineWidth=.7;
    c.beginPath();c.ellipse(x,y,1+age*11,1+age*2.4,0,0,TAU);c.stroke();
  }
}

function tornado(c:Context,w:number,h:number,t:number,p:WeatherVisuals,tex:WeatherTextures) {
  // The winding column connects the low cloud ceiling to a visibly disturbed patch of ground.
  const height=h*.83, baseY=h*.79;
  const center=(v:number)=>w*(.29+.023*Math.sin(t*.37+v*4)+.025*v*v);
  const radius=(v:number)=>w*(.014+.153*Math.pow(1-v,1.65));
  if(p.active) {
    const column=c.createLinearGradient(w*.11,0,w*.49,0);
    column.addColorStop(0,'rgba(142,159,161,.05)');column.addColorStop(.28,'rgba(84,104,113,.72)');
    column.addColorStop(.54,'rgba(33,51,64,.91)');column.addColorStop(.78,'rgba(121,141,146,.72)');column.addColorStop(1,'rgba(172,182,176,0)');
    c.beginPath();
    for(let j=0;j<=56;j++){const v=j/56; const x=center(v)-radius(v)*(1+.09*Math.sin(j*.8+t*3));const y=baseY-height*(1-v);j?c.lineTo(x,y):c.moveTo(x,y);}
    for(let j=56;j>=0;j--){const v=j/56;c.lineTo(center(v)+radius(v)*(1+.08*Math.sin(j*.9+t*3+2)),baseY-height*(1-v));}
    c.closePath();c.fillStyle=column;c.fill();
    c.save();c.clip();
    for(let j=0;j<76;j++) {
      const v=j/75,y=baseY-height*(1-v),r=radius(v);
      const sx=wrap(t*(25+v*18)+v*100,128),sy=wrap(v*220-t*21,240);
      c.globalAlpha=.57;
      c.drawImage(tex.turbulence,sx,sy,128-sx,3,center(v)-r,y,(128-sx)/128*r*2,height/75+.12);
      c.drawImage(tex.turbulence,0,sy,sx,3,center(v)-r+(128-sx)/128*r*2,y,sx/128*r*2,height/75+.12);
      const volume=c.createLinearGradient(center(v)-r,0,center(v)+r,0);
      volume.addColorStop(0,'rgba(182,196,198,.08)');volume.addColorStop(.27,'rgba(26,43,54,.56)');volume.addColorStop(.66,'rgba(168,188,190,.24)');volume.addColorStop(1,'rgba(20,40,52,.18)');
      c.globalAlpha=1;c.fillStyle=volume;c.fillRect(center(v)-r,y,r*2,height/75+.12);
    }
    c.restore();
    for(let j=0;j<24;j++) {
      const v=j/24, y=baseY-height*(1-v), r=radius(v),angle=t*4-v*20;
      c.globalAlpha=.32;
      c.drawImage(tex.cloud,center(v)-r*1.35+Math.sin(angle)*r*.2,y-h*.05,r*2.7,h*.11);
    }
    c.globalAlpha=1;
    for(let i=0;i<74;i++) {
      const v=wrap(random(i,13)-t*(.04+random(i,14)*.05),1);
      const angle=t*(5+random(i,15)*3)+i*2.4;
      const orbit=radius(v)*(1.05+random(i,16)*.4);
      const x=center(v)+Math.cos(angle)*orbit, y=baseY-height*(1-v)+Math.sin(angle)*orbit*.17;
      const size=1+random(i,17)*4;
      c.save();c.translate(x,y);c.rotate(angle*2);c.globalAlpha=Math.sin(Math.PI*v)*(.32+.6*(Math.sin(angle)+1)/2);
      c.fillStyle=i%3?'#776b51':'#bdad87';c.fillRect(-size,-size*.25,size*2,size*.5);c.restore();
    }
    for(let i=0;i<13;i++) {
      const angle=t*1.6+i*TAU/13;
      c.globalAlpha=.25+random(i,18)*.19;
      c.drawImage(tex.dust,center(1)+Math.cos(angle)*w*.08-w*.13,baseY-h*.095+Math.sin(angle)*h*.023,w*.26,h*.16);
    }
    c.globalAlpha=1;
  }
  // Debris remains after the funnel clears, and disappears with actual repairs.
  for(let i=0;i<Math.ceil(p.damage*20);i++) {
    const x=(.07+random(i,19)*.87)*w,y=(.74+random(i,20)*.22)*h;
    c.save();c.translate(x,y);c.rotate(random(i,21)*3);c.fillStyle='#5e5749';c.fillRect(-6,-1,12+random(i,22)*10,2.2);c.restore();
  }
}

function flood(c:Context,w:number,h:number,t:number,p:WeatherVisuals,tex:WeatherTextures,front:boolean) {
  if(!p.waterDepth)return;
  const level=h*(1-p.waterDepth), swell=p.active?(10+Math.sin(t*.55)*6)*p.strength:2;
  const surface=(x:number)=>level+Math.sin(x/w*8-t*1.8)*swell+Math.sin(x/w*21+t*2.3)*swell*.24;
  if(front) {
    // Thin foreground wash immerses feet without covering faces or name labels.
    const wash=c.createLinearGradient(0,h*.75,0,h);
    wash.addColorStop(0,'rgba(99,159,168,0)');wash.addColorStop(1,`rgba(66,113,128,${p.damage*.62})`);
    c.fillStyle=wash;c.fillRect(0,h*.75,w,h*.25);return;
  }
  const body=c.createLinearGradient(0,level,0,h);
  body.addColorStop(0,'rgba(105,155,158,.53)');body.addColorStop(.25,'rgba(35,96,112,.81)');body.addColorStop(1,'rgba(19,64,84,.94)');
  c.beginPath();c.moveTo(0,h);for(let x=0;x<=w+10;x+=10)c.lineTo(x,surface(x));c.lineTo(w,h);c.closePath();c.fillStyle=body;c.fill();
  for(let row=0;row<13;row++) {
    const depth=row/12, y=level+depth*(h-level);
    c.beginPath();for(let x=-20;x<=w+20;x+=12){const py=y+Math.sin(x*(.018-depth*.006)-t*(1+depth*2)+row)* (2+depth*5);x===-20?c.moveTo(x,py):c.lineTo(x,py);}
    c.strokeStyle=row%3?`rgba(164,207,208,${.09+depth*.08})`:'rgba(14,57,76,.27)';c.lineWidth=row%3?1:3;c.stroke();
  }
  if(p.active) {
    // A broad turbulent bore, not a single cartoon curling wave, crosses the square.
    for(let wave=0;wave<2;wave++){
    const surge=wrap(t*.12+wave*.5,1), crestY=level-h*.38+surge*h*.48;
    const fade=Math.sin(Math.PI*surge)*(.65+p.strength*.35);
    const crest=(x:number)=>crestY+Math.sin(x/w*11-t*2.4)*h*.035+Math.sin(x/w*27+t)*h*.014;
    const face=c.createLinearGradient(0,crestY,0,h);
    face.addColorStop(0,`rgba(92,153,164,${fade*.86})`);face.addColorStop(.28,`rgba(25,79,102,${fade*.9})`);face.addColorStop(1,`rgba(29,83,105,${fade*.45})`);
    c.beginPath();c.moveTo(-5,h);for(let x=-5;x<=w+15;x+=10)c.lineTo(x,crest(x));c.lineTo(w+15,h);c.closePath();c.fillStyle=face;c.fill();
    for(let i=0;i<115;i++) {
      const x=random(i,23)*w, y=crest(x)+Math.sin(i*2+t*3)*8;
      const r=1+random(i,24)*6;
      ellipse(c,x,y,r*2,r*.55,`rgba(213,233,226,${fade*(.25+random(i,25)*.4)})`);
      if(i%3===0){const age=wrap(t*.8+random(i,26),1);ellipse(c,x+age*24,y-Math.sin(age*Math.PI)*h*.09,r*.24,r*.6,`rgba(231,243,234,${fade*(1-age)*.55})`);}
    }
    for(let i=0;i<20;i++){
      const x=i*w/19, y=crest(x);
      c.globalAlpha=fade*(.4+random(i,48)*.2);
      c.drawImage(tex.mist,x-w*.055,y-h*.07,w*.11,h*.14);
    }
    c.globalAlpha=fade*.34;c.drawImage(tex.mist,0,crestY-h*.12,w,h*.22);c.globalAlpha=1;
    }
  }
  for(let i=0;i<70;i++) {
    const depth=random(i,27),x=wrap(random(i,28)*w+t*(20+depth*55),w);
    const y=level+8+depth*(h-level-8)+Math.sin(t*2+i)*3;
    c.strokeStyle=`rgba(213,236,227,${.12+depth*.23})`;c.lineWidth=.7+depth;
    c.beginPath();c.ellipse(x,y,4+depth*16,1+depth*2,Math.sin(i)*.1,0,Math.PI*1.4);c.stroke();
  }
  for(let i=0;i<Math.ceil(p.damage*8);i++) {
    const x=wrap(random(i,29)*w+t*(12+i*2),w+40)-20,y=level+(h-level)*(.25+random(i,30)*.6)+Math.sin(t*2+i)*3;
    c.save();c.translate(x,y);c.rotate(Math.sin(t+i)*.12);ellipse(c,0,4,14,3,'rgba(11,44,52,.24)');c.fillStyle=i%2?'#7d7157':'#a08e68';c.fillRect(-10,-2,20,4);c.restore();
  }
}

function snow(c:Context,w:number,h:number,t:number,p:WeatherVisuals,tex:WeatherTextures,front:boolean) {
  if(!front&&p.snowCover>0) {
    const ground=c.createLinearGradient(0,h*.62,0,h);
    ground.addColorStop(0,'rgba(216,232,236,0)');ground.addColorStop(.4,`rgba(209,228,233,${p.snowCover*.25})`);ground.addColorStop(1,`rgba(226,239,240,${p.snowCover*.86})`);
    c.fillStyle=ground;c.fillRect(0,h*.62,w,h*.38);
    for(let i=0;i<9;i++) {
      const x=random(i,31)*w,y=(.77+random(i,32)*.22)*h;
      const width=w*(.04+random(i,33)*.075)*p.snowCover;
      const drift=c.createLinearGradient(0,y-15,0,y+7);drift.addColorStop(0,'#f1f5f1');drift.addColorStop(1,'#9cbbc9');
      const rise=(12+random(i,34)*25)*p.snowCover;
      c.beginPath();c.moveTo(x-width,y+2);c.bezierCurveTo(x-width*.65,y-rise*.3,x-width*.35,y-rise,x+width*.16,y-rise*.72);c.bezierCurveTo(x+width*.65,y-rise*.95,x+width*.9,y-3,x+width,y+1);c.quadraticCurveTo(x+width*.3,y+5,x-width,y+2);c.closePath();c.fillStyle=drift;c.fill();
      c.globalAlpha=.3*p.snowCover;c.drawImage(tex.mist,x-width*1.15,y-rise*.25,width*2.3,rise*.75);c.globalAlpha=1;
    }
  }
  if(!p.active)return;
  const count=Math.round((front?90:480)*Math.min(1,w/620)*(.65+p.strength*.35));
  const gust=.8+Math.sin(t*.63)*.23+Math.sin(t*1.4)*.12;
  for(let i=0;i<count;i++) {
    const depth=.25+random(i,35)*.75, speed=(front?210:110)*depth*p.wind;
    const x=wrap(random(i,36)*w-t*speed*1.8-Math.sin(t*.8+i)*20,w+80)-40;
    const y=wrap(random(i,37)*h+t*speed*.65+Math.sin(t+i)*5,h+60)-30;
    const size=(front?6:2.8)*depth;
    c.strokeStyle=`rgba(239,247,246,${(front?.7:.85)*depth})`;c.lineWidth=size;
    c.beginPath();c.moveTo(x,y);c.lineTo(x-(front?12:6)*depth*gust,y+depth*2);c.stroke();
    if(front&&i%4===0)ellipse(c,x,y,size*1.3,size,'rgba(242,248,247,.2)');
  }
  if(!front)for(let i=0;i<4;i++) {
    const x=wrap(i*w*.5-t*70,w*2)-w*.65;
    c.globalAlpha=(.24+Math.sin(t*.65+i)*.09)*p.strength;
    c.drawImage(tex.mist,x,h*(.3+i*.14),w*.95,h*.38);
  }
  c.globalAlpha=1;
}

export function renderWeather(back:Context,front:Context,w:number,h:number,t:number,p:WeatherVisuals,textures:WeatherTextures) {
  back.clearRect(0,0,w,h); front.clearRect(0,0,w,h);
  ceiling(back,w,h,t,p,textures);
  if(p.type==='tornado')tornado(back,w,h,t,p,textures);
  if(p.type==='tsunami'){flood(back,w,h,t,p,textures,false);flood(front,w,h,t,p,textures,true);}
  if(p.type==='snowstorm'){snow(back,w,h,t,p,textures,false);snow(front,w,h,t,p,textures,true);}
  rain(back,w,h,t,p,false);rain(front,w,h,t,p,true);
}
