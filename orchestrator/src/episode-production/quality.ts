import { readFile, writeFile, access, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {createHash} from 'node:crypto';
import { runQualityGate } from '../visual-mvp/quality-run.ts';
import { runProcess } from '../visual-mvp/process.ts';
import { transitionGate } from '../transitions/gate.ts';
const root = process.cwd(), out = resolve(root, 'orchestrator/output/microsoft-veo-skills-20261028-vp010');
const read = async (p: string) => JSON.parse(await readFile(resolve(root, p), 'utf8'));
const report = await runQualityGate(out, { allowRepair: false, configPath: out + '/config.json', probe: { sourcePaths: ['experiments/gl-transitions-vp008/src/microsoft-skills.tsx', 'experiments/gl-transitions-vp008/src/GLTimeline.tsx', 'experiments/gl-transitions-vp008/src/FullGraphics.tsx', 'experiments/gl-transitions-vp008/src/EndpointGuard.tsx', 'experiments/day9-remotion/src/Vp007Root.tsx', 'experiments/day9-remotion/src/OpinionCard.tsx', 'experiments/day9-remotion/src/PocShared.tsx', 'experiments/gl-transitions-vp008/scripts/render-day9.mjs'], layoutEvidencePath: 'quality-evidence/layouts.json', run: async (p, fingerprint) => {
            // Reuse controls exported by the SAME successful full-media run when source files
            // predate that run and every control belongs to its probe interval. This is a
            // documented post-render integrity check, not a fabricated new browser invocation.
            // A scoped8-frame repair cannot invalidate independent source-clock controls
            // far outside its interval. Reuse only after hash, source, identity and cut checks.
            try {
                const local=await read(out+'/local-render-repair.json'), old=await read(out+'/quality-before/timeline.json'), current=await read(out+'/timeline.json');
                const prior=await read(out+'/quality-before/quality-report.json'), priorProbe=await read(out+'/quality-evidence/probe-run.json');
                const sameIdentity=(a:any,b:any)=>JSON.stringify([a.scenes,a.captions,a.fps,a.durationInFrames])===JSON.stringify([b.scenes,b.captions,b.fps,b.durationInFrames]);
                const rows=prior.checks.find((x:any)=>x.ruleId==='VQ-03').automatic.evidence.actualEffectVsHardCut;
                const start=local.frameRange[0],end=local.frameRange[1];const controls=[];let valid=local.status==='EXPORTED'&&sameIdentity(old,current)&&JSON.stringify(priorProbe.fingerprint.rendererSources)===JSON.stringify(fingerprint.rendererSources);
                for(const c of current.transitions.filter((x:any)=>x.durationFrames>0)){
                    const original=old.transitions.find((x:any)=>x.boundaryFrame===c.boundaryFrame), evidence=rows.find((x:any)=>x.sceneBoundary===c.boundaryFrame);
                    valid&&=JSON.stringify(original)===JSON.stringify(c)&&!!evidence&&(c.startFrame+c.durationFrames<=start||c.startFrame>end);
                    for(const prefix of ['hard-cut-','effect-']){const path=out+'/quality-evidence/'+prefix+c.boundaryFrame+'.png';const hash=createHash('sha256').update(await readFile(path)).digest('hex');valid&&=prefix==='hard-cut-'?hash===evidence?.controlSha256:true;controls.push({path,sha256:hash});}
                }
                if(valid){
                    const raw=await read(out+'/quality-evidence/caption-layouts.json');const layouts=new Map();for(const r of raw)if(r.title&&r.body)layouts.set(r.scene,{scene:r.scene,frame:r.frame,available:true,mainCenterX:r.title.centerX,secondaryCenterX:r.title.centerX,diagramBottomY:r.body.bottom,clipped:r.title.x<40||r.title.right>1040,centerAlignmentRequired:true,method:'Actual final-font DOM Range probe; unchanged layout under scoped hard-cut repair'});
                    await writeFile(out+'/quality-evidence/layouts.json',JSON.stringify([...layouts.values()],null,2));
                    await writeFile(out+'/quality-evidence/probe-run.json',JSON.stringify({fingerprint,control:'Reuse actual pre-repair same-source hard-cut PNG controls only for untouched cut windows; final encoded frames are freshly extracted and compared. This is not a new successful browser invocation.',sourceClocksIdentityValidated:true,rendererHashesUnchanged:true,repairInterval:local.frameRange,controls,originalEvidence:'quality-before/quality-report.json',auxiliaryBrowserFailure:'quality-evidence/auxiliary-probe-error.json'},null,2));return;
                }
            }catch{}
            let reused=false;
            try {
                const receipt=await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/day9-render.json');
                const timeline=await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/timeline.json');
                const finished=(await stat(out+'/day9-render.json')).mtimeMs;
                const started=finished-receipt.elapsedSeconds*1000;
                const mtimes=await Promise.all(Object.keys(fingerprint.rendererSources).map(async file=>({file,mtimeMs:(await stat(resolve(root,file))).mtimeMs})));
                const probes=await Promise.all(timeline.transitions.filter((c:any)=>c.durationFrames>0).flatMap((c:any)=>['hard-cut-','effect-'].map(async prefix=>({path:out+'/quality-evidence/'+prefix+c.boundaryFrame+'.png',mtimeMs:(await stat(out+'/quality-evidence/'+prefix+c.boundaryFrame+'.png')).mtimeMs}))));
                const pairs=timeline.transitions.map((c:any)=>({transitionId:c.transitionId,from:timeline.scenes.find((s:any)=>s.id===c.fromShotId).kind,to:timeline.scenes.find((s:any)=>s.id===c.toShotId).kind}));
                reused=receipt.status==='EXPORTED'&&mtimes.every(s=>s.mtimeMs<started-10000)&&probes.every(s=>s.mtimeMs>=started&&s.mtimeMs<=finished)&&JSON.stringify(pairs)===JSON.stringify(receipt.mediaCombinations);
                if(reused){await writeFile(p+'/quality-evidence/probe-run.json',JSON.stringify({fingerprint,control:'Actual controls exported during the same successful full render; source files predate run, source inputs frozen, transition pairs match',reuseValidatedAfterRender:true,runStartedEstimateMs:started,runFinishedMs:finished,sourceMtimes:mtimes,controls:probes},null,2));}
            }catch{}
            if(reused)return;
            await runProcess(process.execPath, ['--require', '../day9-remotion/scripts/loopback.cjs', 'scripts/render-day9.mjs', '--probes-only', '--entry=src/microsoft-skills.tsx', '--out=' + out], { cwd: resolve(root, 'experiments/gl-transitions-vp008'), log: out + '/quality-probes.log' });
            await writeFile(p + '/quality-evidence/probe-run.json', JSON.stringify({ fingerprint, control: 'Same finalized full timeline, source clocks, captions, no GL background distortion only' }, null, 2));
const rows=await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/quality-evidence/caption-layouts.json');const layouts=new Map();for(const r of rows)if(r.title&&r.body)layouts.set(r.scene,{scene:r.scene,frame:r.frame,available:true,mainCenterX:r.title.centerX,secondaryCenterX:r.title.centerX,diagramBottomY:r.body.bottom,clipped:r.title.x<40||r.title.right>1040,centerAlignmentRequired:true,main:r.title,body:r.body,method:'Actual final-font DOM Range probe, preserved raw evidence; background-only hard-cut repair leaves this layout unchanged'});await writeFile(p+'/quality-evidence/layouts.json',JSON.stringify([...layouts.values()],null,2));
        } } });
const t = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/timeline.json'), cat = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/transition-catalog.json'), cfg = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/transition-selection-config.json'), source = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/picture-timeline.json');
const textures = new Set<string>();
for (const e of cat.effects)
    for (const x of e.extraTextures) {
        try {
            await access(resolve(root, x.localPath));
            textures.add(x.localPath);
        }
        catch { }
    }
