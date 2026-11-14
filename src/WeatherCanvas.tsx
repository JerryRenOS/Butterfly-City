import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DisasterState } from './disasters';
import { makeWeatherTextures, renderWeather } from './weatherRenderer';
import { weatherVisuals } from './weatherVisuals';

type Props = { disaster: DisasterState; day: number; paused?: boolean; reducedMotion?: boolean; children: ReactNode };

/** Two transparent depth planes; neither can intercept citizen or HUD clicks. */
export function WeatherCanvas({ disaster, day, paused=false, reducedMotion=false, children }: Props) {
  const backRef=useRef<HTMLCanvasElement>(null), frontRef=useRef<HTMLCanvasElement>(null);
  const settings=useRef({disaster,day,paused,reducedMotion});
  const refreshRef=useRef<(()=>void)|null>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{settings.current={disaster,day,paused,reducedMotion};refreshRef.current?.()},[disaster,day,paused,reducedMotion]);
  useEffect(()=>{
    const back=backRef.current,front=frontRef.current;
    if(!back||!front)return;
    const b=back.getContext('2d'),f=front.getContext('2d');
    if(!b||!f)return;
    let textures:ReturnType<typeof makeWeatherTextures>;
    try { textures=makeWeatherTextures(); } catch { return; }
    let frame=0,previous=0,time=4.2,width=1,height=1,visible=true,disposed=false;
    const draw=()=>{
      if(disposed)return;
      const s=settings.current;
      renderWeather(b,f,width,height,time,weatherVisuals(s.disaster,s.day),textures);
      back.dataset.frameTime=time.toFixed(3);
    };
    const moving=()=>!disposed&&visible&&!document.hidden&&!settings.current.paused&&!settings.current.reducedMotion;
    const tick=(now:number)=>{
      frame=0;if(!moving())return;
      if(!previous||now-previous>=1000/30){time+=previous?Math.min(.1,(now-previous)/1000):0;previous=now;draw();}
      frame=requestAnimationFrame(tick);
    };
    const refresh=()=>{
      cancelAnimationFrame(frame);previous=0;
      back.dataset.motion=settings.current.reducedMotion?'reduced':settings.current.paused?'paused':visible&&!document.hidden?'running':'suspended';
      draw();if(moving())frame=requestAnimationFrame(tick);
    };
    const resize=()=>{
      const rect=back.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      const scale=Math.min(window.devicePixelRatio||1,1.25,1400/width,900/height);
      for(const [canvas,context] of [[back,b],[front,f]] as const){canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);context.setTransform(scale,0,0,scale,0,0);}
      draw();
    };
    const observer=new ResizeObserver(resize);observer.observe(back);
    const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;refresh()});
    intersection?.observe(back);
    document.addEventListener('visibilitychange',refresh);
    refreshRef.current=refresh;resize();setReady(true);refresh();
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection?.disconnect();document.removeEventListener('visibilitychange',refresh);refreshRef.current=null;};
  },[]);
  return <div className="weather-renderer" data-renderer={ready?'canvas':'fallback'} aria-hidden="true">
    {children}
    <canvas ref={backRef} className="weather-volume" style={{opacity:ready?1:0}}/>
    <canvas ref={frontRef} className="weather-foreground" style={{opacity:ready?1:0}}/>
  </div>;
}
