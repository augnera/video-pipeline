// Isolated integration fault: a missing +6 candidate/manifest. Never mutate delivery/source media.
import {mkdtemp,copyFile,readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {runQualityGate} from './quality-run.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..'),delivery=resolve(root,'orchestrator/output/day9-vp007');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');const before=sha(await readFile(resolve(delivery,'sample.mp4')));
const fixture=await mkdtemp(resolve(tmpdir(),'vp007-quality-fixture-'));
for(const name of ['visual-brief.json','asset-proposal.json','timeline.json','validation.json','bgm-config.json','inputs.before.json','capability.json','run.json','visual-with-voice.mp4','sample.mp4','sample-bgm-plus3.mp4'])await copyFile(resolve(delivery,name),resolve(fixture,name));
await cp(resolve(delivery,'quality-evidence'),resolve(fixture,'quality-evidence'),{recursive:true});
const bgm=JSON.parse(await readFile(resolve(fixture,'bgm-config.json'),'utf8'));bgm.variants=[];await writeFile(resolve(fixture,'bgm-config.json'),JSON.stringify(bgm,null,2)+'\n');
const report=await runQualityGate(fixture);const log=JSON.parse(await readFile(resolve(fixture,'repair-log.json'),'utf8'));
const row=report.checks.find(c=>c.ruleId==='VQ-06')!;assert.equal(log.repairs.length,1);assert.equal(log.repairs[0].ruleId,'VQ-06');assert.equal(log.repairs[0].attempt,1);assert.equal(log.repairs[0].requiresAudio,true);assert.equal(log.repairs[0].requiresRender,false);assert.equal(log.executionError,null);assert.equal((row.automatic.evidence as {missingGains:boolean}).missingGains,false);assert.equal(row.recheck.performed,true);
assert.equal(row.result,'WARN'); // +6 quiet-speech warning remains, never reclassified as a subjective PASS.
const plus6=await readFile(resolve(fixture,'sample-bgm-plus6.mp4'));assert.ok(plus6.length>1000);assert.equal(sha(await readFile(resolve(delivery,'sample.mp4'))),before);
await copyFile(resolve(delivery,'timeline.json'),resolve(root,'experiments/day9-remotion/src/generated/vp007-timeline.json'));
const result={status:'PASS',fixtureDirectory:fixture,failureInjected:'Missing +6 MP4 and empty gain-candidate manifest in an isolated copy',repairs:1,visualRerenders:0,audioRepairs:1,oneAttemptLimit:true,recheckResult:row.result,missingCandidateResolved:true,plus6ActuallyProduced:true,deliverySampleUnchanged:true,sourceFilesUnchanged:report.initialChecks.find(c=>c.ruleId==='VQ-08')?.automatic.result==='PASS',note:'This is an isolated test, not a fabricated defect or repair count in the delivery sample.'};
await writeFile(resolve(delivery,'quality-integration-test.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
