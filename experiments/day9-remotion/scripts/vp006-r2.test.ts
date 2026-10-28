import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeDisclosures,disclosureReviewComplete,validateDisclosures,type Disclosure} from '../src/content-disclosure';
import config from '../src/generated/vp006-r2-effects.json';
import policy from '../../../orchestrator/config/xiaochen-visual.json';
const pending:Disclosure={assetId:'example-ai',fromFrame:0,toFrame:60,status:'pending_review',label:null,reason:'Pending platform-specific review'};
test('default corner badges off while unresolved disclosure review blocks publish readiness',()=>{
 assert.equal(policy.decorativeBadges.brand,false);assert.equal(policy.decorativeBadges.sceneIllustration,false);
 assert.equal(disclosureReviewComplete([pending]),false);assert.deepEqual(activeDisclosures([pending],20),[]);
});
test('required content disclosure remains active independently of decorative badges',()=>{
 const d:Disclosure={...pending,status:'required',label:'Example meaningful disclosure'};
 assert.equal(activeDisclosures([d],0).length,1);assert.equal(activeDisclosures([d],59).length,1);assert.equal(activeDisclosures([d],60).length,0);
 assert.equal(disclosureReviewComplete([d]),true);
});
test('missing disclosure text and unknown status rejected',()=>{
 assert.throws(()=>validateDisclosures([{...pending,status:'required'}]));
 assert.throws(()=>validateDisclosures([{...pending,status:'skip' as Disclosure['status']}]));
});
test('R2 is 546 contiguous primary frames with original later boundaries',()=>{
 assert.deepEqual(config.scenes.map(s=>s.from),[0,60,107,263]);assert.equal(config.scenes.at(-1)?.to,546);
 for(let i=1;i<config.scenes.length;i++)assert.equal(config.scenes[i-1].to,config.scenes[i].from);
});
test('still-image dwell includes overlap; R2 is below advisory threshold',()=>{
 const night=config.scenes[0];const t=config.transitions.find(t=>t.boundaryFrame===night.to)!;
 assert.equal((t.startFrame+t.durationFrames-night.from)/30,2);
 assert.equal(config.scenes.filter(s=>s.id==='night').length,1);
});
