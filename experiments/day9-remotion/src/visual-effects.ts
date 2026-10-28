// Content-agnostic picture effects. Source clocks and subtitle overlays stay outside these transforms.
export type EffectType='hard_cut'|'crossfade'|'slide_in'|'blur_transition'|'zoom_in'|'whip_pan'|'zoom_blur'|'slide_wipe';
export interface Effect {type:EffectType;durationFrames:number;scaleFrom?:number;distancePx?:number;maxBlurPx?:number;widthPx?:number}
export interface PictureStyle {opacity:number;transform:string;filter:string;clipPath:string}
export const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
export function progress(frame:number,duration:number){return duration<=1?1:clamp01(frame/(duration-1));}
export function pictureStyle(effect:Effect,frame:number,incoming=true):PictureStyle{
 const p=progress(frame,effect.durationFrames),q=1-p,ease=1-q*q*q;
 const base:PictureStyle={opacity:1,transform:'none',filter:'none',clipPath:'none'};
 switch(effect.type){
  case 'hard_cut':return base;
  case 'crossfade':return {...base,opacity:incoming?p:1};
  case 'blur_transition':return {...base,opacity:incoming?p:1,filter:`blur(${(effect.maxBlurPx??9)*(incoming?q:p)}px)`};
  case 'slide_in':return {...base,opacity:incoming?p:1,transform:`translateX(${(effect.distancePx??48)*(incoming?1-ease:-ease)}px)`};
  case 'zoom_in':return {...base,transform:`scale(${1+((effect.scaleFrom??1.06)-1)*(1-ease)})`};
  case 'slide_wipe':return incoming?{...base,clipPath:`inset(0 ${100*(1-p)}% 0 0)`,transform:`translateX(${48*(1-ease)}px)`}:base;
  case 'whip_pan':{
   const e=p<.5?4*p*p*p:1-(-2*p+2)**3/2;
   const pulse=p===0||p===1?0:Math.sin(Math.PI*p);const scale=1+.08*pulse;
   return {...base,transform:`translateX(${(incoming?1-e:-e)*(effect.widthPx??1080)}px) scale(${scale})`,filter:`blur(${(effect.maxBlurPx??16)*pulse}px)`};
  }
  case 'zoom_blur':return {...base,opacity:incoming?p:1,transform:`scale(${incoming?1+.28*(1-ease):1+.20*ease})`,filter:`blur(${(effect.maxBlurPx??18)*(incoming?q:Math.sin(Math.PI*p))}px)`};
 }
}
export function sourceFrame(frame:number,from:number,to:number){return Math.max(0,Math.min(to-from-1,frame-from));}
