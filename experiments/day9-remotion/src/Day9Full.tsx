import * as React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { OpinionCard } from "./OpinionCard";
import timeline from "./generated/timeline-vp005a.json";

const T = timeline as typeof timeline & { shots: any[]; captions: any[] };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const C = { bg: "#090d22", cyan: "#68d5ff", purple: "#a78bfa", white: "#f3f4ff", muted: "#aebcf2" };

function Base({ children }: React.PropsWithChildren) {
  const f=useCurrentFrame();
  return <AbsoluteFill style={{fontFamily:"Day9Chinese,sans-serif",color:C.white,background:`radial-gradient(ellipse at ${72+Math.sin(f/140)*10}% 18%,#352274 0%,transparent 46%),radial-gradient(ellipse at 0% 90%,#103d75 0%,transparent 55%),${C.bg}`}}>
    <AbsoluteFill style={{opacity:.11,backgroundImage:"linear-gradient(#9aafff 1px,transparent 1px),linear-gradient(90deg,#9aafff 1px,transparent 1px)",backgroundSize:"96px 96px",maskImage:"linear-gradient(transparent,black 36%,transparent)"}}/>
    <div style={{position:"absolute",left:88,top:150,fontSize:42,letterSpacing:3,color:"#d4ddff"}}>小陈AI说</div>
    <div style={{position:"absolute",left:88,top:244,width:904,height:2,background:"#ffffff22"}}/>
    {children}
  </AbsoluteFill>
}
function Reveal({children,delay=0,style={}}:React.PropsWithChildren<{delay?:number;style?:React.CSSProperties}>) {
  const f=useCurrentFrame(); const op=interpolate(f,[delay,delay+18],[0,1],clamp); const y=interpolate(f,[delay,delay+22],[38,0],clamp);
  return <div style={{opacity:op,transform:`translateY(${y}px)`,...style}}>{children}</div>
}
const Title=({kicker,title,sub}:{kicker:string,title:string,sub?:string})=><div style={{position:"absolute",left:88,top:400,width:904}}>
  <div style={{fontSize:46,color:C.muted,letterSpacing:5,marginBottom:52}}>{kicker}</div>
  <div style={{fontSize:106,fontWeight:700,lineHeight:1.28,letterSpacing:1}}>{title}</div>
  {sub&&<div style={{fontSize:54,color:C.cyan,marginTop:36,lineHeight:1.35}}>{sub}</div>}
