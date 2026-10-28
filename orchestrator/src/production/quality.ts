import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { evaluateGate, boundedRepairs } from '../visual-mvp/quality.ts';
import {downgrade} from '../transitions/select.ts';
import { transitionGate } from '../transitions/gate.ts';
import { runProcess } from '../visual-mvp/process.ts';
import { root, read, save, digest, Blocked, exists } from './core.ts';
import { ff, probe, renderPicture, compose } from './media.ts';
import { validateOverlays } from './overlays.ts';
async function mad(a: string, b: string, filter: string) { const raw = (p: string) => ff(['-v', 'error', '-i', p, '-vf', filter, '-frames:v', '1', '-f', 'rawvideo', '-']); const [x, y] = await Promise.all([raw(a), raw(b)]); if (x.length !== y.length || !x.length)
    throw Error('Invalid pixel evidence'); let sum = 0; for (let i = 0; i < x.length; i++)
    sum += Math.abs(x[i] - y[i]); return sum / x.length; }
export async function inspectQuality(dir: string, video: string, t: any, voiceCaps: any[], catalog: any[], brief: any, proposal: any, bgm: any, loop: any, renderEvidence: string, c: any) {
    await mkdir(dir, { recursive: true });
    await ff(['-v', 'error', '-i', video, '-f', 'null', '-']);
    const info = await probe(video), v = info.streams.find((s: any) => s.codec_type === 'video');
    const blackLog = dir + '/black.log', silenceLog = dir + '/silence.log';
    await ff(['-i', video, '-vf', 'blackdetect=d=0.04:pix_th=0.1:pic_th=0.98', '-an', '-f', 'null', '-'], blackLog);
    await ff(['-i', video, '-vn', '-af', 'silencedetect=n=-50dB:d=1', '-f', 'null', '-'], silenceLog);
    const visual = await read(renderEvidence);
    const comparisons: any[] = [];
    for (const cut of t.transitions.filter((x: any) => x.durationFrames)) {
        const actual = dir + '/encoded-' + cut.boundaryFrame + '.png', control = resolve(renderEvidence, '../control-' + cut.boundaryFrame + '.png');
        await ff(['-v', 'error', '-y', '-i', video, '-vf', `select=eq(n\\,${cut.boundaryFrame})`, '-frames:v', '1', actual]);
        const difference = await mad(actual, control, 'crop=iw:1620:0:0,scale=160:240,format=gray');
        const active = voiceCaps.some(c => cut.boundaryFrame / 30 >= c.startSeconds && cut.boundaryFrame / 30 < c.endSeconds);
        let iou: null | number = null;
        if (active) {
            const raw = (p: string) => ff(['-v', 'error', '-i', p, '-vf', `crop=${1080 - c.captions.left - c.captions.right}:200:${c.captions.left}:${c.captions.top - 20},format=gray`, '-frames:v', '1', '-f', 'rawvideo', '-']);
            const [a, b] = await Promise.all([raw(actual), raw(control)]);
            let union = 0, both = 0;
            for (let i = 0; i < a.length; i++) {
                if (a[i] > 200 || b[i] > 200)
                    union++;
                if (a[i] > 200 && b[i] > 200)
                    both++;
            }
            iou = union ? both / union : 0;
        }
        comparisons.push({ sceneBoundary: cut.boundaryFrame, effectVsHardCutMad: difference, subtitleMaskIou: iou, subtitleExpected: active, actual, control });
    }
    const layouts = t.scenes.filter((s: any) => s.kind === 'diagram').map((s: any) => { const row = visual.layouts.find((r: any) => r.scene === s.id && r.title && r.body); return { scene: s.id, available: !!row, mainCenterX: row?.title.centerX, secondaryCenterX: row?.subtitle?.centerX ?? row?.title.centerX, diagramBottomY: row?.body.bottom, clipped: !!row && (row.title.x < 40 || row.title.right > 1040), method: 'Actual DOM Range after fonts.ready' }; });
    const validation = { sampleSha256: await digest(video), fullDecode: true, noBlackIntervals: !(await readFile(blackLog, 'utf8')).includes('black_start:'), noAbnormalSilence: !(await readFile(silenceLog, 'utf8')).includes('silence_start:'), voiceSliceSampleExact: bgm.stemChecks.voiceComponentSameWithinPcmQuantization, frameCount: Number(v.nb_frames), videoDurationSeconds: Number(v.duration), captionCount: t.captions.length, sourceIntegrity: true };
    await save(dir + '/validation.json', validation);
    const scanRequest = dir + '/scan-request.json';
    await save(scanRequest, { out: dir, video, timeline: t, captionRect: { x: c.captions.left, y: c.captions.top - 20, width: 1080 - c.captions.left - c.captions.right, height: 200 } });
    await runProcess(c.paths.python, [resolve(root, 'orchestrator/src/episode-production/frame_scan.py'), '--request', scanRequest], { log: dir + '/frame-scan.log' });
    const scan = await read(dir + '/frame-scan.json');
    const evidence = { sourceIntegrity: true, sourceCaptions: voiceCaps, validationMatchesCurrentMedia: true, layouts, transitionComparisons: comparisons, media: { frameCount: Number(v.nb_frames), videoDurationSeconds: Number(v.duration), width: v.width, height: v.height, fps: v.r_frame_rate } };
    const rules = await read(c.quality.rulesRef);
    const input = { timeline: t, brief, proposal, catalog, validation, bgm, evidence, rules };
    const checks = evaluateGate(input);
    const gl = transitionGate(t, (await read(c.transitions.catalogRef)).effects, { ...(await read(c.transitions.configRef)), ...c.transitions }, new Set(), t);
    checks.push(gl as any);
    validateOverlays(t, c);
    const expected = t.overlays ?? [];
    const overlayRows = visual.layouts.flatMap((r: any) => (r.overlays ?? []).map((o: any) => ({ ...o, frame: r.frame })));
    const overlayErrors = expected.flatMap((o: any) => { const rows = overlayRows.filter((r: any) => r.id === o.id); return !rows.length ? [o.id + ': missing actual DOM probe'] : rows.some((r: any) => r.bottom > c.captions.top - 24 || r.right > 1040 || r.x < 40 || r.scrollHeight > r.clientHeight + 1) ? [o.id + ': clipped/unsafe actual DOM'] : []; });
    const add = (ruleId: string, status: string, data: any) => ({ ruleId, result: status === 'PASS' ? 'NOT_EVALUATED' : status, automatic: { result: status, evidence: data }, human: { result: 'NOT_EVALUATED', questions: ['实际视觉/听觉由持有人确认'] }, modelAssisted: { result: 'NOT_EVALUATED' }, repairAction: null } as any);
    const cueLayoutErrors = t.captions.flatMap((cap: any) => { const frame = Math.floor((cap.startSeconds + cap.endSeconds) * 15), row = visual.layouts.find((r: any) => r.frame === frame && r.caption); return !row ? [cap.id + ': missing actual caption layout'] : row.caption.x < 40 || row.caption.right > 1040 || row.caption.bottom > c.captions.safeBottom ? [cap.id + ': actual caption outside safe area'] : []; });
    checks.push(add('VQ-CAPTION-LAYOUT', cueLayoutErrors.length ? 'FAIL' : 'PASS', { cueLayoutErrors }));
    checks.push(add('VQ-OVERLAY', overlayErrors.length ? 'FAIL' : 'PASS', { overlayErrors, actualRows: overlayRows }));
    const full = validation.fullDecode && validation.noBlackIntervals && validation.noAbnormalSilence && scan.blankFrames.length === 0 && scan.nearBlackFrames.length === 0 && Object.values(scan.solidBlackEdgeFrames).every((x: any) => !x.length) && scan.allCuesHaveVisibleGlyphProxy && Number(v.nb_frames) === t.durationInFrames;
    checks.push(add('VQ-FULL', full ? 'PASS' : 'FAIL', { validation, scan, loop }));
    const summary: any = { PASS: 0, WARN: 0, FAIL: 0, NOT_EVALUATED: 0 };
    for (const x of checks)
        summary[x.automatic.result]++;
    const report = { version: 'production-quality/1', overallResult: summary.FAIL ? 'FAIL' : summary.WARN ? 'WARN' : 'NOT_EVALUATED', automaticSummary: summary, checks, publicationReady: false, subjective: 'NOT_EVALUATED' };
    await save(dir + '/measurements.json', evidence);
    await save(dir + '/quality-report.json', report);
    return { report, input };
}
export function planProductionRepairs(input:any, checks:any[], previous:any[]=[]) {
    const repair=boundedRepairs(input,checks,previous);
    const weak=checks.find(c=>c.ruleId==='VQ-03')?.automatic.evidence.actualEffectVsHardCut?.filter((p:any)=>p.effectVsHardCutMad<input.rules.thresholds.effectVsHardCutMadMinimum)??[];
    if(weak.length&&!previous.some(p=>p.ruleId==='VQ-03'&&p.attempt>0)){
        const change=downgrade(repair.timeline as any,weak.map((p:any)=>p.sceneBoundary),'Actual-frame contrast below existing Gate threshold; bounded hard-cut fallback');
        repair.timeline=change.timeline;repair.entries=repair.entries.filter(e=>e.ruleId!=='VQ-03');repair.entries.push({ruleId:'VQ-03',attempt:1,action:'hard_cut_low_contrast',applied:true,before:input.timeline,after:change.timeline,requiresRender:true,requiresAudio:false,manualGate:false,reason:'Actual encoded/control evidence; no effect rotation or threshold relaxation'});repair.requiresRender=true;
    }
    return repair;
}
export async function qualityAndRepair(dir: string, args: any) {
    const { video, timeline, voiceCaps, assets, brief, proposal, bgm, loop, renderEvidence, c, audio } = args;
    const planPath=dir+'/repair-plan.json',saved=await exists(planPath)?await read(planPath):null;
    if(saved&&saved.inputVideoSha256!==await digest(video))throw Error('Repair plan input changed');
    if(saved?.complete){for(const a of saved.outputsHashes)if(await digest(a.path)!==a.sha256)throw Error('Completed repair cache changed');return saved.outputs;}
    let finalVideo = video, finalTimeline = timeline, ev = renderEvidence;
    const initial = await inspectQuality(dir, video, timeline, voiceCaps, assets, brief, proposal, bgm, loop, ev, c);
    let result = initial;
    // An interrupted repair resumes the same recorded attempt, not a fresh repair budget.
    const repair=saved?.repair??planProductionRepairs(initial.input,initial.report.checks,[]);
    await save(planPath,{complete:false,inputVideoSha256:await digest(video),repair});
    const permitted = repair.entries.filter((e:any) => e.applied);
    if (permitted.length) {
        if (repair.requiresAudio) throw new Blocked('AUDIO_REPAIR_REVIEW', 'Do not silently change the configured audition gain after clipping');
        const picture = await renderPicture(dir + '/repair-render', repair.timeline, c);
        finalTimeline = await read(picture.timeline);
        finalVideo = await compose(dir + '/repair-compose', picture.picture, audio);
        ev = picture.evidence;
        result = await inspectQuality(dir + '/recheck', finalVideo, finalTimeline, voiceCaps, assets, { ...brief, transitionPlan: finalTimeline.transitions }, proposal, bgm, loop, ev, c);
    }
    await save(dir + '/repair-log.json', { maxAutomaticRepairsPerRule: 1, repairs: repair.entries, initialReport: dir + '/quality-report.json', rechecked: !!permitted.length, finalAutomatic: result.report.automaticSummary });
    await save(dir + '/final-timeline.json', finalTimeline);
    await save(dir + '/final-quality-report.json', result.report);
    const outputs={ video: finalVideo, timeline: dir + '/final-timeline.json', report: dir + '/final-quality-report.json', repairs: dir + '/repair-log.json', validation: dir + (permitted.length ? '/recheck' : '') + '/validation.json', failed: result.report.automaticSummary.FAIL > 0 };
    await save(planPath,{complete:true,inputVideoSha256:await digest(video),repair,outputs,outputsHashes:await Promise.all([outputs.video,outputs.timeline,outputs.report,outputs.repairs,outputs.validation].map(async path=>({path,sha256:await digest(path)})))});
    return outputs;
}
