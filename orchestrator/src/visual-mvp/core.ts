import type {Asset,Brief,Labels,Proposal,Recommendation,Request,Settings,SourceTimeline} from './types.js';
const facts=(a:Asset)=>[a.description,...a.actions,...a.analysis.facts].join(' ');
const patterns={office:/办公室|工位|桌|电脑|office|desk|computer|monitor/i,night:/夜|night|dim|昏暗/i,work:/操作电脑|键盘|keyboard|mouse|working/i,fatigue:/摘.*眼镜|低头|触碰眼|glasses are removed|head lowers|rub.*eyes/i};
export function foundationLabels(text:string):Labels|null {
 const m=text.match(/(先([^，。：]+))[，、]\s*(再([^，。]+))/);
 if(!m||!/上限/.test(text))return null;
 const foundation=m[2].replace(/^(稳住|保证|做好|解决|保障)/,'');const next=m[4].replace(/^(谈|考虑|推进|做)/,'');
 if(!foundation||!next)return null;
 const ceiling=text.match(/(?:整个)?([^，。：是的]{1,8})的上限/)?.[1];
 return {mainTitle:m[1],subTitle:m[3],foundationLabel:foundation,progressLabel:next,ceilingLabel:ceiling?ceiling.replace(/^(?:而是)?(?:整个)?(?:是)?/,'')+'上限':'上限'};
}
export function scoreAsset(a:Asset,goal:Request['goal'],kind:Request['kind']){
 if(kind==='diagram')return 0;
 if(a.mediaType!==(kind==='image_motion'?'image':'video'))return -100;
 if(a.reviewStatus==='rejected'||a.licenseStatus==='rejected'||a.license.localExperimentAllowed!==true)return -100;
 const text=facts(a);let score=0;
 if(goal==='night_work')score=(patterns.office.test(text)?4:0)+(patterns.night.test(text)?4:0);
 if(goal==='office_work')score=(patterns.office.test(text)?3:0)+(patterns.work.test(text)?4:0)-(patterns.fatigue.test(text)?4:0);
 if(goal==='fatigue')score=(patterns.fatigue.test(text)?8:0)+(patterns.office.test(text)?1:0);
 if(goal==='return_to_work')score=/returns attention\/hands toward desk|回到桌面/.test(text)?9:-100;
 // Tags alone never qualify an unrelated video.
 return score;
}
function transitionFor(previous:Request,s:Request){
 const type=s.kind==='diagram'?'zoom_blur':previous.goal==='office_work'&&s.goal==='fatigue'?'whip_pan':previous.kind==='image_motion'&&s.kind==='live_action'?'slide_wipe':'hard_cut';
 const wanted=type==='zoom_blur'?14:type==='whip_pan'?10:12;
 const durationFrames=type==='hard_cut'?0:Math.min(wanted,Math.floor(Math.min(previous.to-previous.from,s.to-s.from)/2));
 return {toRequestId:s.requestId,type,boundaryFrame:s.from,startFrame:s.from-Math.floor(durationFrames/2),durationFrames,maxBlurPx:type==='whip_pan'?16:18,widthPx:1080,reason:type==='zoom_blur'?'Physical burden → clear advice: brief push/blur reset':type==='whip_pan'?'Work → strain: quick horizontal pan to the observed action':type==='slide_wipe'?'Context image → actual work detail: a visible moving reveal':'Direct semantic cut'};
}
export function direct(t:SourceTimeline,assets:Asset[],s:Settings):Brief {
 const candidates:{i:number;j:number;start:number;end:number;score:number;reasons:string[]}[]=[];
 for(let i=0;i<t.shots.length;i++)for(let j=i;j<t.shots.length;j++){
  const start=t.shots[i].startSeconds,end=t.shots[j].endSeconds,duration=end-start;
  if(duration>s.maxSeconds)break;if(duration<s.minSeconds)continue;
  const text=t.shots.slice(i,j+1).map(x=>x.narration).join('');
  const physical=/(熬夜|久坐|硬扛|揉眼|疲惫)/.test(text);const labels=foundationLabels(text);
  const available=(goal:Request['goal'],kind:Request['kind'])=>assets.some(a=>scoreAsset(a,goal,kind)>=6);
  const coverage=(physical&&available('fatigue','live_action')?8:0)+(labels?8:0)+(available('night_work','image_motion')?2:0)+(available('office_work','live_action')?2:0);
  const score=coverage-Math.abs(duration-s.targetSeconds);
  candidates.push({i,j,start,end,score,reasons:[`physical_action_need=${physical}`,`foundation_template_supported=${!!labels}`,`metadata_coverage_points=${coverage}`,`duration_distance=${Math.abs(duration-s.targetSeconds).toFixed(3)}`]});
 }
 candidates.sort((a,b)=>b.score-a.score||a.start-b.start);
 const winner=candidates[0];if(!winner)throw new Error('No contiguous whole-shot window fits configured duration; no forced filler.');
 const selected=t.shots.slice(winner.i,winner.j+1),text=selected.map(x=>x.narration).join('');
 const cues=t.captions.filter(c=>c.startSeconds>=winner.start-.002&&c.endSeconds<=winner.end+.002);
 const fatigue=cues.find(c=>/(熬夜|久坐|硬扛|揉眼|疲惫)/.test(c.text));
 const advice=cues.find(c=>c.startSeconds>(fatigue?.startSeconds??Infinity)&&/正确的做法/.test(c.text));
 const labels=foundationLabels(text);
 if(!fatigue||!advice||!labels)throw new Error('Winning window lacks supported action→foundation grammar; record a gap, never substitute unrelated diagram.');
 const frame=(sec:number)=>Math.round((sec-winner.start)*s.fps);const total=Math.ceil((winner.end-winner.start)*s.fps-1e-5);
 const fatigueFrame=frame(fatigue.startSeconds),methodFrame=frame(advice.startSeconds);const requests:Request[]=[];
 const add=(r:Omit<Request,'requestId'>)=>{if(r.to-r.from>=Math.round(.5*s.fps))requests.push({requestId:`visual-${requests.length+1}`,...r});else throw new Error('Semantic segment too short for a readable shot');};
 const stillEnd=Math.min(fatigueFrame,Math.round(s.maxStillSeconds*s.fps));
 add({shotNumber:selected[0].shotNumber,from:0,to:stillEnd,kind:'image_motion',goal:'night_work',reason:'Establish the working environment before the concrete physical-burden phrase.'});
 if(fatigueFrame>stillEnd)add({shotNumber:selected[0].shotNumber,from:stillEnd,to:fatigueFrame,kind:'live_action',goal:'office_work',reason:'Opening exceeds still-image dwell budget; add an actual work detail within the same narration meaning.'});
 add({shotNumber:fatigue.shotNumber,from:fatigueFrame,to:methodFrame,kind:'live_action',goal:'fatigue',reason:`Visible action is requested by original phrase: ${fatigue.text}`});
 add({shotNumber:advice.shotNumber,from:methodFrame,to:total,kind:'diagram',goal:'foundation',labels,reason:`Original advice grammar supplies title/foundation/progress labels; do not mislabel fatigue footage as recovery.`});
 return {contractVersion:'visual-brief/0.1',projectId:s.projectId,episodeId:s.episodeId,mode:'rules',modelUsed:null,capabilityLimit:'No callable LLM/vision endpoint configured. Decisions are explicit metadata/semantic rules, not autonomous model inference.',selection:{startSeconds:winner.start,endSeconds:winner.end,durationSeconds:winner.end-winner.start,shotNumbers:selected.map(x=>x.shotNumber),candidateAudit:candidates.map(c=>({...c,shotNumbers:t.shots.slice(c.i,c.j+1).map(x=>x.shotNumber)}))},fps:s.fps,durationInFrames:total,requests,transitionPlan:requests.slice(1).map((r,i)=>transitionFor(requests[i],r)),rules:['Rank all eligible contiguous whole-shot windows by metadata coverage, supported diagram grammar and distance from target duration.','Derive cuts from original action/advice subtitle cues, not episode or shot-number constants.','Split long opening image hold using configured dwell limit and a real work detail request.','Keep facts separate from prior metadata inferences; do not claim fresh visual understanding.']};
}
function actionStart(a:Asset,goal:Request['goal']){
 if(goal!=='fatigue')return a.usableSegments[0]?.start??0;
 for(const fact of a.analysis.facts){const m=fact.match(/At\s+(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)\s+seconds/i);if(m&&patterns.fatigue.test(fact))return Number(m[1]);}
 return a.usableSegments[0]?.start??0;
}
export function recommend(brief:Brief,assets:Asset[],catalogPath:string,procedural?: (request:Request)=>Recommendation|null):Proposal {
 const recommendations:Recommendation[]=[],gaps:Proposal['gaps']=[];
 for(const request of brief.requests){
  if(request.kind==='diagram'){
   const extra=procedural?.(request);if(extra){recommendations.push(extra);continue;}
   if(request.goal==='foundation'&&request.labels){recommendations.push({requestId:request.requestId,kind:request.kind,available:true,templateId:'system-foundation',labels:request.labels,reason:'Existing centered R2 Method template; procedural code, not a fabricated media Asset.'});continue;}
   gaps.push({requestId:request.requestId,reason:'No compatible existing procedural template'});continue;
  }
  const ranking=assets.map(a=>({asset:a,score:scoreAsset(a,request.goal,request.kind)})).sort((a,b)=>b.score-a.score||a.asset.assetId.localeCompare(b.asset.assetId));
  const threshold=request.goal==='fatigue'?8:6;const choice=ranking.find(x=>{
   if(x.score<threshold)return false;if(x.asset.mediaType==='image')return true;
   const start=request.preferredSourceStart??actionStart(x.asset,request.goal),end=start+(request.to-request.from)/brief.fps;
   return x.asset.usableSegments.some(seg=>start>=seg.start&&end<=seg.end)&&end<=(x.asset.durationSeconds??0);
  });
  if(!choice){const reason='No sufficiently relevant, permitted, non-rejected existing asset with a long enough source interval';gaps.push({requestId:request.requestId,reason});recommendations.push({requestId:request.requestId,available:false,kind:request.kind,reason,ranking:ranking.map(x=>({assetId:x.asset.assetId,score:x.score}))});continue;}
  const a=choice.asset,sourceStart=a.mediaType==='image'?null:(request.preferredSourceStart??actionStart(a,request.goal)),sourceEnd=sourceStart===null?null:sourceStart+(request.to-request.from)/brief.fps;
  const reason=`Metadata facts/actions match ${request.goal} (score ${choice.score}); source license explicitly permits local experiment. Human review=${a.reviewStatus}; no promotion to formal library.`;
  recommendations.push({requestId:request.requestId,available:true,kind:request.kind,assetId:a.assetId,localPath:a.localPath,sourceType:a.sourceType,sha256:a.sha256,sourceStart,sourceEnd,crop:{mode:a.width/a.height>.9?'window':'cover',objectPosition:'38% center'},licenseStatus:a.licenseStatus,reviewStatus:a.reviewStatus,match:{projectId:brief.projectId,episodeId:brief.episodeId,shotNumber:request.shotNumber,assetId:a.assetId,segmentStart:sourceStart,segmentEnd:sourceEnd,matchReason:reason,cropMode:a.width/a.height>.9?'window: preserve person/hands; avoid aggressive full-height crop':'native vertical cover',matchStatus:'proposed'},reason,ranking:ranking.map(x=>({assetId:x.asset.assetId,score:x.score,facts:x.asset.analysis.facts}))});
 }
 return {contractVersion:'asset-proposal/0.1',mode:'rules',catalogPath,recommendations,gaps,publicReady:false};
}
export function finalize(brief:Brief,proposal:Proposal,assets:Asset[]){
 if(new Set(proposal.recommendations.map(x=>x.requestId)).size!==proposal.recommendations.length)throw new Error('Duplicate downstream request recommendation');
 if(proposal.gaps.length)throw new Error(`Asset gaps prevent render: ${JSON.stringify(proposal.gaps)}`);
 const scenes=brief.requests.map(r=>{
  const p=proposal.recommendations.find(x=>x.requestId===r.requestId&&x.available);if(!p)throw new Error(`Missing recommendation ${r.requestId}`);
  if(p.kind!==r.kind)throw new Error('Recommendation kind differs from visual request');
  if(r.kind!=='diagram'){
   const a=assets.find(x=>x.assetId===p.assetId);if(!a||p.localPath!==a.localPath||p.sha256!==a.sha256)throw new Error('Recommendation does not resolve to original catalog identity');
   if(a.mediaType==='video'&&(p.sourceStart===null||p.sourceStart===undefined||p.sourceEnd===null||p.sourceEnd===undefined||p.sourceStart<0||p.sourceEnd>(a.durationSeconds??0)||p.sourceEnd<=p.sourceStart||Math.abs((p.sourceEnd-p.sourceStart)-(r.to-r.from)/brief.fps)>.001))throw new Error('Invalid recommended video range');
  }
  return {...r,...p,visualReason:r.reason,assetReason:p.reason,id:r.requestId,entry:{type:r.from===0?'zoom_in':'hard_cut',durationFrames:r.from===0?12:0,scaleFrom:1.055},motion:{scaleFrom:r.kind==='image_motion'?1.015:1,scaleTo:r.kind==='image_motion'?1.065:r.kind==='live_action'&&p.crop?.mode==='cover'?1.025:1,panX:r.kind==='image_motion'?-8:0,panY:r.kind==='image_motion'?-5:0}};
 });
 const transitions=scenes.slice(1).map((s,i)=>{const t=transitionFor(scenes[i],s);return {...t,startSeconds:t.startFrame/brief.fps};});
 return {contractVersion:'visual-timeline/0.1',mode:'rules',modelUsed:null,fps:brief.fps,width:1080,height:1920,durationInFrames:brief.durationInFrames,globalStartSeconds:brief.selection.startSeconds,globalEndSeconds:brief.selection.endSeconds,scenes,transitions,openingEntryReason:'Configured short image entry, then real content change',overlapPolicy:'Picture layers overlap with source-frame clamping only; no frames subtracted; voice/subtitles retain source clock',publicReady:false};
}
