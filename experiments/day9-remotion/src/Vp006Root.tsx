import { AbsoluteFill, Audio, Composition, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Captions } from './Day9Full';
import timeline from './generated/vp006-timeline.json';
const cyan='#68d5ff',purple='#ab95ff';
import {Method} from "./PocShared";
export {Method} from "./PocShared";
function Sample(){
 const f=useCurrentFrame();return <AbsoluteFill style={{fontFamily:'Day9Chinese,sans-serif',background:'#0a1028'}}>
 <Sequence from={0} durationInFrames={107}><AbsoluteFill><Img src={staticFile('vp006/night.png')} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1+f/2700})`}}/></AbsoluteFill></Sequence>
 <Sequence from={107} durationInFrames={156}><OffthreadVideo src={staticFile('vp006/fatigue.mp4')} startFrom={60} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/><div style={{position:'absolute',right:65,top:240,color:'#dde6ff',fontSize:27,background:'#0a1028b0',padding:'10px 18px',borderRadius:9}}>情境示意</div></Sequence>
 <Sequence from={263} durationInFrames={283}><Method/></Sequence><AbsoluteFill style={{pointerEvents:'none',background:'linear-gradient(180deg,#070b20c9,transparent 24%,transparent 76%,#070b20a0)'}}/>
 <div style={{position:'absolute',top:125,left:80,fontSize:40,color:'#e2e8ff',letterSpacing:3}}>小陈AI说</div><div style={{position:'absolute',top:202,left:80,width:260,height:4,background:`linear-gradient(90deg,${cyan},${purple})`}}/>
 <Audio src={staticFile('vp006/voice.wav')}/><Captions enabled timeOffsetSeconds={timeline.globalStartSeconds}/></AbsoluteFill>
}
export const Vp006Root=()=> <Composition id="Day9AssetPoc" component={Sample} durationInFrames={546} fps={30} width={1080} height={1920}/>;
