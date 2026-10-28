import type {ReactNode} from 'react';
import {AbsoluteFill, Audio, Composition, Freeze, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Method,Captions,type CaptionCue} from './PocShared';
import timeline from './generated/vp006-timeline.json';
import config from './generated/vp006-r1-effects.json';
import {Effect, pictureStyle, progress, sourceFrame} from './visual-effects';
export function Scene({id,showSceneBadge=false,methodLayout='legacy'}:{id:string;showSceneBadge?:boolean;methodLayout?:'legacy'|'centered'}){
 if(id==='night')return <Img src={staticFile('vp006/night.png')} style={{width:'100%',height:'100%',objectFit:'cover'}}/>;
 if(id==='fatigue')return <><OffthreadVideo src={staticFile('vp006/fatigue.mp4')} startFrom={60} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>{showSceneBadge&&<div style={{position:'absolute',right:65,top:240,color:'#dde6ff',fontSize:27,background:'#0a1028b0',padding:'10px 18px',borderRadius:9}}>情境示意</div>}</>;
 return <Method layout={methodLayout}/>;
}
export function PocMotionSample({effects=config,showBrand=false,showSceneBadge=false,methodLayout='legacy',renderScene,extraOverlay,background,audioSrc=staticFile('vp006/voice.wav'),captionOffsetSeconds=timeline.globalStartSeconds,captions}:{effects?:typeof config;showBrand?:boolean;showSceneBadge?:boolean;methodLayout?:'legacy'|'centered';renderScene?:(id:string)=>ReactNode;extraOverlay?:ReactNode;background?:ReactNode;audioSrc?:string;captionOffsetSeconds?:number;captions?:CaptionCue[]}){
 const f=useCurrentFrame();return <AbsoluteFill style={{fontFamily:'Day9Chinese,sans-serif',background:'#0a1028'}}>
 {background??effects.scenes.map(s=>{
  const enter=effects.transitions.find(t=>t.boundaryFrame===s.from);
  const exit=effects.transitions.find(t=>t.boundaryFrame===s.to);
  const begin=enter?enter.startFrame:s.from;const end=exit?exit.startFrame+exit.durationFrames:s.to;
  if(f<begin||f>=end)return null;
  const local=sourceFrame(f,s.from,s.to);const p=progress(local,s.to-s.from);
  const entry=pictureStyle(s.entry as Effect,local);
  const tstyle=enter?pictureStyle(enter as Effect,f-enter.startFrame):pictureStyle({type:'hard_cut',durationFrames:0},0);
  const exitStyle=exit&&f>=exit.startFrame?pictureStyle(exit as Effect,f-exit.startFrame,false):{filter:'none'};
  const boundaryStyle=enter&&f<enter.startFrame+enter.durationFrames?tstyle:exit&&f>=exit.startFrame?exitStyle:tstyle;
  const motion=`translate(${s.motion.panX*p}px,${s.motion.panY*p}px) scale(${s.motion.scaleFrom+(s.motion.scaleTo-s.motion.scaleFrom)*p})`;
  return <Sequence key={s.id} from={begin} durationInFrames={end-begin}><AbsoluteFill style={boundaryStyle}><AbsoluteFill style={entry}><AbsoluteFill style={{transform:motion}}><Freeze frame={local}>{renderScene?renderScene(s.id):<Scene id={s.id} showSceneBadge={showSceneBadge} methodLayout={methodLayout}/>}</Freeze></AbsoluteFill></AbsoluteFill></AbsoluteFill></Sequence>;
 })}
 <AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,#070b20c9,transparent 24%,transparent 76%,#070b20a0)'}}/>
 {showBrand&&<><div style={{position:'absolute',top:125,left:80,fontSize:40,color:'#e2e8ff',letterSpacing:3}}>小陈AI说</div><div style={{position:'absolute',top:202,left:80,width:260,height:4,background:'linear-gradient(90deg,#68d5ff,#ab95ff)'}}/></>}
 {extraOverlay}<Audio src={audioSrc}/><Captions enabled timeOffsetSeconds={captionOffsetSeconds} cues={captions}/></AbsoluteFill>
}
export const Vp006R1Root=()=> <Composition id="Day9AssetPocR1" component={PocMotionSample} defaultProps={{showBrand:true,showSceneBadge:true}} durationInFrames={546} fps={30} width={1080} height={1920}/>;
