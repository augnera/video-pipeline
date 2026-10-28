import {AbsoluteFill,Composition,OffthreadVideo,staticFile} from 'remotion';
import {PocMotionSample,Scene} from './Vp006R1Root';
import effects from './generated/vp006-r2-effects.json';
import disclosures from './generated/vp006-r2-disclosures.json';
import policy from '../../../orchestrator/config/xiaochen-visual.json';
import {ContentDisclosures,type Disclosure} from './content-disclosure';
function R2Scene({id}:{id:string}){
 if(id==='work-detail')return <AbsoluteFill style={{background:'radial-gradient(ellipse at 70% 22%,#272752,transparent 65%),#0a1028'}}><div style={{position:'absolute',left:64,top:300,width:952,height:1130,overflow:'hidden',borderRadius:28}}><OffthreadVideo src={staticFile('vp006/work-detail.mp4')} startFrom={0} muted style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'38% center'}}/></div></AbsoluteFill>;
 return <Scene id={id} showSceneBadge={policy.decorativeBadges.sceneIllustration} methodLayout="centered"/>;
}
function R2Sample(){return <PocMotionSample effects={effects} showBrand={policy.decorativeBadges.brand} showSceneBadge={policy.decorativeBadges.sceneIllustration} renderScene={id=><R2Scene id={id}/>} extraOverlay={<ContentDisclosures entries={disclosures as Disclosure[]}/>}/>;}
export const Vp006R2Root=()=> <Composition id="Day9AssetPocR2" component={R2Sample} durationInFrames={546} fps={30} width={1080} height={1920}/>;