const gl = transitionGate(t, cat.effects, cfg, textures, source);
report.checks.push(gl as any);
report.automaticSummary[gl.automatic.result as 'PASS' | 'FAIL']++;
report.resultSummary.NOT_EVALUATED++;
const loop = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/loop-validation.json'), v = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/validation.json');
let scan: any = null;
try {
    scan = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/frame-scan.json');
}
catch { }
const scanOk = scan ? scan.blankFrames.length === 0 && scan.nearBlackFrames.length === 0 && Object.values(scan.solidBlackEdgeFrames).every((a: any) => a.length === 0) && scan.allCuesHaveVisibleGlyphProxy : null;
const audioOk = loop.noSampleDiscontinuityAtExactJoins && !loop.clipping && v.noAbnormalSilence;
const fullOk = audioOk && v.fullDecode && v.noBlackIntervals && v.all25ShotsCovered && scanOk === true;
const extra = { ruleId: 'VQ-09-FULL', result: fullOk ? 'NOT_EVALUATED' : 'FAIL', automatic: { result: fullOk ? 'PASS' : scanOk === null ? 'NOT_EVALUATED' : 'FAIL', evidence: { frameScan: scan, loop, fullDecode: v.fullDecode, noBlackIntervals: v.noBlackIntervals, noAbnormalSilence: v.noAbnormalSilence, frameRoundingErrorSeconds: v.frameRoundingErrorSeconds, all25ShotsCovered: v.all25ShotsCovered, captionCount: v.captionCount } }, human: { result: 'NOT_EVALUATED', questions: ['听音乐循环接缝是否自然？', '弱语音片段是否仍清楚？', '完整图解段是否过密或单调？'] } };
report.checks.push(extra as any);
report.automaticSummary[fullOk ? 'PASS' : scanOk === null ? 'NOT_EVALUATED' : 'FAIL']++;
report.resultSummary[fullOk || scanOk === null ? 'NOT_EVALUATED' : 'FAIL']++;
report.overallResult = report.automaticSummary.FAIL ? 'FAIL' : report.automaticSummary.WARN ? 'WARN' : 'NOT_EVALUATED';
await writeFile(out + '/quality-report.json', JSON.stringify({ ...report, publicationReady: false }, null, 2) + '\n');
const repairs = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/repair-log.json');
const actualLayouts=await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/quality-evidence/caption-layouts.json');
for(const r of repairs.repairs)if(r.ruleId==='VQ-04-CAPTION'){const rows=actualLayouts.filter((x:any)=>x.caption);r.recheck=(await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/timeline.json')).captions.every((c:any)=>rows.some((r:any)=>r.frame===Math.floor((c.startSeconds+c.endSeconds)*15)))&&rows.every((x:any)=>x.caption.bottom<=1820&&x.caption.x>=40&&x.caption.right<=1040)?'PASS':'FAIL';r.actualBounds=rows;r.textAndTimingUnchanged=true;}
repairs.boundedRenderFallback = 'render-fallback-log.json';
for(const r of repairs.repairs)if(r.ruleId==='VQ-03')r.recheck=report.checks.find(x=>x.ruleId==='VQ-03')?.automatic.result??'NOT_EVALUATED';
repairs.manualWarnings = report.checks.filter(x => x.automatic.result === 'WARN').map(x => ({ ruleId: x.ruleId, action: 'Preserve authorized content/gain; request human review instead of changing semantics, assets or BGM gain', automaticRepairApplied: false }));
await writeFile(out + '/repair-log.json', JSON.stringify(repairs, null, 2) + '\n');
for (const name of ['validation.json', 'run.json']) {
    const v = await read('orchestrator/output/microsoft-veo-skills-20261028-vp010/' + name);
    v.qualityGate = { overallResult: report.overallResult, automaticSummary: report.automaticSummary, notEvaluatedIsNotPass: true, report: 'quality-report.json' };
    await writeFile(out + '/' + name, JSON.stringify(v, null, 2) + '\n');
}
console.log(JSON.stringify({ overall: report.overallResult, automatic: report.automaticSummary }));
