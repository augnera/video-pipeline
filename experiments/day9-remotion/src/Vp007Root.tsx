import {AbsoluteFill,Composition,Img,OffthreadVideo,staticFile} from 'remotion';
import {PocMotionSample} from './Vp006R1Root';
import {Method,type MethodLabels,type CaptionCue} from './PocShared';
import {ContentDisclosures,type Disclosure} from './content-disclosure';
import raw from './generated/vp007-timeline.json';
interface MediaScene {id:string;kind:string;publicAsset:string|null;sourceStart?:number|null;crop?:{mode:string;objectPosition:string};templateId?:string;labels?:MethodLabels;layout?:'centered'|'legacy'}
const timeline=raw as unknown as typeof raw & {scenes:MediaScene[];captions:CaptionCue[];disclosures:Disclosure[]};
export function TimelineVisual({s,fps}:{s:MediaScene;fps:number}){
 if(s.kind==='diagram'){
  if(s.templateId!=='system-foundation'||!s.labels)throw new Error('Unsupported procedural recommendation');
  return <Method layout={(s as MediaScene).layout??'centered'} labels={s.labels}/>;
 }
 if(!s.publicAsset)throw new Error('No material for requested visual; do not render filler');
 if(s.kind==='image_motion')return <Img src={staticFile(s.publicAsset)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>;
 const media=<OffthreadVideo src={staticFile(s.publicAsset)} startFrom={Math.round((s.sourceStart??0)*fps)} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:s.crop?.objectPosition??'center'}}/>;
 if(s.crop?.mode==='window')return <AbsoluteFill style={{background:'radial-gradient(ellipse at 70% 22%,#272752,transparent 65%),#0a1028'}}><div style={{position:'absolute',left:64,top:300,width:952,height:1130,overflow:'hidden',borderRadius:28}}>{media}</div></AbsoluteFill>;
 return media;
}
function Sample({qualityProbeNoTransitions=false}:{qualityProbeNoTransitions?:boolean}={}){const renderEffects=qualityProbeNoTransitions?{...timeline,transitions:[]}:timeline;return <PocMotionSample effects={renderEffects as unknown as NonNullable<Parameters<typeof PocMotionSample>[0]['effects']>} renderScene={id=>{const s=timeline.scenes.find(x=>x.id===id);if(!s)throw new Error("Timeline references unknown visual");return <TimelineVisual s={s} fps={timeline.fps}/>;}} audioSrc={staticFile(timeline.publicVoice)} captionOffsetSeconds={timeline.globalStartSeconds} captions={timeline.captions} showBrand={timeline.visualPolicy.decorativeBadges.brand} showSceneBadge={timeline.visualPolicy.decorativeBadges.sceneIllustration} extraOverlay={<ContentDisclosures entries={timeline.disclosures as Disclosure[]}/>}/>;}
export const Vp007Root=()=> <Composition id="VisualMvp" component={Sample} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={timeline.width} height={timeline.height}/>;
