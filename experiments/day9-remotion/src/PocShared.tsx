import {AbsoluteFill,interpolate,useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import timeline from './generated/timeline-vp005a.json';
// loadFont owns its delayRender handle; do not await module initialization.
void loadFont({family:'Day9Chinese',url:staticFile('wqy-zenhei.ttf'),format:'truetype'});
const T=timeline;
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const cyan='#68d5ff',purple='#ab95ff';
export interface MethodLabels {mainTitle:string;subTitle:string;foundationLabel:string;progressLabel:string;ceilingLabel:string}
const legacyLabels:MethodLabels={mainTitle:'先稳住身体',subTitle:'再谈进度',foundationLabel:'身体',progressLabel:'进度',ceilingLabel:'系统上限'};
export function Method({layout='legacy',labels=legacyLabels}:{layout?:'legacy'|'centered';labels?:MethodLabels}={}){
 const f=useCurrentFrame();const fill=interpolate(f,[0,75],[.18,.83],clamp);const baseWidth=interpolate(f,[110,145],[580,780],clamp);
 return <AbsoluteFill style={{background:'radial-gradient(ellipse at 80% 20%,#34316d,transparent 60%),#0a1028',color:'white'}}>
 <div style={{position:'absolute',top:layout==='centered'?280:320,left:layout==='centered'?80:100,right:layout==='centered'?80:undefined,textAlign:layout==='centered'?'center':undefined,fontSize:layout==='centered'?80:62,fontWeight:layout==='centered'?700:undefined,lineHeight:layout==='centered'?1.25:undefined,color:cyan}}>{labels.mainTitle}</div><div style={{position:'absolute',top:layout==='centered'?396:410,left:layout==='centered'?80:102,right:layout==='centered'?80:undefined,textAlign:layout==='centered'?'center':undefined,fontSize:layout==='centered'?48:42,color:'#c5c9e4'}}>{labels.subTitle}</div>
 <svg width="1080" height="1920" style={{position:'absolute',transform:layout==='centered'?'translateY(-70px)':undefined}}>
 <defs><linearGradient id="body"><stop stopColor="#237da2"/><stop offset="1" stopColor="#60d4dc"/></linearGradient><linearGradient id="progress"><stop stopColor="#47417e"/><stop offset="1" stopColor="#a28ce2"/></linearGradient></defs>
 {[0,1,2,3].map(i=><g key={i} opacity={.14+.86*interpolate(f,[80+i*27,104+i*27],[0,1],clamp)}><rect x={240+i*45} y={1125-i*130} width={600-i*90} height={100} rx="22" fill="url(#progress)" stroke="#c5b8ff" strokeWidth="2"/>{i<3&&<path d={`M 540 ${1112-i*130} v -26 m -12 12 l 12 -12 12 12`} stroke={purple} fill="none" strokeWidth="4"/>}</g>)}
 <rect x={(1080-baseWidth)/2} y="1260" width={baseWidth} height="230" rx="32" fill="#102d43" stroke={cyan} strokeWidth="3"/><rect x={(1080-baseWidth)/2+15} y={1475-200*fill} width={baseWidth-30} height={200*fill} rx="18" fill="url(#body)" opacity=".85"/><text x="540" y="1395" fill="white" fontFamily="Day9Chinese" fontSize="58" textAnchor="middle">{labels.foundationLabel}</text>
 <path d="M 165 720 H 915" stroke={cyan} strokeWidth="4" strokeDasharray="12 9" opacity={interpolate(f,[135,180],[0,1],clamp)}/><text x="540" y="675" fill={cyan} fontFamily="Day9Chinese" fontSize="46" textAnchor="middle" opacity={interpolate(f,[135,180],[0,1],clamp)}>{labels.ceilingLabel}</text><text x="540" y="1190" fill="#e1d8ff" fontFamily="Day9Chinese" fontSize="43" textAnchor="middle" opacity={interpolate(f,[100,140],[0,1],clamp)}>{labels.progressLabel}</text>
 </svg></AbsoluteFill>
}
export interface CaptionCue {startSeconds:number;endSeconds:number;text:string}
export function Captions({enabled,timeOffsetSeconds=0,cues=T.captions}:{enabled:boolean;timeOffsetSeconds?:number;cues?:CaptionCue[]}) {
 const f=useCurrentFrame(); const sec=f/30+timeOffsetSeconds;
 const c=cues.find((x:any)=>sec>=x.startSeconds&&sec<x.endSeconds);
 return <div style={{position:"absolute",left:76,right:76,bottom:118,minHeight:124,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 30px",boxSizing:"border-box",borderRadius:22,background:"#070b20df",border:"1px solid #a8baff66",boxShadow:"0 8px 30px #05091acc",textAlign:"center",fontSize:51,fontWeight:700,lineHeight:1.28,color:"#fff",textShadow:"0 2px 5px #000",opacity:enabled&&c?1:0}}>{c?.text??""}</div>
}
