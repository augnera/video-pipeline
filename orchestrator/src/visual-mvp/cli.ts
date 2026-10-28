import {runProcess as command} from './process.js';
import {readFile,writeFile,mkdir,copyFile,access,open,unlink,readdir,rename} from 'node:fs/promises';
import {resolve,dirname,extname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';
import {importExcel} from '../import/excel.js';
import {direct,recommend,finalize} from './core.js';
import type {Asset,Brief,Cue,Proposal,Settings,SourceTimeline} from './types.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const project=resolve(root,'experiments/day9-remotion');
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const readJson=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const exists=async(p:string)=>{try{await access(p);return true;}catch{return false;}};
async function save(p:string,d:unknown){await writeFile(p,JSON.stringify(d,null,2)+'\n');}
function source(p:string){const r=resolve(root,p);if(!r.startsWith(root+'/'))throw new Error('Input must be a repository-local source');return r;}
async function ff(args:string[],log?:string){return command('ffmpeg',['-hide_banner',...args],{log});}
async function probe(p:string){return JSON.parse((await command('ffprobe',['-v','error','-show_format','-show_streams','-of','json',p])).toString());}
async function loudness(p:string){
 // ffmpeg's loudness summary is on stderr; use its own report file instead of exposing binary output.
 const log=p+'.loudness.log';await ff(['-i',p,'-map','0:a:0','-af','ebur128=peak=true','-f','null','-'],log);
 const t=await readFile(log,'utf8');const i=t.match(/Integrated loudness:\s+I:\s+([-\d.]+)/),peak=t.match(/True peak:\s+Peak:\s+([-\d.]+)/);
 if(!i||!peak)throw new Error('Unable to measure audio loudness');return {integratedLufs:Number(i[1]),truePeakDbfs:Number(peak[1])};
}
function parseSrt(text:string):Cue[]{
 const sec=(x:string)=>{const [h,m,s]=x.replace(',','.').split(':').map(Number);return h*3600+m*60+s;};
 return text.trim().split(/\r?\n\s*\r?\n/).map(block=>{const [id,times,...body]=block.split(/\r?\n/);const [a,b]=times.split(' --> ');return {id:Number(id),startSeconds:sec(a),endSeconds:sec(b),text:body.join('\n'),shotNumber:0};});
}
function rms(buf:Buffer,from:number,to:number){let sum=0;for(let i=from;i<to;i++)sum+=buf.readFloatLE(i*4)**2;return Math.sqrt(sum/(to-from));}
async function voiceMargins(voice:string,music:string,speechBand=false){
 const decode=(p:string)=>ff(['-v','error','-i',p,...(speechBand?['-af','highpass=f=300,lowpass=f=4000']:[]),'-ar','48000','-ac','2','-f','f32le','-']);const [v,m]=await Promise.all([decode(voice),decode(music)]);
 const n=Math.min(v.length,m.length)/4,window=3*48000*2,step=48000*2;const margins:number[]=[];
 for(let i=0;i+window<=n;i+=step){const a=rms(v,i,i+window),b=rms(m,i,i+window);if(a>10**(-35/20)&&b>0)margins.push(20*Math.log10(a/b));}
 if(!margins.length)throw new Error('No measurable speech-active audio window');return {minThreeSecondRmsMarginDb:Math.min(...margins),meanMarginDb:margins.reduce((a,b)=>a+b,0)/margins.length,windows:margins.length};
}
let output='',stage='initialization';const stages:{stage:string;time:string}[]=[];
async function main(){
 const {values}=parseArgs({options:{config:{type:'string'},out:{type:'string'},'plan-only':{type:'boolean',default:false},resume:{type:'boolean',default:false},'repair-render':{type:'boolean',default:false},'repair-audio':{type:'boolean',default:false}}});
 const configPath=source(values.config??'orchestrator/config/visual-mvp.json');const config=await readJson(configPath);
 output=resolve(root,values.out??config.output);if(output===root)throw new Error('Output cannot be repository root');
 const repairing=values['repair-render']||values['repair-audio'];if(values['repair-render']&&values['repair-audio'])throw new Error('Use one repair mode; render repair also rebuilds audio');
 if(await exists(resolve(output,'sample.mp4'))&&!repairing)throw new Error('Refusing to overwrite completed output; use --out for a new experiment');
 await mkdir(output,{recursive:true});if((await readdir(output)).length&&!values.resume)throw new Error('Output already contains work; use --resume or a new --out');
 const setStage=async(s:string)=>{stage=s;stages.push({stage:s,time:new Date().toISOString()});console.log(`[visual-mvp] ${s}`);await save(resolve(output,'run.json'),{mode:'rules',stages,status:'running'});};
 await setStage('inspect-inputs');
 const inputs=Object.fromEntries(Object.entries(config.inputs as Record<string,string>).map(([k,p])=>[k,source(p)]));
 const [script,t,catalog,music,policy]=await Promise.all([readJson(inputs.script),readJson(inputs.timeline),readJson(inputs.catalog),readJson(inputs.music),readJson(inputs.visualPolicy)]);
 if(policy.decorativeBadges.brand!==false||policy.decorativeBadges.sceneIllustration!==false)throw new Error('Visual policy contradicts confirmed corner-badge defaults');
 const timeline=t as SourceTimeline,assets=catalog.assets as Asset[];const bgm=source(music.defaultBgmPath);
 const protectedPaths=[configPath,...Object.values(inputs),bgm,...assets.map(a=>source(a.localPath)),source('orchestrator/contracts/asset-v0.1.schema.json'),source('orchestrator/contracts/asset-match-v0.1.schema.json')];
 const before=Object.fromEntries(await Promise.all(protectedPaths.map(async p=>[relative(root,p),sha(await readFile(p))])));
 if(values.resume&&await exists(resolve(output,'inputs.before.json'))){const saved=await readJson(resolve(output,'inputs.before.json'));for(const [p,h] of Object.entries(saved))if(before[p]!==h)throw new Error(`Input changed since interrupted run: ${p}`);}
 await save(resolve(output,'inputs.before.json'),before);
 const req=createRequire(resolve(project,'package.json'));const Ajv=req('ajv');const ajv=new Ajv({allErrors:true,schemaId:'auto'});
 async function validator(name:string){const s=await readJson(source(`orchestrator/contracts/${name}-v0.1.schema.json`));
  // Existing v0.1 only uses keywords shared with draft-07. Fail if a later dialect feature appears.
  if(/"(unevaluatedProperties|prefixItems|\$defs|dependentSchemas)"/.test(JSON.stringify(s)))throw new Error('Contract dialect needs a new adapter; do not silently ignore keywords');
  delete s.$schema;return ajv.compile(s);
 }
 const validateAsset=await validator('asset'),validateMatch=await validator('asset-match');
 const hashes=new Set<string>();
 for(const a of assets){if(!validateAsset(a))throw new Error(`Invalid Asset v0.1 ${a.assetId}: ${JSON.stringify(validateAsset.errors)}`);
  if(hashes.has(a.sha256))throw new Error('Duplicate file SHA in input catalog');hashes.add(a.sha256);
  if(sha(await readFile(source(a.localPath)))!==a.sha256)throw new Error(`Catalog file identity mismatch: ${a.assetId}`);
  const p=await probe(source(a.localPath));const v=p.streams.find((s:any)=>s.codec_type==='video');if(v.width!==a.width||v.height!==a.height)throw new Error('Catalog dimensions differ from actual media');
  if(a.mediaType==='video'&&Math.abs(Number(p.format.duration)-(a.durationSeconds??0))>.05)throw new Error('Catalog duration differs from actual media');
 }
 const excel=await importExcel(inputs.excel);if(excel.shots.length!==script.shots.length||!excel.shots.every((s,i)=>s.narration===script.shots[i].narration&&s.narration===timeline.shots[i].narration))throw new Error('Frozen narration sources disagree');
 const capability={runtimeMode:'rules',modelUsed:null,llmCredentialsPresent:['LLM_BASE_URL','LLM_MODEL','LLM_API_KEY'].every(k=>!!process.env[k]),visionEndpointConfigured:!!process.env.VISION_BASE_URL,remoteModelCalled:false,limitation:'This executable uses explicit rules and previously analysed metadata. Interactive Codex review is not presented as an autonomous runtime model service.'};
 await save(resolve(output,'capability.json'),capability);
 if(config.decisionMode!=='rules')throw new Error('Only explicit rules mode is implemented in this MVP; no fabricated model inference');
 let brief:Brief,proposal:Proposal,base:ReturnType<typeof finalize>,captions:Cue[],finalTimeline:any;
 const pub=resolve(project,'public/vp007');await mkdir(pub,{recursive:true});
 if(repairing){
  await setStage('quality-repair:retain-approved-json-decisions');
  brief=await readJson(resolve(output,'visual-brief.json'));proposal=await readJson(resolve(output,'asset-proposal.json'));finalTimeline=await readJson(resolve(output,'timeline.json'));base=finalTimeline;captions=finalTimeline.captions;
  if(base.globalStartSeconds!==brief.selection.startSeconds||base.globalEndSeconds!==brief.selection.endSeconds||base.durationInFrames!==brief.durationInFrames)throw new Error('Repair cannot retime narration window');
  for(const s of base.scenes){const r=brief.requests.find(x=>x.requestId===s.requestId),p=proposal.recommendations.find(x=>x.requestId===s.requestId);if(!r||!p||s.kind!==r.kind||s.from!==r.from||s.to!==r.to||s.assetId!==p.assetId||s.sourceStart!==p.sourceStart||s.sourceEnd!==p.sourceEnd||JSON.stringify(s.labels)!==JSON.stringify(p.labels))throw new Error('Repair tried to change asset, semantics or source interval');}
  for(const p of proposal.recommendations)if(p.match&&!validateMatch(p.match))throw new Error('Repair proposal failed original AssetMatch contract');
 }else{
 await setStage('visual-director:rules');
 await save(resolve(output,'visual-brief.json'),direct(timeline,assets,config as Settings));
 // Deliberate file boundary: downstream stages read the serialized contract, not hidden planner memory.
 brief=await readJson(resolve(output,'visual-brief.json')) as Brief;
 await setStage('asset-agent:existing-metadata');
 await save(resolve(output,'asset-proposal.json'),recommend(brief,assets,relative(root,inputs.catalog)));
 proposal=await readJson(resolve(output,'asset-proposal.json')) as Proposal;
 for(const p of proposal.recommendations)if(p.match&&!validateMatch(p.match))throw new Error(`Invalid AssetMatch v0.1: ${JSON.stringify(validateMatch.errors)}`);
 await setStage('director:finalize-json-timeline');
 base=finalize(brief,proposal,assets);
 const originalCues=parseSrt(await readFile(inputs.subtitles,'utf8'));
 captions=originalCues.filter(c=>c.startSeconds>=base.globalStartSeconds-.002&&c.endSeconds<=base.globalEndSeconds+.002).map(c=>({...c,shotNumber:timeline.captions.find(x=>x.id===c.id)?.shotNumber??0}));
 const corresponding=timeline.captions.filter(c=>c.startSeconds>=base.globalStartSeconds-.002&&c.endSeconds<=base.globalEndSeconds+.002);
 if(captions.length!==corresponding.length||captions.some((c,i)=>c.text!==corresponding[i].text||Math.abs(c.startSeconds-corresponding[i].startSeconds)>.002))throw new Error('Original subtitles/timeline disagree');
 const narration=timeline.shots.filter(s=>brief.selection.shotNumbers.includes(s.shotNumber)).map(s=>s.narration).join('');
 if(captions.map(c=>c.text).join('').replace(/\s/g,'')!==narration.replace(/\s/g,''))throw new Error('Selected subtitle text does not cover selected narration');
 const scenes=await Promise.all(base.scenes.map(async s=>{if(!s.localPath)return {...s,publicAsset:null};const p=source(s.localPath),name=s.sha256!.slice(0,16)+extname(p);const dest=resolve(pub,name);
  if(!await exists(dest))await copyFile(p,dest);else if(sha(await readFile(dest))!==s.sha256)throw new Error('Public asset staging hash collision');return {...s,publicAsset:`vp007/${name}`};}));
 const disclosures=scenes.filter(s=>s.sourceType==='ai_generated').map(s=>{const enter=base.transitions.find(t=>t.boundaryFrame===s.from),exit=base.transitions.find(t=>t.boundaryFrame===s.to);return {assetId:s.assetId,fromFrame:enter?.startFrame??s.from,toFrame:exit?exit.startFrame+exit.durationFrames:s.to,status:'pending_review',label:null,reason:'Existing AI-generated asset; independent disclosure review covers its entire overlap visibility before publication.'};});
 finalTimeline={...base,scenes,captions,subtitlePrecision:timeline.subtitlePrecision,publicVoice:'vp007/voice.wav',bgm:{source:music.defaultBgmPath,licenseStatus:music.licenseStatus,boostCandidatesDb:config.musicBoostCandidatesDb,baselineConfig:relative(root,inputs.previousBgmConfig),audioManifest:'bgm-config.json'},visualPolicy:policy,disclosures,sourceHashes:before,visualBriefSha256:sha(await readFile(resolve(output,'visual-brief.json'))),assetProposalSha256:sha(await readFile(resolve(output,'asset-proposal.json'))),handoff:'visual-brief.json → asset-proposal.json → timeline.json → Remotion; downstream files read back explicitly'};
 await save(resolve(output,'timeline.json'),finalTimeline);
 }
 await save(resolve(output,'timeline.json'),finalTimeline);
 const renderTimeline=await readJson(resolve(output,'timeline.json')); // renderer consumes exactly this serialized result.
 await save(resolve(project,'src/generated/vp007-timeline.json'),renderTimeline);
 if(values['plan-only']){await save(resolve(output,'run.json'),{mode:'rules',stages,status:'planned-not-rendered'});console.log('Rules-mode planning complete; no video rendered.');return;}
 await setStage('prepare-original-audio');
 const duration=base.globalEndSeconds-base.globalStartSeconds,voice=resolve(output,'voice.wav'),selectedMusic=resolve(output,'bgm-selected.wav');
 await ff(['-v','error','-y','-ss',String(base.globalStartSeconds),'-i',inputs.voice,'-t',String(duration),'-c:a','pcm_s16le',voice]);await copyFile(voice,resolve(pub,'voice.wav'));
 await ff(['-v','error','-i',bgm,'-f','null','-']);
 await ff(['-v','error','-y','-stream_loop','-1','-i',bgm,'-t',String(duration),'-ar','48000','-ac','2','-c:a','pcm_s24le',selectedMusic]);
 const voiceLevel=await loudness(voice),musicLevel=await loudness(selectedMusic);
 const prior=await readJson(inputs.previousBgmConfig),bgmProbe=await probe(bgm);
 if(prior.source!==music.defaultBgmPath||prior.sourceSha256!==sha(await readFile(bgm)))throw new Error('Current-mix baseline is a different music file; cannot label relative boosts');
 const master=prior.masterGainDb??config.masterGainDb;
 const boosts:number[]=config.musicBoostCandidatesDb;
 if(!Array.isArray(boosts)||boosts.length!==2||boosts.some(x=>!Number.isFinite(x)||x<0))throw new Error('Configure exactly two nonnegative BGM boost candidates');
 const variants:{boostDb:number;gainDb:number;bgmStem:string;mixFile:string;margins:Awaited<ReturnType<typeof voiceMargins>>;speechBandMargins:Awaited<ReturnType<typeof voiceMargins>>;mixedLevel:Awaited<ReturnType<typeof loudness>>}[]=[];
 for(const boostDb of boosts){
  const gainDb=Number((prior.musicGainDb+boostDb).toFixed(1)),stem=resolve(output,`bgm-plus${boostDb}.wav`),mixFile=resolve(output,`mixed-plus${boostDb}.wav`);
  await ff(['-v','error','-y','-i',selectedMusic,'-af',`volume=${gainDb}dB,afade=t=in:st=0:d=0.5,afade=t=out:st=${duration-1}:d=1`,'-c:a','pcm_s24le',stem]);
  const margins=await voiceMargins(voice,stem),speechBandMargins=await voiceMargins(voice,stem,true);
  await ff(['-v','error','-y','-i',voice,'-i',stem,'-filter_complex',`[0:a]aresample=48000[v];[v][1:a]amix=inputs=2:duration=first:normalize=0,volume=${master}dB[m]`,'-map','[m]','-ar','48000','-ac','2','-c:a','pcm_s24le',mixFile]);
  const mixedLevel=await loudness(mixFile);if(mixedLevel.truePeakDbfs>=0)throw new Error(`Candidate +${boostDb}dB clips; do not change voice gain to disguise it`);
  variants.push({boostDb,gainDb,bgmStem:stem,mixFile,margins,speechBandMargins,mixedLevel});
 }
 // Independent PCM stems prove only BGM changes; both variants retain the same voice and bus gain.
 const decodeStereo=(p:string)=>ff(['-v','error','-i',p,'-ar','48000','-ac','2','-f','f32le','-']);
 const [bgA,bgB,mixA,mixB]=await Promise.all([decodeStereo(variants[0].bgmStem),decodeStereo(variants[1].bgmStem),decodeStereo(variants[0].mixFile),decodeStereo(variants[1].mixFile)]);
 if(new Set([bgA.length,bgB.length,mixA.length,mixB.length]).size!==1)throw new Error('Candidate audio durations differ');
 const ratio=10**((variants[1].boostDb-variants[0].boostDb)/20),bus=10**(master/20);let maxBgmRatioError=0,maxRecoveredVoiceDifference=0;
 for(let i=0;i<bgA.length;i+=4){const a=bgA.readFloatLE(i),b=bgB.readFloatLE(i);maxBgmRatioError=Math.max(maxBgmRatioError,Math.abs(b-ratio*a));maxRecoveredVoiceDifference=Math.max(maxRecoveredVoiceDifference,Math.abs((mixB.readFloatLE(i)-bus*b)-(mixA.readFloatLE(i)-bus*a)));}
 if(maxBgmRatioError>1e-5||maxRecoveredVoiceDifference>1e-5)throw new Error('A/B stem invariance check failed');
 const stemChecks={expectedBgmRatio:ratio,maxBgmRatioError,maxRecoveredVoiceDifference,voiceComponentSameWithinPcmQuantization:true,noVariantGainAutomation:true,intelligibilityMethod:'Broadband and 300–4000 Hz speech-band energy margins are objective proxies; no ASR or listening claim.'};
 await save(resolve(output,'bgm-config.json'),{source:music.defaultBgmPath,sourceSha256:sha(await readFile(bgm)),sourceDuration:Number(bgmProbe.format.duration),sourceOrigin:music.source,licenseStatus:music.licenseStatus,scope:'private local audition',baseline:'R2 actual music stem gain, inherited unchanged from R1',baselineConfig:relative(root,inputs.previousBgmConfig),baselineMusicGainDb:prior.musicGainDb,voiceLevel,musicLevel,masterGainDb:master,fadeInSeconds:.5,fadeOutSeconds:1,variants:variants.map(v=>({...v,bgmStem:relative(output,v.bgmStem),mixFile:relative(output,v.mixFile),quietSpeechNeedsFocusedListening:v.margins.minThreeSecondRmsMarginDb<8})),stemChecks,loopActuallyNeeded:duration>Number(bgmProbe.format.duration)});
 if(!values['repair-audio']){
  if(repairing&&await exists(resolve(output,'visual-with-voice.mp4')))await rename(resolve(output,'visual-with-voice.mp4'),resolve(output,`quality-before-visual-${Date.now()}.mp4`));
 await setStage('remotion:render-timeline');
 await command(process.execPath,['--require','./scripts/loopback.cjs','node_modules/@remotion/cli/remotion-cli.js','render','src/vp007.ts','VisualMvp',resolve(output,'visual-with-voice.mp4'),`--browser-executable=${config.browserExecutable}`,'--gl=swangle','--rspack=false','--timeout=90000','--concurrency=2','--codec=h264','--audio-codec=aac','--audio-bitrate=192k','--crf=18','--pixel-format=yuv420p','--log=info'],{cwd:project,log:resolve(output,'render.log')});
 }else if(!await exists(resolve(output,'visual-with-voice.mp4')))throw new Error('No existing visual stream for audio-only repair');
 await setStage('mux:independent-bgm-candidates');
 for(const v of variants)await ff(['-v','error','-y','-i',resolve(output,'visual-with-voice.mp4'),'-i',v.mixFile,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',resolve(output,`sample-bgm-plus${v.boostDb}.mp4`)]);
 await copyFile(resolve(output,`sample-bgm-plus${variants[0].boostDb}.mp4`),resolve(output,'sample.mp4'));
 await setStage('validate-delivery');
 const sample=resolve(output,'sample.mp4');await ff(['-v','error','-i',sample,'-f','null','-']);
 const blackLog=resolve(output,'blackdetect.log');await ff(['-i',sample,'-an','-vf','blackdetect=d=0.05:pix_th=0.01:pic_th=0.98','-f','null','-'],blackLog);if((await readFile(blackLog,'utf8')).includes('black_start:'))throw new Error('Black interval detected');
 const info=await probe(sample);const v=info.streams.find((x:any)=>x.codec_type==='video');if(Number(v.nb_frames)!==base.durationInFrames||v.width!==1080||v.height!==1920||v.r_frame_rate!=='30/1')throw new Error('Output frame coverage/format mismatch');
 const decodedVoice=await ff(['-v','error','-i',inputs.voice,'-f','s16le','-']);const clipVoice=await ff(['-v','error','-i',voice,'-f','s16le','-']);const vp=await probe(inputs.voice);const av=vp.streams.find((x:any)=>x.codec_type==='audio');const offset=Math.round(base.globalStartSeconds*Number(av.sample_rate))*av.channels*2;
 const exact=decodedVoice.subarray(offset,offset+clipVoice.length).equals(clipVoice);if(!exact)throw new Error('Voice slice changed original samples');
 const changed=await Promise.all(Object.entries(before).map(async([p,h])=>({path:p,unchanged:sha(await readFile(source(p)))===h})));if(changed.some(x=>!x.unchanged))throw new Error('Protected input changed');
 const finalLevel=await loudness(sample);if(finalLevel.truePeakDbfs>=0)throw new Error('Encoded audio peak reaches clipping');
 const candidateValidation=[];
 const videoHash=(p:string)=>ff(['-v','error','-i',p,'-map','0:v:0','-c','copy','-f','streamhash','-hash','sha256','-']);
 let firstVideoHash:string|null=null;
 for(const v of variants){const p=resolve(output,`sample-bgm-plus${v.boostDb}.mp4`);await ff(['-v','error','-i',p,'-f','null','-']);const pi=await probe(p),level=await loudness(p);if(level.truePeakDbfs>=0)throw new Error('Encoded candidate clips');const hash=(await videoHash(p)).toString();if(firstVideoHash&&firstVideoHash!==hash)throw new Error('BGM variants have different video streams');firstVideoHash=hash;candidateValidation.push({boostDb:v.boostDb,path:relative(root,p),sha256:sha(await readFile(p)),probe:pi,fullDecode:true,audioLevel:level,voiceMusicMargins:v.margins,speechBandMargins:v.speechBandMargins});}
 const validation={status:'technical-pass; rules-mode; holder-review-pending',mode:'rules',modelUsed:null,capability,fullDecode:true,noBlackIntervals:true,probe:info,voiceSliceSampleExact:exact,subtitleCueCount:captions.length,subtitleTextEqualsSource:true,finalAudioLevel:finalLevel,candidates:candidateValidation,voiceAndBgmStemChecks:stemChecks,videoStreamSameBetweenCandidates:true,protectedInputs:changed,assetContracts:'Original v0.1 JSON Schemas compiled using installed AJV6 common draft-07 keyword subset; unsupported later-dialect features fail explicitly',assetsNotPromoted:true,publicReady:false,publicRestrictions:['BGM authorization pending','Indexed assets pending human library review','AI disclosure review pending'],sourceCatalog:relative(root,inputs.catalog),handoffHashes:{visualBrief:finalTimeline.visualBriefSha256,assetProposal:finalTimeline.assetProposalSha256,timeline:sha(await readFile(resolve(output,'timeline.json')))},sampleSha256:sha(await readFile(sample)),gpuModelsStarted:false,published:false,subjectiveQuality:'Human viewing required; no claim of proven improvement in retention or publication quality.'};
 await save(resolve(output,'validation.json'),validation);await save(resolve(output,'run.json'),{mode:'rules',stages,status:'complete',sample:relative(root,sample)});console.log(JSON.stringify({mode:'rules',sample:relative(root,sample),selection:brief.selection.shotNumbers,seconds:duration,bgmCandidates:variants.map(v=>({boostDb:v.boostDb,musicGainDb:v.gainDb,margins:v.margins,speechBandMargins:v.speechBandMargins})),stemChecks}));
}
const lock=resolve(project,'.vp007.lock');let lockHandle:Awaited<ReturnType<typeof open>>|undefined;
try{lockHandle=await open(lock,'wx');await lockHandle.writeFile(String(process.pid));await main();}
catch(e){console.error(e instanceof Error?e.message:String(e));if(output&&await exists(output))await save(resolve(output,'failure.json'),{stage,message:e instanceof Error?e.message:String(e),mode:'rules',stages});process.exitCode=1;}
finally{if(lockHandle){await lockHandle.close();await unlink(lock);}}
