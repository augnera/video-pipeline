import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {direct,recommend,finalize,foundationLabels,scoreAsset} from './core.js';
import type {Asset,Settings,SourceTimeline} from './types.js';
const json=(p:string)=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const input=json('../../output/day9-vp005a/timeline.json') as SourceTimeline;
const assets=json('../../output/day9-vp006-poc/asset-catalog.json').assets as Asset[];
const settings:Settings={projectId:'test',episodeId:'fixture',targetSeconds:18,minSeconds:16,maxSeconds:20,fps:30,maxStillSeconds:2,targetMusicBelowVoiceLu:15,masterGainDb:-1.5};
test('real whole-shot windows ranked from narration rather than fixed offset',()=>{
 const b=direct(input,assets,settings);assert.equal(b.mode,'rules');assert.equal(b.modelUsed,null);assert.ok(b.selection.candidateAudit.length>2);
 assert.deepEqual(b.selection.shotNumbers,[3,4]);assert.equal(b.durationInFrames,546);assert.deepEqual(b.requests.map(r=>r.kind),['image_motion','live_action','live_action','diagram']);
});
test('changed episode IDs, shot numbers and absolute timing do not fall back to Day9 constants',()=>{
 const t=structuredClone(input);for(const s of t.shots){s.shotNumber+=100;s.startSeconds+=200;s.endSeconds+=200;}for(const c of t.captions){c.shotNumber+=100;c.startSeconds+=200;c.endSeconds+=200;}
 const b=direct(t,assets,{...settings,episodeId:'other'});assert.deepEqual(b.selection.shotNumbers,[103,104]);assert.ok(b.selection.startSeconds>200);assert.equal(b.episodeId,'other');
});
test('unsupported narrative cannot silently become a body diagram',()=>{
 const t=structuredClone(input);for(const s of t.shots)s.narration='风景和天气';for(const c of t.captions)c.text='风景和天气';assert.throws(()=>direct(t,assets,settings),/lacks supported/);
});
test('diagram labels parsed from supplied narration, not renderer words',()=>{
 const l=foundationLabels('正确的做法是：先稳住现金流，再谈扩张。现金流是整个系统的上限。');assert.equal(l?.foundationLabel,'现金流');assert.equal(l?.progressLabel,'扩张');assert.equal(l?.ceilingLabel,'系统上限');
});
test('facts select actual action and retain original acquisition type',()=>{
 const b=direct(input,assets,settings),p=recommend(b,assets,'existing-catalog');const work=p.recommendations.find(r=>r.kind==='live_action'&&r.sourceStart===0)!;
 assert.equal(work.assetId,'mixkit-39839');assert.equal(work.sourceType,'web_stock');const fatigue=p.recommendations.find(r=>r.assetId==='mixkit-39854')!;assert.equal(fatigue.sourceStart,2);assert.ok(Math.abs(fatigue.sourceEnd!-7.2)<.001);
});
test('file name and tags cannot manufacture semantic match',()=>{
 const a=structuredClone(assets[0]);a.description='A tree';a.actions=[];a.analysis.facts=['A tree in daylight'];a.tags=['office','fatigue','night'];assert.ok(scoreAsset(a,'fatigue','live_action')<8);
});
test('unlicensed or rejected assets cause a recorded gap and prevent render',()=>{
 const b=direct(input,assets,settings);const bad=structuredClone(assets);for(const a of bad)a.license.localExperimentAllowed=false;
 const p=recommend(b,bad,'existing');assert.ok(p.gaps.length>0);assert.throws(()=>finalize(b,p,bad),/gaps prevent render/);
});
test('JSON roundtrip enforces real identities; no manual path repair',()=>{
 const b=JSON.parse(JSON.stringify(direct(input,assets,settings)));const p=JSON.parse(JSON.stringify(recommend(b,assets,'existing')));assert.equal(finalize(b,p,assets).durationInFrames,546);
 p.recommendations[0].localPath='invented.mp4';assert.throws(()=>finalize(b,p,assets),/catalog identity/);
});
test('missing downstream recommendation is rejected rather than filled with text',()=>{
 const b=direct(input,assets,settings),p=recommend(b,assets,'existing');p.recommendations.pop();assert.throws(()=>finalize(b,p,assets),/Missing recommendation/);
});
test('no candidate fitting requested duration is an explicit gap',()=>{assert.throws(()=>direct(input,assets,{...settings,minSeconds:200,maxSeconds:210}),/No contiguous/);});

test('inconsistent source interval and duplicate recommendations do not pass the JSON handoff',()=>{
 const b=direct(input,assets,settings),p=recommend(b,assets,'existing');
 const bad=structuredClone(p);bad.recommendations.find(r=>r.kind==='live_action')!.sourceEnd!+=1;
 assert.throws(()=>finalize(b,bad,assets),/Invalid recommended video range/);
 p.recommendations.push(structuredClone(p.recommendations[0]));assert.throws(()=>finalize(b,p,assets),/Duplicate downstream/);
});

test('semantic transition plan uses visible supported types without changing primary duration',()=>{
 const b=direct(input,assets,settings),p=recommend(b,assets,'existing');const t=finalize(b,p,assets);
 assert.deepEqual(b.transitionPlan.map(t=>t.type),['slide_wipe','whip_pan','zoom_blur']);
 assert.deepEqual(t.transitions.map(t=>t.type),b.transitionPlan.map(t=>t.type));
 assert.equal(t.durationInFrames,546);assert.ok(t.transitions.every(t=>t.durationFrames<=14));
});