</div>;
function ShotVisual({shot}:{shot:any}) {
 const n=shot.shotNumber; const f=useCurrentFrame();
 if(n===1) return <AbsoluteFill>
   <Img src={staticFile("shot-001-first-frame-v1.png")} style={{width:"100%",height:"100%",objectFit:"cover",transform:`scale(${1.035+f/30/220})`,filter:"saturate(.82)"}}/>
   <AbsoluteFill style={{background:"linear-gradient(90deg,#070b20dd 0%,#080d22a8 58%,#080d2210 100%),linear-gradient(0deg,#080d22ee,transparent 58%)"}}/>
   <div style={{position:"absolute",left:88,top:410,width:820,color:C.white}}><div style={{position:"absolute",top:-250,fontSize:42,letterSpacing:3,color:"#d4ddff"}}>小陈AI说</div><Reveal delay={8} style={{color:C.white}}><div style={{fontSize:50,color:C.muted,letterSpacing:5}}>开场 · 一人公司</div><div style={{fontSize:104,fontWeight:700,lineHeight:1.35,marginTop:46}}>一人公司，<br/>真正的风险</div><div style={{width:430,height:7,marginTop:42,background:`linear-gradient(90deg,${C.cyan},${C.purple})`}}/></Reveal></div>
 </AbsoluteFill>;
 if(n===2) return <Base><Title kicker="判断 · 真正的风险" title="不是你做错了什么" sub="而是迟迟没有切换"/><div style={{position:"absolute",left:88,right:88,top:1120,height:260,borderLeft:`6px solid ${C.cyan}`,paddingLeft:48,display:"flex",alignItems:"center",fontSize:58,color:"#dbe3ff"}}><Reveal delay={32}>切换到正确的做法</Reveal></div></Base>;
 if(n===3) return <Base><Title kicker="错误一 · 把身体当成可透支资源" title="熬夜　久坐　硬扛" sub="等产品出来，一切都值得？"/><div style={{position:"absolute",left:110,right:110,top:1090,display:"flex",gap:24}}>{["熬夜","久坐","硬扛"].map((x,i)=><Reveal key={x} delay={28+i*26} style={{flex:1,padding:"32px 18px",textAlign:"center",border:`2px solid #8d8bff70`,borderRadius:22,background:"#1b2858aa",fontSize:49,color:i===2?C.cyan:C.white}}>{x}</Reveal>)}</div></Base>;
 if(n===4) return <Base><Title kicker="正确的做法" title="先稳住身体" sub="再谈进度"/><div style={{position:"absolute",left:150,top:1035,width:780,height:390,border:`2px solid #8d8bff80`,borderRadius:34,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:38,background:"#111a3dcc"}}>
   <Reveal delay={18} style={{width:540,padding:27,textAlign:"center",borderRadius:18,background:"linear-gradient(90deg,#245078,#45377d)",fontSize:56}}>身体 · 系统上限</Reveal><Reveal delay={58} style={{fontSize:54,color:C.cyan}}>↓</Reveal><Reveal delay={83} style={{width:540,padding:27,textAlign:"center",borderRadius:18,background:"#28294f",fontSize:56}}>进度 · 持续推进</Reveal>
 </div></Base>;
 if(n===5) return <OpinionCard includeAudio={false}/>;
 if(n===6) return <Base><Title kicker="正确的做法 · 面对真实反馈" title="从做更多" sub="收束到最小可跑流程"/><div style={{position:"absolute",top:1080,left:88,right:88,display:"flex",alignItems:"center",gap:20}}>
   <Reveal delay={12} style={{padding:30,borderRadius:20,background:"#30224c",fontSize:42,color:"#c1badb"}}>功能堆叠</Reveal><Reveal delay={38} style={{fontSize:48,color:C.purple}}>→</Reveal>{["最小","最顺","跑通"].map((x,i)=><Reveal key={x} delay={55+i*25} style={{flex:1,padding:"34px 8px",textAlign:"center",border:`2px solid ${i===2?C.cyan:"#8d8bff88"}`,borderRadius:20,background:"#152443",fontSize:45}}>{x}</Reveal>)}
 </div></Base>;
 if(n===7) return <Base><Title kicker="错误三" title="迟迟不上线" sub="就不用面对用户？"/><div style={{position:"absolute",left:140,top:1070,width:800,height:340,borderRadius:34,background:"linear-gradient(135deg,#18264b,#28204c)",border:"1px solid #9aafff66",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:32}}><Reveal delay={25} style={{fontSize:56,color:C.cyan}}>不确定的判断</Reveal><Reveal delay={68} style={{fontSize:54}}>需要现实来验证</Reveal><div style={{width:530,height:3,background:`linear-gradient(90deg,${C.cyan},${C.purple})`}}/></div></Base>;
 if(n===8) return <Base><Title kicker="正确的做法" title="尽快上线" sub="把决策交给现实"/><div style={{position:"absolute",left:120,right:120,top:1075,display:"flex",alignItems:"center",justifyContent:"space-between"}}>{["上线","现实反馈","调整"].map((x,i)=><React.Fragment key={x}><Reveal delay={20+i*24} style={{width:230,height:190,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",borderRadius:28,border:`2px solid ${i===1?C.cyan:"#8d8bff88"}`,background:"#1a2448",fontSize:48}}>{x}</Reveal>{i<2&&<div style={{fontSize:52,color:C.purple}}>→</div>}</React.Fragment>)}</div><div style={{position:"absolute",left:150,top:1400,fontSize:43,color:C.muted}}>上线不是成功，是停止内耗</div></Base>;
 if(n===9) return <Base><Title kicker="真正把一人公司拖垮的" title="不是能力不够" sub="而是一直用错误的方式硬撑"/><div style={{position:"absolute",left:100,top:1115,right:100,height:12,borderRadius:9,background:"linear-gradient(90deg,#65cfff,#a78bfa)"}}/><div style={{position:"absolute",left:100,top:1170,fontSize:38,color:C.muted}}>方式，决定系统如何持续</div></Base>;
 return <Base><Title kicker="下期预告" title="把正确的做法" sub="拆成每天在用的工作结构"/><div style={{position:"absolute",left:130,top:1110,width:820,height:250,borderRadius:30,border:"1px solid #9aafff66",background:"#182247",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:24}}><Reveal delay={35} style={{fontSize:50,color:C.cyan}}>三条做法 · 一套工作结构</Reveal><Reveal delay={75} style={{fontSize:48}}>关注我，别错过下一期</Reveal></div></Base>;
}
export {Captions} from "./PocShared";
import {Captions} from "./PocShared";
export const Day9Full:React.FC<{showCaptions:boolean}> = ({showCaptions}) => <AbsoluteFill>
 {T.shots.map((shot:any)=><Sequence key={shot.shotNumber} from={shot.startFrame} durationInFrames={shot.endFrame-shot.startFrame} name={`Shot ${shot.shotNumber}`}><ShotVisual shot={shot}/></Sequence>)}
 <Audio name="冻结完整配音，仅此一轨" src={staticFile("day9-preview.wav")}/>
 <Captions enabled={showCaptions}/>
</AbsoluteFill>;

export const Day9FullClean:React.FC = () => <AbsoluteFill>
 {T.shots.map((shot:any)=><Sequence key={shot.shotNumber} from={shot.startFrame} durationInFrames={shot.endFrame-shot.startFrame} name={`Shot ${shot.shotNumber}`}><ShotVisual shot={shot}/></Sequence>)}
 <Audio name="冻结完整配音，仅此一轨" src={staticFile("day9-preview.wav")}/>
</AbsoluteFill>;
