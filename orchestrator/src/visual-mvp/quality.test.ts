import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct,recommend,finalize} from './core.js';
import {evaluateGate,boundedRepairs,type GateInputs} from './quality.js';
const read=(p:string)=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
function fixture():GateInputs{
 const source=read('../../output/day9-vp005a/timeline.json'),catalog=read('../../output/day9-vp006-poc/asset-catalog.json').assets;
 const cfg=read('../../config/visual-mvp.json'),rules=read('../../config/quality-rules.json');
 const brief=direct(source,catalog,cfg),proposal=recommend(brief,catalog,cfg.inputs.catalog),t=finalize(brief,proposal,catalog) as any;
 t.captions=source.captions.filter((c:any)=>c.startSeconds>=t.globalStartSeconds-.002&&c.endSeconds<=t.globalEndSeconds+.002);
 t.visualPolicy={decorativeBadges:{brand:false,sceneIllustration:false},brandAccentLine:false};
 t.disclosures=[{assetId:'ai-night-desk-v1',fromFrame:0,toFrame:66,status:'required',label:'Example required content notice',reason:'Test fixture'}];
 const variant=(boost:number)=>({boostDb:boost,gainDb:-17.3+boost,margins:{minThreeSecondRmsMarginDb:10},mixedLevel:{truePeakDbfs:-3}});
 return {timeline:t,brief,proposal,catalog,validation:{voiceSliceSampleExact:true},bgm:{baselineMusicGainDb:-17.3,variants:[variant(3),variant(6)],stemChecks:{voiceComponentSameWithinPcmQuantization:true}},rules,evidence:{sourceIntegrity:true,validationMatchesCurrentMedia:true,sourceCaptions:structuredClone(t.captions),media:{frameCount:546,videoDurationSeconds:18.2,width:1080,height:1920,fps:'30/1'},transitionComparisons:t.transitions.map((x:any)=>({sceneBoundary:x.boundaryFrame,effectVsHardCutMad:20,subtitleMaskIou:.99})),layouts:[{available:true,mainCenterX:540,secondaryCenterX:540,diagramBottomY:1420,clipped:false}]}};
}
const find=(g:GateInputs,id:string)=>evaluateGate(g).find(c=>c.ruleId===id)!;
test('all eight rules distinguish automatic pass from unperformed model/human review',()=>{
 const checks=evaluateGate(fixture());assert.equal(checks.length,8);assert.ok(checks.every(c=>c.automatic.result==='PASS'));assert.ok(checks.every(c=>c.result==='NOT_EVALUATED'));assert.ok(checks.every(c=>c.human.result==='NOT_EVALUATED'));
});
test('VQ01 one motion repair cannot falsely clear a long-still advisory',()=>{
 const g=fixture();g.rules.thresholds.stillWarningSeconds=1;g.timeline.scenes[0].motion={scaleFrom:1,scaleTo:1,panX:0,panY:0};
 const before=find(g,'VQ-01');assert.equal(before.automatic.result,'WARN');const r=boundedRepairs(g,[before]);assert.equal(r.entries.length,1);assert.equal(r.requiresRender,true);
 const after={...g,timeline:r.timeline};assert.equal(find(after,'VQ-01').automatic.result,'WARN');assert.equal(boundedRepairs(after,[find(after,'VQ-01')],r.entries).entries.length,0);
});
test('VQ02 replan is proposal-only, never automatic semantic/material replacement',()=>{
 const g=fixture();g.timeline.scenes.forEach((s:any)=>s.kind='diagram');const r=boundedRepairs(g,[find(g,'VQ-02')]);assert.equal(r.entries[0].applied,false);assert.equal(r.entries[0].manualGate,true);assert.deepEqual(r.timeline,g.timeline);
});
test('VQ03 restores plan once; actual missing effect remains FAIL until new evidence',()=>{
 const g=fixture();g.timeline.transitions=[];g.evidence.transitionComparisons[0].effectVsHardCutMad=0;
 const r=boundedRepairs(g,[find(g,'VQ-03')]);assert.equal(r.requiresRender,true);const after={...g,timeline:r.timeline};assert.equal(find(after,'VQ-03').automatic.result,'FAIL');
 after.evidence=structuredClone(g.evidence);after.evidence.transitionComparisons[0].effectVsHardCutMad=20;assert.equal(find(after,'VQ-03').automatic.result,'PASS');
 after.evidence.transitionComparisons[0].effectVsHardCutMad=0;assert.equal(boundedRepairs(after,[find(after,'VQ-03')],r.entries).entries.length,0);
});
test('VQ04 layout repair cannot pass using stale off-axis pixels',()=>{
 const g=fixture();g.timeline.scenes.at(-1).layout='legacy';g.evidence.layouts[0].mainCenterX=300;
 const r=boundedRepairs(g,[find(g,'VQ-04')]);const after={...g,timeline:r.timeline};assert.equal(find(after,'VQ-04').automatic.result,'FAIL');
 after.evidence=structuredClone(g.evidence);after.evidence.layouts[0].mainCenterX=540;assert.equal(find(after,'VQ-04').automatic.result,'PASS');assert.equal(after.timeline.scenes.at(-1).labels.mainTitle,g.timeline.scenes.at(-1).labels.mainTitle);
});
test('VQ05 closes decorative badges without removing required disclosure',()=>{
 const g=fixture();g.timeline.visualPolicy.decorativeBadges={brand:true,sceneIllustration:true};const r=boundedRepairs(g,[find(g,'VQ-05')]);assert.deepEqual(r.timeline.disclosures,g.timeline.disclosures);assert.equal(find({...g,timeline:r.timeline},'VQ-05').automatic.result,'PASS');
});
test('VQ06 missing gain candidates requests audio-only repair; fixed +6 listening warning is not auto-reduced',()=>{
 const g=fixture();g.bgm.variants=[];let r=boundedRepairs(g,[find(g,'VQ-06')]);assert.equal(r.requiresAudio,true);assert.equal(r.requiresRender,false);assert.deepEqual(r.timeline,g.timeline);
 const normal=fixture();normal.bgm.variants[1].margins.minThreeSecondRmsMarginDb=7;assert.equal(find(normal,'VQ-06').automatic.result,'WARN');assert.equal(find(normal,'VQ-06').repairAction,null);
});
test('VQ07 unclear license and changed material are manual; repeated asset alternatives are never applied',()=>{
 const g=fixture();g.catalog[0].licenseStatus='unknown';assert.equal(find(g,'VQ-07').automatic.result,'FAIL');assert.equal(find(g,'VQ-07').repairAction,null);
 const repeat=fixture();const s=structuredClone(repeat.timeline.scenes[0]);repeat.timeline.scenes.push(s,structuredClone(s));const r=boundedRepairs(repeat,[find(repeat,'VQ-07')]);assert.equal(r.entries[0].applied,false);assert.deepEqual(r.timeline,repeat.timeline);
});
test('VQ08 restores known source cue times, never source text or audio',()=>{
 const g=fixture();g.timeline.captions[0].endSeconds=g.timeline.captions[1].startSeconds+.01;const r=boundedRepairs(g,[find(g,'VQ-08')]);assert.equal(r.requiresRender,true);assert.equal(find({...g,timeline:r.timeline},'VQ-08').automatic.result,'PASS');assert.deepEqual(r.timeline.captions,g.evidence.sourceCaptions);
 g.timeline.captions[0].text='Invented text';assert.equal(find(g,'VQ-08').repairAction,null);
});
test('absent image measurements are NOT_EVALUATED, not PASS',()=>{
 const g=fixture();g.evidence.layouts=[];g.evidence.transitionComparisons=[];assert.equal(find(g,'VQ-03').automatic.result,'NOT_EVALUATED');assert.equal(find(g,'VQ-04').automatic.result,'NOT_EVALUATED');
});
test('missing subtitle cue and invalid audio proof fail without fabricated repairs',()=>{
 const g=fixture();g.timeline.captions.pop();assert.equal(find(g,'VQ-08').automatic.result,'FAIL');assert.equal(find(g,'VQ-08').repairAction,null);g.validation.voiceSliceSampleExact=false;assert.equal(find(g,'VQ-08').repairAction,null);
});
