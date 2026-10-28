import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { selectTransitions } from '../transitions/select.ts';
import { root, read, save, Blocked, digest } from './core.ts';
import { validateOverlays } from './overlays.ts';
/** Drop only explicit decorative badge lines when deriving optional keyword overlays. */
export function keywordText(text:string){return text.split(/\r?\n/).filter(line=>!/^\s*(?:(?:品牌|常驻)?角标[：:]?\s*)?(?:小陈AI说|情景示意|情境示意)(?:角标)?\s*$/.test(line)).join('\n').trim()}
export function intentBrief(script: any) { return { contractVersion: 'visual-brief/0.1', episodeId: script.episodeId, mode: 'rules', modelUsed: null, capabilityLimit: 'Narration and supplied visual intent only; no model scene/focus recognition or automatic web search', requests: script.shots.map((s: any) => ({ requestId: 'shot-' + s.shotNumber, shotNumber: s.shotNumber, narration: s.narration, visualIntent: s.visualDescription, overlayText: s.overlayText, preferBase: /录屏|代码|操作界面/.test(s.visualDescription) ? 'screen_recording' : 'real_stock', reason: 'Frozen narration and supplied visual intent; concrete material requires verified index/match' })) }; }
export async function assembleTimeline(script: any, voiced: any, captions: any[], assets: any[], matches: any[], resources: any, c: any) {
    let t: any;
    if (resources.timeline) {
        t = await read(resources.timeline);
        if (resources.legacy)
            return t;
    }
    else {
        const scenes: any[] = [];
        for (let i = 0; i < script.shots.length; i++) {
            const s = script.shots[i], v = voiced.shots[i];
            const from = Math.round(v.voiceover.timelineStartSeconds * 30), to = i + 1 < voiced.shots.length ? Math.round(voiced.shots[i + 1].voiceover.timelineStartSeconds * 30) : Math.ceil(v.voiceover.timelineEndSeconds * 30) + c.video.closingHoldFrames;
            const ms = matches.filter(m => m.shotNumber === s.shotNumber && m.matchStatus !== 'rejected');
            if (ms.length !== 1)
                throw new Blocked('SECOND_ARRANGEMENT_REQUIRED', 'For multiple matches per shot provide an actual voice-timed timeline, not guessed segment boundaries', [s.shotNumber]);
            const m = ms[0], a = assets.find(a => a.assetId === m.assetId);
            if (!a)
                throw Error('Missing matched asset');
            const kind = a.mediaType === 'image' ? 'image_motion' : /document_editing|screen_recording/.test(a.tags.join(' ')) ? 'screen_recording' : 'live_action';
            const duration = (to - from) / 30;
            const start = a.mediaType === 'video' ? m.segmentStart : null;
            if (a.mediaType === 'video' && (start == null || m.segmentEnd - start < duration))
                throw new Blocked('SOURCE_MARGIN', 'Matched source cannot cover actual voice duration', [s.shotNumber]);
            scenes.push({ id: 'shot-' + s.shotNumber, requestId: 'shot-' + s.shotNumber, shotNumber: s.shotNumber, from, to, kind, visualClass: kind === 'screen_recording' ? 'screen_recording' : kind === 'image_motion' ? 'image_motion' : 'real_stock', assetId: a.assetId, localPath: a.localPath, sha256: a.sha256, sourceType: a.sourceType, sourceStart: start, sourceEnd: start === null ? null : start + duration, crop: { mode: m.cropMode, objectPosition: '50% 50%' }, entry: { type: 'none', durationFrames: 0 }, motion: { scaleFrom: 1, scaleTo: kind === 'image_motion' ? 1.035 : 1, panX: 0, panY: 0 }, transitionPolicy: 'hard_cut', requiresClearReading: kind === 'screen_recording', visualReason: m.matchReason });
        }
        const durationInFrames = scenes.at(-1).to;
        t = { contractVersion: 'visual-timeline/0.1', mode: 'rules', modelUsed: null, episodeId: script.episodeId, fps: 30, width: 1080, height: 1920, durationInFrames, globalStartSeconds: 0, globalEndSeconds: durationInFrames / 30, scenes, captions, overlays: [], disclosures: [], visualPolicy: await read(c.visual.policyRef) };
        for (const s of scenes) {
            const original = script.shots.find((x: any) => x.shotNumber === s.shotNumber);
            if (!original.overlayText)
                continue;
            const text = keywordText(original.overlayText);if(!text)continue;
            if (text.length > c.visual.overlay.maxTextCharacters)
                throw new Blocked('OVERLAY_COPY_REVIEW', 'Overlay needs reviewed shortening; do not silently alter figures/meaning', [s.shotNumber]);
            if (s.to - s.from < 30)
                continue;
            t.overlays.push({ id: 'keyword-' + s.id, sceneId: s.id, text, fromFrame: s.from + 8, toFrame: s.to - 8, rect: { x: 80, y: s.visualClass === 'screen_recording' ? 1320 : 180, width: 900, height: 220 }, animation: { type: 'fade', inFrames: 6, outFrames: 6 } });
        }
    }
    t.mode = 'rules';
    t.modelUsed = null;
    t.visualPolicy = { ...(await read(c.visual.policyRef)), ...t.visualPolicy, decorativeBadges: { brand: false, sceneIllustration: false } };
    const catalog = (await read(c.transitions.catalogRef)).effects.filter((e: any) => !c.transitions.exclude.includes(e.upstreamName));
    const cfg = { ...(await read(c.transitions.configRef)), ...Object.fromEntries(['durationFrames', 'maxStrongFraction', 'maxAnimatedCutFraction', 'maxSameEffectPerFilm', 'minAnimatedGapSeconds', 'maxExtraEdgeHoldFrames'].map(k => [k, c.transitions[k]])) };
    for (const s of t.scenes) {
        s.entry ??= { type: 'none', durationFrames: 0 };
        s.motion ??= { scaleFrom: 1, scaleTo: 1, panX: 0, panY: 0 };
        s.transitionPolicy ??= 'hard_cut';
        s.transitionDurationFrames ??= c.transitions.durationFrames;
    }
    const selected = selectTransitions(t, catalog, cfg, new Set<string>());
    for (const cut of selected.timeline.transitions as any[])
        if (cut.durationFrames)
            cut.timingProfile = 'endpoint-inclusive-linear';
    t = selected.timeline;
    validateOverlays(t, c);
    return { timeline: t, selection: selected.report };
}
export async function stagePublic(t: any, c: any, dir: string) {
    const timeline = structuredClone(t), pub = resolve(root, c.paths.rendererProject, 'public/routine');
    await mkdir(pub, { recursive: true });
    const assets: any[] = [];
    for (const s of timeline.scenes) {
        if (s.kind === 'diagram')
            continue;
        const path = resolve(root, s.renderPath ?? s.localPath), hash = await digest(path);
        if (!s.renderPath && hash !== s.sha256)
            throw Error('Render source changed');
        if (s.renderPath && (s.renderSha256 !== hash || s.renderDerivedFromSha256 !== s.sha256))
            throw Error('Render derivative needs explicit byte hash and original source hash binding');
        const name = hash + extname(path);
        const target = resolve(pub, name);
        try {
            if (await digest(target) !== hash)
                throw Error('Staging collision');
        }
        catch (e: any) {
            if (e.code !== 'ENOENT')
                throw e;
            await copyFile(path, target);
        }
        s.publicPath = 'routine/' + name;
        assets.push({ scene: s.id, path, sha256: hash, derivedFrom: s.renderPath ? s.localPath : null });
    }
    await save(dir + '/staged-sources.json', assets);
    return timeline;
}
