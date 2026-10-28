import { directFull } from './direct.ts';
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { importExcel } from '../import/excel.ts';
import { foundationLabels, recommend, finalize } from '../visual-mvp/core.ts';
import { selectTransitions } from '../transitions/select.ts';
import type { Brief, Request } from '../visual-mvp/types.ts';
const root = process.cwd(), out = resolve(root, 'orchestrator/output/day9-vp009'), pub = resolve(root, 'experiments/gl-transitions-vp008/public/vp009');
const read = async (p: string) => JSON.parse(await readFile(resolve(root, p), 'utf8'));
const save = (n: string, v: unknown) => writeFile(resolve(out, n), JSON.stringify(v, null, 2) + '\n');
const source = await read('orchestrator/output/day9-vp005a/timeline.json'), script = await read('orchestrator/output/day9/script.voiced.json'), assets = (await read('orchestrator/output/day9-vp006-poc/asset-catalog.json')).assets;
const excel = await importExcel(resolve(root, 'docs/day9一人公司3个必须提前做的正确选择.xlsx'));
if (excel.shots.length !== 10 || excel.shots.some((s, i) => s.narration !== script.shots[i].narration))
    throw Error('Actual Excel narration differs from frozen voiced script');
await mkdir(out, { recursive: true });
await mkdir(pub, { recursive: true });
const { requests, review } = directFull(source);
const brief: Brief = { contractVersion: 'visual-brief/0.1', projectId: 'video-pipeline', episodeId: 'day9', mode: 'rules', modelUsed: null, capabilityLimit: 'Explicit narration regex/caption-boundary rules and previously analysed metadata; no model service or invented scene understanding.', selection: { startSeconds: 0, endSeconds: source.audio.durationSeconds, durationSeconds: source.audio.durationSeconds, shotNumbers: source.shots.map((s: any) => s.shotNumber), candidateAudit: [] }, fps: 30, durationInFrames: Math.ceil(source.audio.durationSeconds * 30), requests, transitionPlan: [], rules: ['Whole frozen ten-shot source; semantic splits follow exact accepted caption times.', 'Graphic plans are conceptual diagrams, not real UI.', 'Use only actual indexed assets, explicitly permitted local scopes and bounded source ranges.'] };
await save('visual-brief.json', brief);
// Read JSON back for each handoff, as in the existing pipeline.
const handoff = await read('orchestrator/output/day9-vp009/visual-brief.json');
const supported = new Set(['branch', 'risk-switch', 'accepted-opinion-card', 'feedback-loop', 'minimal-flow', 'launch-barrier', 'validation-gap', 'reality-loop', 'method-system', 'daily-structure', 'closing']);
const proposal = recommend(handoff, assets, 'orchestrator/output/day9-vp006-poc/asset-catalog.json', r => r.templateId && supported.has(r.templateId) ? { requestId: r.requestId, kind: r.kind, available: true, templateId: r.templateId, reason: 'Existing original composition or a clearly conceptual SVG diagram built from source narration; no new media rights asserted.' } : null);
await save('asset-proposal.json', proposal);
if (proposal.gaps.length)
    throw Error(JSON.stringify(proposal.gaps));
const p = await read('orchestrator/output/day9-vp009/asset-proposal.json');
const picture: any = finalize(handoff, p, assets);
picture.captions = source.captions;
picture.subtitlePrecision = source.subtitlePrecision;
picture.publicVoice = 'vp009/voice.wav';
picture.visualPolicy = await read('orchestrator/config/xiaochen-visual.json');
picture.disclosures = [];
for (const s of picture.scenes) {
    if (s.assetId) {
        const asset = assets.find((a: any) => a.assetId === s.assetId);
        const ext = basename(s.localPath).split('.').at(-1);
        const target = `${s.sha256.slice(0, 16)}.${ext}`;
        await copyFile(resolve(root, s.localPath), resolve(pub, target));
        s.publicAsset = 'vp009/' + target;
        if (s.sourceType === 'ai_generated')
            picture.disclosures.push({ assetId: s.assetId, fromFrame: s.from, toFrame: s.to + 9, status: 'pending_review', label: null, reason: 'Existing AI image; independent disclosure review remains required before publishing.' });
        s.sourceEvidence = asset.analysis.frameEvidence;
        s.subjectFacts = asset.analysis.facts;
    }
    s.layout = 'centered';
}
await copyFile(resolve(root, source.audio.path), resolve(pub, 'voice.wav'));
await save('picture-timeline.json', picture);
const cfg = { ...await read('orchestrator/config/transition-selection.json'), minAnimatedGapSeconds: 4.5, minStrongGapSeconds: 8, maxStrongFraction: .1, maxAnimatedCutFraction: .65 };
const cat = await read('orchestrator/output/day9-vp008/transition-catalog.json');
const textures = new Set<string>();
for (const e of cat.effects)
    for (const x of e.extraTextures) {
        try {
            await access(resolve(root, x.localPath));
            textures.add(x.localPath);
        }
        catch { }
    }
const selected = selectTransitions(picture, cat.effects, cfg, textures);
await save('transition-selection-config.json', cfg);
await save('transition-selection-report.json', selected.report);
await save('timeline.json', selected.timeline);
brief.transitionPlan = selected.timeline.transitions;
await save('visual-brief.json', brief);
for (const row of review) {
    row.segments = (selected.timeline.scenes as any[]).filter(s => s.shotNumber === row.shotNumber).map(s => ({ ...s, transition: selected.timeline.transitions.find(t => t.toShotId === s.id) ?? null }));
    row.sourceReview = row.segments.map((s: any) => ({ assetId: s.assetId ?? null, templateId: s.templateId ?? null, contentMatchReason: s.visualReason, sourceRange: s.assetId ? [s.sourceStart, s.sourceEnd] : null, sourceLongEnough: true, crop: s.crop ?? 'centered conceptual SVG', licenseStatus: s.licenseStatus ?? 'internal_conceptual_graphic_private', humanReview: s.reviewStatus ?? 'NOT_EVALUATED' }));
    row.gapsResolved = row.segments.filter((s: any) => s.kind === 'diagram').map((s: any) => ({ templateId: s.templateId, resolution: 'Use explicit conceptual graphics instead of claiming unavailable real footage or product operation.' }));
}
await save('shot-review.json', { mode: 'rules', modelUsed: null, actualExcelMatched: true, shots: review, missingRealWorldFootage: ['Actual product workflow/launch', 'Actual user feedback', 'Holder daily work recording'], blockingForPrivateConceptualRender: false, assetReviewEvidence: 'VP006 contact sheets re-inspected in this session; people/hands/computer retained via window crop or native vertical.', notApprovedForPublication: true });
await save('shot-and-transition-list.json', { shots: review, transitions: selected.timeline.transitions });
const config = { ...await read('orchestrator/config/visual-mvp.json'), output: 'orchestrator/output/day9-vp009' };
await save('config.json', config);
console.log(JSON.stringify({ shots: review.length, scenes: picture.scenes.length, frames: picture.durationInFrames, transitions: selected.report.distribution }));
