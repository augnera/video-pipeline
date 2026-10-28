// Small deterministic gate + one-attempt repair policy. No model or media service is hidden here.
export type Result='PASS'|'WARN'|'FAIL'|'NOT_EVALUATED';
export type Data=Record<string,any>;
export interface QualityCheck {ruleId:string;scenes:string[];result:Result;automatic:{result:Result;evidence:unknown};modelAssisted:{result:'NOT_EVALUATED';reason:string};human:{result:'NOT_EVALUATED';questions:string[]};repairAction:string|null;manualReasons:string[]}
export interface GateInputs {timeline:Data;brief:Data;proposal:Data;catalog:Data[];validation:Data;bgm:Data;evidence:Data;rules:Data}
function check(id:string,scenes:string[],result:Result,evidence:unknown,action:string|null,human:string[],manual:string[]=[]):QualityCheck{
 return {ruleId:id,scenes,result:result==='PASS'?'NOT_EVALUATED':result,automatic:{result,evidence},modelAssisted:{result:'NOT_EVALUATED',reason:'No callable multimodal quality endpoint configured; pixel metrics do not certify aesthetics or semantics.'},human:{result:'NOT_EVALUATED',questions:human},repairAction:action,manualReasons:manual};
}
export function evaluateGate(g:GateInputs):QualityCheck[]{
 const {timeline:t,brief,proposal,catalog,validation:v,bgm,evidence:e,rules}=g,q=rules.thresholds;const scenes=t.scenes as Data[];const records:QualityCheck[]=[];
 const stills=scenes.filter(s=>s.kind==='image_motion').map(s=>{const enter=t.transitions.find((x:Data)=>x.boundaryFrame===s.from),exit=t.transitions.find((x:Data)=>x.boundaryFrame===s.to);const seconds=((exit?exit.startFrame+exit.durationFrames:s.to)-(enter?.startFrame??s.from))/t.fps;const motion=s.motion&&((s.motion.scaleTo??1)!==(s.motion.scaleFrom??1)||s.motion.panX||s.motion.panY);return {scene:s.id,assetId:s.assetId,seconds,motion:!!motion,warning:seconds>q.stillWarningSeconds};});
 const long=stills.filter(s=>s.warning),motionRepair=long.some(s=>!s.motion);
 records.push(check('VQ-01',stills.map(s=>s.scene),long.length?'WARN':'PASS',stills,motionRepair?'add_motion':null,['静态图的运动是否足以维持观看？'],long.length?['超过约3秒仅提醒，不自动判FAIL；补充真实片段涉及素材/语义，需人工。']:[]));
 const kinds=scenes.map(s=>s.kind);let maxRun=0,run=0,last='';for(const kind of kinds){run=kind===last?run+1:1;last=kind;maxRun=Math.max(maxRun,run);}const uniform=new Set(kinds).size===1&&scenes.length>1;
 records.push(check('VQ-02',scenes.map(s=>s.id),uniform?'FAIL':maxRun>=q.sameKindRunWarningCount?'WARN':'PASS',{kinds,maxRun},uniform||maxRun>=q.sameKindRunWarningCount?'propose_replan':null,['不同类型是否实际具有内容差异，而不是换皮文字卡？'],uniform?['重新编排可能改变素材或语义；仅提案，必须人工确认。']:[]));
 const expected=brief.transitionPlan??[];const configErrors:string[]=[];
 for(const x of expected){const got=t.transitions.find((p:Data)=>p.boundaryFrame===x.boundaryFrame);if(!got||got.type!==x.type||got.durationFrames!==x.durationFrames)configErrors.push(`Plan mismatch at boundary ${x.boundaryFrame}`);}
 for(const x of t.transitions){if(x.startFrame<0||x.startFrame+x.durationFrames>t.durationInFrames||x.durationFrames<0)configErrors.push('Transition outside timeline');if(x.type!=='hard_cut'&&(x.durationFrames<q.transitionMinFrames||x.durationFrames>q.transitionMaxFrames))configErrors.push('Transition duration outside reviewed band');}
 const pixels=e.transitionComparisons as Data[]|undefined;const pixelsMissing=!pixels||pixels.length<expected.filter((x:Data)=>x.durationFrames>0).length;
 const weakPixels=pixels?.filter(p=>p.effectVsHardCutMad<q.effectVsHardCutMadMinimum)||[];
 const damagedCaptions=pixels?.filter(p=>p.subtitleMaskIou!==null&&p.subtitleMaskIou<q.subtitleGlyphMaskIouMinimum)||[];
 const trStatus:Result=configErrors.length||weakPixels.length||damagedCaptions.length?'FAIL':pixelsMissing?'NOT_EVALUATED':'PASS';
 records.push(check('VQ-03',scenes.map(s=>s.id),trStatus,{configErrors,actualEffectVsHardCut:pixels??[],limits:'Pixel difference proves an effect is rendered; exact perceptual type/naturalness remains unevaluated.'},trStatus==='FAIL'?'restore_transitions':null,['正常速度下，甩镜/推镜/滑动遮罩是否明显且自然？','字幕是否始终稳定清晰？'],pixelsMissing?['缺少实际画面控制帧，不能把配置存在当作实际效果通过。']:[]));
 const diagrams=scenes.filter(s=>s.kind==='diagram'),layoutConfigBad=diagrams.filter(s=>(s.layout??'centered')!=='centered');const layouts=e.layouts as Data[]|undefined;
 const layoutBad=layouts?.filter(x=>x.available&&((x.centerAlignmentRequired!==false&&(Math.abs(x.mainCenterX-t.width/2)>q.centerTolerancePx||Math.abs(x.secondaryCenterX-t.width/2)>q.centerTolerancePx))||x.diagramBottomY>=q.subtitleSafeTop||x.clipped));
 const layoutMissing=!layouts||layouts.length<diagrams.length||layouts.some(x=>!x.available);
 const layoutStatus:Result=layoutConfigBad.length||layoutBad?.length?'FAIL':!diagrams.length||layoutMissing?'NOT_EVALUATED':'PASS';
 records.push(check('VQ-04',diagrams.map(s=>s.id),layoutStatus,{resolvedModes:diagrams.map(s=>({scene:s.id,layout:s.layout??'centered'})),actualPixelLayouts:layouts??[],subtitleSafeTop:q.subtitleSafeTop},layoutStatus==='FAIL'?'center_layout':null,['标题、说明、主体和留白是否协调？'],layoutMissing?['无法测量时保留NOT_EVALUATED，不按模板名称推定通过。']:[]));
 const badge=t.visualPolicy?.decorativeBadges;const hasBadges=badge?.brand!==false||badge?.sceneIllustration!==false||t.visualPolicy?.brandAccentLine===true;
 records.push(check('VQ-05',scenes.map(s=>s.id),hasBadges?'FAIL':'PASS',{decorativeBadges:badge,independentDisclosureEntries:t.disclosures??[],scope:'Normal UI labels; no OCR claim about baked-in source text.'},hasBadges?'hide_badges':null,['实际画面是否仍有无意义角标或素材烧录标记？'],['AI披露为独立状态，pending_review 不能视为已豁免。']));
 const requiredBoosts=Number.isFinite(bgm.selectedBoostDb)?[bgm.selectedBoostDb]:[3,6];
 const variants=(bgm.variants??[]).filter((a:Data)=>requiredBoosts.includes(a.boostDb));const boosts=variants.map((a:Data)=>a.boostDb);const missingGains=!requiredBoosts.every(x=>boosts.includes(x));
 const clipped=variants.some((a:Data)=>a.mixedLevel?.truePeakDbfs>=q.clippingTruePeakDbfs);
 const quietSpeech=variants.filter((a:Data)=>(a.margins?.minThreeSecondRmsMarginDb??Infinity)<q.speechMarginWarnBelowDb);
 const badStem=bgm.stemChecks?.voiceComponentSameWithinPcmQuantization!==true;
 const badBoost=variants.some((a:Data)=>Math.abs(a.gainDb-bgm.baselineMusicGainDb-a.boostDb)>.01);
 const musicStatus:Result=clipped||badStem||badBoost?'FAIL':missingGains?'WARN':quietSpeech.length?'WARN':'PASS';
 records.push(check('VQ-06',[],musicStatus,{baseline: bgm.baselineMusicGainDb,requiredBoosts,variants,missingGains,clipped,badStem,badBoost,stemChecks:bgm.stemChecks,quietSpeechCandidates:quietSpeech.map((a:Data)=>a.boostDb),limits:'Energy ratio is a proxy, not a speech-recognition or listening verdict.'},missingGains||clipped||badStem||badBoost?'generate_gain_candidates':null,[requiredBoosts.length===1?`本轮+${requiredBoosts[0]}dB音乐与人声是否合适？`:'+3与+6哪档音乐可听且人声更清楚？','弱语音段是否被音乐抢走注意力？'],quietSpeech.length?[`当前+${quietSpeech.map((a:Data)=>a.boostDb).join('/+')}dB试听档出现弱语音能量提醒；不自动改档，需人工试听。`]:[]));
 const index=new Map(catalog.map(a=>[a.assetId,a]));const assetErrors:string[]=e.sourceIntegrity===false?['Protected source changed']:[],licenseErrors:string[]=[],uses:Record<string,number>={};
 for(const s of scenes){if(s.kind==='diagram')continue;const a=index.get(s.assetId);if(!a){assetErrors.push(`Missing ${s.assetId}`);continue;}uses[s.assetId]=(uses[s.assetId]??0)+1;
  if(a.sha256!==s.sha256||a.localPath!==s.localPath||a.sourceType!==s.sourceType)assetErrors.push(`Identity mismatch ${s.id}`);
  if(a.license?.localExperimentAllowed!==true||!['verified_for_local_experiment','local_experiment_only'].includes(a.licenseStatus)||a.reviewStatus==='rejected')licenseErrors.push(`Not permitted ${s.id}`);
  if((s.kind==='image_motion'&&a.mediaType!=='image')||(s.kind==='live_action'&&a.mediaType!=='video'))assetErrors.push(`Media type mismatch ${s.id}`);
  if(a.mediaType==='video'&&(!Number.isFinite(s.sourceStart)||!Number.isFinite(s.sourceEnd)||s.sourceStart<0||s.sourceEnd<=s.sourceStart||s.sourceEnd>a.durationSeconds||Math.abs(s.sourceEnd-s.sourceStart-(s.to-s.from)/t.fps)>.001))assetErrors.push(`Invalid range ${s.id}`);
 }
 const repeated=Object.entries(uses).filter(([,count])=>count>q.maxSameAssetUses);const assetStatus:Result=assetErrors.length||licenseErrors.length?'FAIL':repeated.length?'WARN':'PASS';
 records.push(check('VQ-07',scenes.map(s=>s.id),assetStatus,{assetErrors,licenseErrors,uses,repeated,indexReviewStatuses:scenes.filter(s=>s.assetId).map(s=>({assetId:s.assetId,status:index.get(s.assetId)?.reviewStatus})),recommendationReasons:proposal.recommendations.map((p:Data)=>({requestId:p.requestId,reason:p.reason}))},repeated.length?'propose_alternatives':null,['每段画面是否贴合旁白？重复素材是否有新的表达用途？'],assetErrors.length||licenseErrors.length?['更换素材、缺口或授权问题不得自动解决。']:[]));
 const authoritative=e.sourceCaptions as Data[]|undefined;const cueErrors:string[]=[],textErrors:string[]=[];const cues=t.captions as Data[];
 if(authoritative){if(cues.length!==authoritative.length)textErrors.push('Source cue count differs');for(let i=0;i<cues.length;i++){const c=cues[i],s=authoritative.find(x=>x.id===c.id);if(!s||s.text!==c.text)textErrors.push(`Source text mismatch cue ${c.id}`);else if(Math.abs(c.startSeconds-s.startSeconds)>.002||Math.abs(c.endSeconds-s.endSeconds)>.002)cueErrors.push(`Source timing mismatch cue ${c.id}`);
  if(c.startSeconds<t.globalStartSeconds-.002||c.endSeconds>t.globalEndSeconds+.002||c.endSeconds<=c.startSeconds)cueErrors.push(`Out of bounds cue ${c.id}`);if(i&&c.startSeconds<cues[i-1].endSeconds-.001)cueErrors.push(`Overlap cue ${c.id}`);}
 }else cueErrors.push('Authoritative source timing unavailable');
 const primaryCoverageBad=scenes[0]?.from!==0||scenes.at(-1)?.to!==t.durationInFrames||scenes.some((s,i)=>s.to<=s.from||(i>0&&s.from!==scenes[i-1].to));
 const audioBad=v.voiceSliceSampleExact!==true||e.sourceIntegrity===false;const frameBad=primaryCoverageBad||e.validationMatchesCurrentMedia!==true||e.media?.width!==t.width||e.media?.height!==t.height||e.media?.fps!==`${t.fps}/1`||e.media?.frameCount!==t.durationInFrames||Math.abs((e.media?.videoDurationSeconds??0)-t.durationInFrames/t.fps)>1/t.fps;
 const timesStatus:Result=audioBad||frameBad||textErrors.length?'FAIL':!authoritative?'NOT_EVALUATED':cueErrors.length?'FAIL':'PASS';
 const canRestore=!!authoritative&&cueErrors.length>0&&!textErrors.length&&!audioBad&&!frameBad&&cues.every(c=>authoritative.some(x=>x.id===c.id&&x.text===c.text));
 records.push(check('VQ-08',scenes.map(s=>s.id),timesStatus,{cueErrors,textErrors,voiceSliceSampleExact:v.voiceSliceSampleExact,media:e.media,cueCount:cues.length},canRestore?'restore_cue_times':null,['新剪辑后的语音与字幕是否仍自然同步？'],textErrors.length||audioBad||frameBad?['文本、原音频或不明确时间轴错误转人工，不修改原件。']:[]));
 return records;
}
export interface RepairEntry {ruleId:string;attempt:number;action:string;applied:boolean;before:unknown;after:unknown;requiresRender:boolean;requiresAudio:boolean;manualGate:boolean;reason:string}
export function boundedRepairs(g:GateInputs,checks:QualityCheck[],previous:RepairEntry[]=[]){
 const t=structuredClone(g.timeline);const logs:RepairEntry[]=[];let render=false,audio=false;
 for(const c of checks){if(!c.repairAction)continue;const used=previous.filter(r=>r.ruleId===c.ruleId&&r.attempt>0).length;if(used>=g.rules.maxAutomaticRepairsPerRule)continue;
  const before=structuredClone(t);let applied=false,why='',needRender=false,needAudio=false;
  switch(c.repairAction){
   case 'add_motion':for(const s of t.scenes){if(s.kind==='image_motion'&&!s.motion?.panX&&!s.motion?.panY&&(s.motion?.scaleFrom??1)===(s.motion?.scaleTo??1)){s.motion={scaleFrom:1.015,scaleTo:1.065,panX:-8,panY:-5};applied=true;}}needRender=applied;why='只增加已支持的轻微运动；时长提醒可能仍需人工，不增加或替换素材。';break;
   case 'restore_transitions':if(g.brief.transitionPlan?.length){t.transitions=g.brief.transitionPlan.map((x:Data)=>({...x,startSeconds:x.startFrame/t.fps}));applied=true;needRender=true;why='恢复同语义 Brief 的转场配置并同步渲染接线；若复检仍失败不再尝试。';}break;
   case 'center_layout':for(const s of t.scenes)if(s.kind==='diagram'&&s.templateId==='system-foundation'){s.layout='centered';applied=true;}needRender=applied;why='仅使用既有居中布局，不更改标题或图解语义。';break;
   case 'hide_badges':t.visualPolicy.decorativeBadges={brand:false,sceneIllustration:false};t.visualPolicy.brandAccentLine=false;applied=true;needRender=true;why='关闭装饰角标，独立披露条目保持原样。';break;
   case 'generate_gain_candidates':applied=true;needAudio=true;why='重用既有混音器生成指定+3/+6候选；保持旁白与总线增益。';break;
   case 'restore_cue_times':for(const c of t.captions){const s=g.evidence.sourceCaptions.find((x:Data)=>x.id===c.id&&x.text===c.text);if(s){c.startSeconds=s.startSeconds;c.endSeconds=s.endSeconds;}}applied=true;needRender=true;why='仅恢复到原始SRT可确定的时间，不更改文本或源字幕文件。';break;
   case 'propose_replan':why='请求 Visual Director 提案；涉及视觉内容或素材改变，不自动采用。';break;
   case 'propose_alternatives':why='从既有推荐排名列出替代项；不自动替换已选素材。';break;
  }
  const identity=(x:Data)=>JSON.stringify(x.scenes.map((s:Data)=>({id:s.id,assetId:s.assetId,kind:s.kind,from:s.from,to:s.to,sourceStart:s.sourceStart,sourceEnd:s.sourceEnd,labels:s.labels})));
  if(identity(before)!==identity(t))throw new Error('Automatic repair tried to change assets, semantics or source intervals');
  logs.push({ruleId:c.ruleId,attempt:1,action:c.repairAction,applied,before,after:structuredClone(t),requiresRender:needRender,requiresAudio:needAudio,manualGate:!applied||c.repairAction==='add_motion',reason:why});render||=needRender;audio||=needAudio;
 }
 return {timeline:t,entries:logs,requiresRender:render,requiresAudio:audio};
}
