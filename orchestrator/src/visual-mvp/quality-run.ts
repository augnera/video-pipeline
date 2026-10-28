import {parseSrtCues as sourceCues} from '../voice/subtitles.ts';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runProcess} from './process.js';
import {evaluateGate,boundedRepairs,type Data,type GateInputs,type RepairEntry} from './quality.js';
import {direct,recommend} from './core.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),project=resolve(root,'experiments/day9-remotion');
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const json=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const save=(p:string,d:unknown)=>writeFile(p,JSON.stringify(d,null,2)+'\n');
const exists=async(p:string)=>{try{await access(p);return true;}catch{return false;}};
const ff=(args:string[])=>runProcess('ffmpeg',['-v','error',...args]);
function mad(a:Buffer,b:Buffer){if(a.length!==b.length||!a.length)throw new Error('Invalid pixel comparison dimensions');let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length;}
export interface QualityProbeAdapter {sourcePaths:string[];layoutEvidencePath?:string;run:(out:string,fingerprint:Data)=>Promise<void>}
async function collect(out:string,cfg:Data,configPath:string,force=false,probe?:QualityProbeAdapter):Promise<Data>{
 const evidenceDir=resolve(out,'quality-evidence');await mkdir(evidenceDir,{recursive:true});
 const timeline=await json(resolve(out,'timeline.json')),validation=await json(resolve(out,'validation.json')),sample=resolve(out,'sample.mp4');
 const fingerprint={timelineSha256:sha(await readFile(resolve(out,'timeline.json'))),rendererSources:Object.fromEntries(await Promise.all((probe?.sourcePaths??['src/Vp007Root.tsx','src/Vp006R1Root.tsx','src/PocShared.tsx','src/visual-effects.ts','src/content-disclosure.tsx','scripts/quality-probes.ts'].map(p=>relative(root,resolve(project,p)))).map(async p=>[p,sha(await readFile(resolve(root,p)))])))};
 await save(resolve(evidenceDir,'probe-request.json'),fingerprint);
 const probePath=resolve(evidenceDir,'probe-run.json');const priorProbe=await exists(probePath)?await json(probePath):null;
 if(force||JSON.stringify(priorProbe?.fingerprint)!==JSON.stringify(fingerprint)){
  if(probe){await probe.run(out,fingerprint);}else{
  await writeFile(resolve(project,'src/generated/vp007-timeline.json'),await readFile(resolve(out,'timeline.json')));
  try{await runProcess(process.execPath,['--require','./scripts/loopback.cjs','--import',resolve(root,'orchestrator/node_modules/tsx/dist/loader.mjs'),'scripts/quality-probes.ts',out,configPath,resolve(evidenceDir,'probe-request.json')],{cwd:project,log:resolve(out,'quality-probe.log')});}
  catch(e){await save(resolve(evidenceDir,'probe-error.json'),{error:String(e)});}
  }
 }
 const protectedBefore=await json(resolve(out,'inputs.before.json'));const changed:string[]=[];for(const [p,h] of Object.entries(protectedBefore))if(sha(await readFile(resolve(root,p)))!==h)changed.push(p);
 const sampleSha=sha(await readFile(sample));const validationMatches=validation.sampleSha256===sampleSha;
 const actualProbe=JSON.parse((await runProcess('ffprobe',['-v','error','-show_streams','-show_format','-of','json',sample])).toString());const v=actualProbe.streams.find((x:Data)=>x.codec_type==='video');
 const source=sourceCues(await readFile(resolve(root,cfg.inputs.subtitles),'utf8')).filter(c=>c.startSeconds>=timeline.globalStartSeconds-.002&&c.endSeconds<=timeline.globalEndSeconds+.002);
 const comparisons:Data[]=[];
 const cachedProbe=await exists(probePath)?await json(probePath):null;
 const controlsValid=JSON.stringify(cachedProbe?.fingerprint)===JSON.stringify(fingerprint);
 const raw=(p:string,filter:string)=>ff(['-i',p,'-vf',filter,'-frames:v','1','-f','rawvideo','-']);
 for(const t of timeline.transitions.filter((x:Data)=>x.durationFrames>0)){
  const frame=t.boundaryFrame,control=resolve(evidenceDir,`hard-cut-${frame}.png`),actual=resolve(evidenceDir,`encoded-${frame}.png`);
  await ff(['-y','-i',sample,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1',actual]);
  if(!controlsValid||!await exists(control))continue;
  const filter='crop=iw:1620:0:0,scale=160:240,format=gray';const [a,b]=await Promise.all([raw(actual,filter),raw(control,filter)]);
  const expectedCaption=source.find(c=>frame/timeline.fps+timeline.globalStartSeconds>=c.startSeconds&&frame/timeline.fps+timeline.globalStartSeconds<c.endSeconds);
  let iou:number|null=null;
  if(expectedCaption){const [c,d]=await Promise.all([raw(actual,'crop=928:124:76:1678,format=gray'),raw(control,'crop=928:124:76:1678,format=gray')]);let intersection=0,union=0;for(let i=0;i<c.length;i++){if(c[i]>200&&d[i]>200)intersection++;if(c[i]>200||d[i]>200)union++;}iou=union?intersection/union:0;}
  comparisons.push({sceneBoundary:frame,type:t.type,durationFrames:t.durationFrames,effectVsHardCutMad:mad(a,b),subtitleExpected:!!expectedCaption,subtitleMaskIou:iou,actualFrame:relative(root,actual),actualSha256:sha(await readFile(actual)),hardCutControl:relative(root,control),controlSha256:sha(await readFile(control))});
  await ff(['-y','-i',actual,'-vf','scale=360:-1','-frames:v','1',resolve(evidenceDir,`phone-effect-${frame}.png`)]);
 }
 const layouts:Data[]=[];
 const externalLayouts:Data[]=probe?.layoutEvidencePath&&await exists(resolve(out,probe.layoutEvidencePath))?await json(resolve(out,probe.layoutEvidencePath)):[];
 for(const s of timeline.scenes.filter((s:Data)=>s.kind==='diagram')){
  const external=externalLayouts.find(x=>x.scene===s.id);if(external){layouts.push(external);continue;}
  const frame=Math.min(s.to-1,s.from+217),picture=resolve(evidenceDir,`diagram-${s.id}.png`);
  await ff(['-y','-i',sample,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1',picture]);
  async function bounds(top:number,height:number,test:(r:number,g:number,b:number)=>boolean){const buf=await raw(picture,`crop=1080:${height}:0:${top},format=rgb24`);let minX=1080,maxX=-1,maxY=-1,count=0;for(let i=0;i<buf.length;i+=3)if(test(buf[i],buf[i+1],buf[i+2])){const x=(i/3)%1080,y=Math.floor(i/3/1080)+top;minX=Math.min(minX,x);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++;}return {minX,maxX,maxY,count,centerX:(minX+maxX)/2};}
  const main=await bounds(250,140,(r,g,b)=>g>110&&b>130&&r<g*.8),secondary=await bounds(386,90,(r,g,b)=>r>130&&g>130&&b>150),body=await bounds(900,740,(r,g,b)=>g>110&&b>130&&r<g*.8);
  layouts.push({scene:s.id,frame,available:main.count>20&&secondary.count>20&&body.count>20,mainCenterX:main.centerX,secondaryCenterX:secondary.centerX,diagramBottomY:body.maxY,clipped:main.minX<40||main.maxX>1040||secondary.minX<40||secondary.maxX>1040,method:'Known template color/zone pixel bounds; not an aesthetic judgement',picture:relative(root,picture)});
  await ff(['-y','-i',picture,'-vf','scale=360:-1','-frames:v','1',resolve(evidenceDir,`phone-diagram-${s.id}.png`)]);
 }
 const evidence={sampleSha256:sampleSha,validationMatchesCurrentMedia:validationMatches,sourceIntegrity:changed.length===0,changedProtectedSources:changed,sourceCaptions:source,transitionComparisons:comparisons,layouts,media:{frameCount:Number(v.nb_frames),videoDurationSeconds:Number(v.duration),width:v.width,height:v.height,fps:v.r_frame_rate,fullDecodeInherited:validationMatches&&validation.fullDecode,noBlackIntervalsInherited:validationMatches&&validation.noBlackIntervals},modelUsed:null,probeFingerprint:fingerprint};
 await save(resolve(evidenceDir,'measurements.json'),evidence);return evidence;
}
function diff(a:any,b:any,path=''):Data[]{if(JSON.stringify(a)===JSON.stringify(b))return [];if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b))return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],path?path+'.'+k:k));return [{path,before:a??null,after:b??null}];}
export async function runQualityGate(out:string,options:{configPath?:string;allowRepair?:boolean;probe?:QualityProbeAdapter}={}){
 out=resolve(out);const configPath=resolve(root,options.configPath??'orchestrator/config/visual-mvp.json'),cfg=await json(configPath),rules=await json(resolve(root,'orchestrator/config/quality-rules.json'));
 await save(resolve(out,'quality-rules.json'),rules);const logPath=resolve(out,'repair-log.json');const previousLog=await exists(logPath)?await json(logPath):{repairs:[],actualMediaRepairRuns:0};const previous=previousLog.repairs as RepairEntry[];
 const load=async(force=false):Promise<GateInputs>=>({timeline:await json(resolve(out,'timeline.json')),brief:await json(resolve(out,'visual-brief.json')),proposal:await json(resolve(out,'asset-proposal.json')),catalog:(await json(resolve(root,cfg.inputs.catalog))).assets,validation:await json(resolve(out,'validation.json')),bgm:await json(resolve(out,'bgm-config.json')),evidence:await collect(out,cfg,configPath,force,options.probe),rules});
 const input=await load(),initial=evaluateGate(input);const repair=options.allowRepair===false?{timeline:input.timeline,entries:[],requiresRender:false,requiresAudio:false}:boundedRepairs(input,initial,previous);
 let executionError:string|null=null;let rechecked=false;
 if(repair.entries.length){
  const history=resolve(out,'quality-before');await mkdir(history,{recursive:true});
  for(const name of ['timeline.json','validation.json','sample.mp4','sample-bgm-plus3.mp4','sample-bgm-plus6.mp4','bgm-config.json'])if(await exists(resolve(out,name)))await copyFile(resolve(out,name),resolve(history,name));
  await save(resolve(out,'timeline.json'),repair.timeline);
  for(const entry of repair.entries){
   if(entry.action==='propose_replan'){
    try{const t=await json(resolve(root,cfg.inputs.timeline));await save(resolve(out,'repair-proposal-VQ02.json'),direct(t,input.catalog as any,cfg));}catch(e){await save(resolve(out,'repair-proposal-VQ02.json'),{gap:String(e),automaticallyApplied:false});}
   }
   if(entry.action==='propose_alternatives')await save(resolve(out,'repair-proposal-VQ07.json'),{proposal:recommend(input.brief as any,input.catalog as any,cfg.inputs.catalog),automaticallyApplied:false,reason:'Any changed asset or semantic choice requires manual Gate.'});
  }
  if(repair.requiresRender||repair.requiresAudio){
   try{await runProcess(process.execPath,['--import',resolve(root,'orchestrator/node_modules/tsx/dist/loader.mjs'),resolve(root,'orchestrator/src/visual-mvp/cli.ts'),'--config',relative(root,configPath),'--out',out,'--resume',repair.requiresRender?'--repair-render':'--repair-audio'],{log:resolve(out,'quality-repair-execution.log')});rechecked=true;}
   catch(e){executionError=String(e);rechecked=true;}
  }
 }
 const after=repair.entries.some(e=>e.applied)?await load(repair.requiresRender):input;const final=repair.entries.length?evaluateGate(after):initial;
 const entries=repair.entries.map(r=>({...r,diff:diff(r.before,r.after),recheckResult:final.find(c=>c.ruleId===r.ruleId)?.result??'NOT_EVALUATED',automaticBefore:initial.find(c=>c.ruleId===r.ruleId)?.automatic,automaticAfter:final.find(c=>c.ruleId===r.ruleId)?.automatic,artifactDifference:{sampleBefore:input.evidence.sampleSha256,sampleAfter:after.evidence.sampleSha256,audioManifestChanges:diff(input.bgm,after.bgm)},executionError}));
 const repairs=[...previous,...entries];await save(logPath,{version:rules.version,maxAutomaticRepairsPerRule:1,repairs,actualMediaRepairRuns:(previousLog.actualMediaRepairRuns??0)+(rechecked?1:0),mediaRepairRunsThisExecution:rechecked?1:0,executionError,scope:'No source-file edits, no asset or semantic replacement; one attempt per rule for this output.'});
 const summary={PASS:0,WARN:0,FAIL:0,NOT_EVALUATED:0};for(const r of final)summary[r.result]++;
 const automaticSummary={PASS:0,WARN:0,FAIL:0,NOT_EVALUATED:0};for(const r of final)automaticSummary[r.automatic.result]++;
 const overall=summary.FAIL?'FAIL':summary.WARN?'WARN':summary.NOT_EVALUATED?'NOT_EVALUATED':'PASS';
 const records=final.map(c=>{const entry=entries.find(r=>r.ruleId===c.ruleId);return {...c,repairAction:entry?.action??null,repairAttempts:repairs.filter(r=>r.ruleId===c.ruleId).length,beforeAfterDifference:entry?.diff??[],recheck:{performed:!!entry&&rechecked,result:entry&&rechecked?c.result:'NOT_EVALUATED',reason:entry?entry.reason:'No applicable safe repair performed; do not claim a fresh PASS recheck.'},manualConfirmationNeeded:c.human.questions};});
 const report={version:rules.version,mode:'deterministic-rules; multimodal-quality-service-unavailable',overallResult:overall,automaticSummary,resultSummary:summary,initialChecks:initial,checks:records,repairsApplied:entries.filter(r=>r.applied).length,mediaRepairRuns:rechecked?1:0,executionError,notEvaluatedIsNotPass:true,privatePreviewAvailable:automaticSummary.FAIL===0,publicationReady:false,manualGate:{required:true,questions:records.flatMap(c=>c.manualConfirmationNeeded),reasons:['Subjective aesthetics/retention not automatically certified','BGM selection and intelligibility need listening','Unresolved asset/disclosure/publication rights remain separate']},evidence:'quality-evidence/measurements.json'};
 await save(resolve(out,'quality-report.json'),report);
 const run=await json(resolve(out,'run.json'));run.qualityGate={overallResult:overall,automaticSummary,repairsApplied:report.repairsApplied,manualGateRequired:true};await save(resolve(out,'run.json'),run);
 const validation=await json(resolve(out,'validation.json'));validation.qualityGate={overallResult:overall,automaticSummary,notEvaluatedIsNotPass:true,report:'quality-report.json'};await save(resolve(out,'validation.json'),validation);
 console.log(JSON.stringify({qualityGate:overall,automaticSummary,repairsApplied:report.repairsApplied,manualGateRequired:true}));return report;
}
