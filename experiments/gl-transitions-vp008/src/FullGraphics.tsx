import React from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame} from 'remotion';
import {Method} from '../../day9-remotion/src/PocShared';
import {OpinionCard} from '../../day9-remotion/src/OpinionCard';
const cyan='#68d5ff',purple='#ab95ff',muted='#c5c9e4';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
function Node({x,y,text,active=false,r=100}:{x:number;y:number;text:string;active?:boolean;r?:number}){return <g><circle cx={x} cy={y} r={r} fill={active?'#193f59':'#202c50'} stroke={active?cyan:purple} strokeWidth={3}/><text x={x} y={y+16} textAnchor="middle" fill={active?'white':muted} fontSize={text.length>4?36:44} fontFamily="Day9Chinese">{text}</text></g>;}
export function FullGraphic({scene:s}:{scene:any}){
 const f=useCurrentFrame(),duration=s.to-s.from,p=interpolate(f,[0,duration-1],[0,1],clamp),draw=interpolate(f,[12,90],[0,1],clamp),pulse=.68+.2*Math.sin(f/22),data=s.graphic??{},labels=data.labels??[];
 if(s.templateId==='system-foundation')return <Method layout="centered" labels={s.labels}/>;
 if(s.templateId==='accepted-opinion-card')return <OpinionCard includeAudio={false} showBrand={false}/>;
 const id=s.templateId as string,phase=Math.min(2,Math.floor(p*3)),offset=-f*3;
 return <AbsoluteFill style={{fontFamily:'Day9Chinese,sans-serif',color:'white',background:`radial-gradient(ellipse at ${72+Math.sin(f/110)*12}% 18%,#34316d,transparent 62%),#0a1028`}}>
  <div style={{position:'absolute',inset:0,opacity:.07,backgroundImage:'linear-gradient(#aac7ff 1px,transparent 1px),linear-gradient(90deg,#aac7ff 1px,transparent 1px)',backgroundSize:'96px 96px'}}/>
  <div data-vq-title style={{position:'absolute',top:280,left:80,right:80,textAlign:'center',fontSize:76,fontWeight:700,lineHeight:1.28,color:cyan,opacity:interpolate(f,[0,12],[0,1],clamp),transform:`translateY(${interpolate(f,[0,18],[22,0],clamp)}px)`}}>{data.title}</div>
  <div data-vq-subtitle style={{position:'absolute',top:412,left:80,right:80,textAlign:'center',fontSize:46,lineHeight:1.4,color:muted}}>{data.subtitle}</div>
  <svg width={1080} height={1920} style={{position:'absolute'}}><defs><linearGradient id={'g-'+s.id}><stop stopColor={cyan}/><stop offset="1" stopColor={purple}/></linearGradient></defs><g data-vq-body>
   {id==='branch'&&<>
    <circle cx={540} cy={790} r={104+8*Math.sin(f/28)} stroke={purple} fill="#192442" strokeWidth={3}/><text x={540} y={808} fontSize={54} textAnchor="middle" fill="white">一人公司</text>
    {[270,540,810].map((x,i)=><g key={x} opacity={interpolate(f,[20+i*25,45+i*25],[0,1],clamp)}><path d={`M540 895 Q540 980 ${x} 1100`} stroke={cyan} fill="none" strokeWidth={5}/><Node x={x} y={1210} text={labels[i]??''} active={phase===i} r={104}/></g>)}</>}
   {id==='risk-switch'&&<>
    <path d="M320 840 C100 830 100 1250 320 1240 C530 1240 530 840 320 840" stroke={purple} strokeWidth={7} fill="none" strokeDasharray="22 14" strokeDashoffset={offset}/><text x={320} y={1055} fontSize={46} fill={muted} textAnchor="middle">迟迟没切换</text>
    <path d="M520 1040 H855" stroke={cyan} strokeWidth={9} strokeDasharray={340} strokeDashoffset={340*(1-interpolate(p,[.4,.8],[0,1],clamp))}/><path d="M820 1010 L855 1040 L820 1070" fill="none" stroke={cyan} strokeWidth={7}/><Node x={820} y={1250} text="正确做法" r={120} active={p>.45}/><text x={780} y={840} fill="white" fontSize={46} textAnchor="middle">切换路径</text></>}
   {['feedback-loop','validation-gap'].includes(id)&&<>
    <path d="M300 820 C90 820 90 1220 300 1220 C510 1220 510 820 300 820" stroke={purple} fill="none" strokeWidth={6} strokeDasharray="18 14" strokeDashoffset={offset}/><text x={300} y={1040} textAnchor="middle" fontSize={44} fill={muted}>{id==='validation-gap'?'不确定判断':'继续准备'}</text>
    <path d="M520 1020 H670" stroke={cyan} strokeWidth={6} strokeDasharray="12 14" opacity={pulse}/><path d="M600 975 L650 1065 M650 975 L600 1065" stroke="#bd90dd" strokeWidth={7} opacity={1-p*.65}/><Node x={820} y={1020} text={id==='validation-gap'?'用户验证':'真实反馈'} r={125} active={p>.6}/><text x={540} y={1410} textAnchor="middle" fontSize={46} fill={cyan}>让反馈进入流程</text></>}
   {['minimal-flow','reality-loop'].includes(id)&&<>
    <path d="M220 1000 H860" fill="none" stroke="#434876" strokeWidth={8}/><path d="M220 1000 H860" fill="none" stroke={cyan} strokeWidth={8} strokeDasharray={640} strokeDashoffset={640*(1-draw)}/>
    {[220,540,860].map((x,i)=><Node key={x} x={x} y={1000} text={labels[i]??''} active={phase===i} r={110}/>)}
    {id==='reality-loop'&&<path d="M860 1120 C860 1460 220 1460 220 1120" fill="none" stroke={purple} strokeWidth={6} strokeDasharray="20 13" strokeDashoffset={offset}/>}
    <circle cx={220+640*((f%120)/120)} cy={1000} r={12} fill="white"/>
    {id==='minimal-flow'&&<><path d="M250 1320 H830" stroke={purple} strokeWidth={4}/><text x={540} y={1410} textAnchor="middle" fontSize={46} fill={cyan}>一条流程，完整跑通</text></>}
   </>}
   {id==='launch-barrier'&&<>
    <circle cx={330} cy={1020} r={180} stroke={purple} strokeWidth={5} fill="#171f3e"/><path d={`M330 1020 L${330+120*Math.sin(f/55)} ${1020-120*Math.cos(f/55)}`} stroke={cyan} strokeWidth={8}/><circle cx={330} cy={1020} r={10} fill="white"/>
    <path d="M560 1020 H900" stroke={cyan} strokeWidth={5}/><path d="M650 820 V1220 M680 820 V1220" stroke="#ba98e9" strokeWidth={12} opacity={pulse}/><text x={850} y={950} fill={muted} fontSize={48} textAnchor="middle">上线</text><text x={540} y={1410} fill={cyan} fontSize={46} textAnchor="middle">准备 ≠ 验证</text></>}
   {['method-system','daily-structure'].includes(id)&&<>
    {[300,540,780].map((x,i)=><g key={x}><path d={`M${x} 980 L540 1270`} stroke={phase===i?cyan:purple} strokeWidth={6} opacity={.5+.4*draw}/><Node x={x} y={880} text={labels[i]??''} active={phase===i} r={108}/></g>)}<Node x={540} y={1280} text={id==='daily-structure'?'工作结构':'持续运行'} active r={135}/>
    <circle cx={540} cy={1280} r={160+8*Math.sin(f/30)} fill="none" stroke={purple} strokeWidth={3} opacity={.5}/>
   </>}
   {id==='closing'&&<><circle cx={540} cy={1000} r={200+15*Math.sin(f/35)} fill="#1b2b50" stroke={purple} strokeWidth={4}/><path d="M450 1000 H630 M540 910 V1090" stroke={cyan} strokeWidth={12}/><text x={540} y={1380} fill={muted} textAnchor="middle" fontSize={48}>三条做法 · 一套工作结构</text></>}
  </g></svg>
 </AbsoluteFill>;
}
