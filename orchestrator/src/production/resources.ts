import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { root, read, digest, exists, Blocked } from './core.ts';
export async function legacy(dir: string, excelSha: string, narration: string) {
    dir = resolve(root, dir);
    const script = await read(dir + '/script.normalized.json');
    if (script.source.sha256 !== excelSha || script.shots.map((s: any) => s.narration).join('') !== narration)
        throw Error('Legacy source is a different frozen Excel/text');
    const selection = await read(dir + '/holder-selection.json');
    const video = resolve(root, selection.selectedFile);
    if (await digest(video) !== selection.selectedSha256)
        throw Error('Selected legacy video hash mismatch');
    const val = await read(dir + '/validation.json');
    if (val.sampleSha256 !== selection.selectedSha256)
        throw Error('Legacy validation does not bind selected video');
    const prior = await read(dir + '/inputs.before.json');
    for (const [p, h] of Object.entries(prior))
        if (await digest(p) !== h)
            throw Error('Protected legacy source changed: ' + p);
    const t = await read(dir + '/timeline.json');
    if (t.captions.map((c: any) => c.text).join('') !== narration)
        throw Error('Legacy cues differ from frozen narration');
    return { sourceExcelSha256: excelSha, factCheck: dir + '/fact-check.json', voice: dir + '/voice/full-raw.wav', voicedScript: dir + '/script.voiced.json', captions: dir + '/captions.json', srt: dir + '/subtitles.srt', visualBrief: dir + '/visual-brief.json', assetCatalog: dir + '/asset-catalog.json', assetMatches: dir + '/asset-matches.json', assetProposal: dir + '/asset-proposal.json', timeline: dir + '/timeline.json', mixedAudio: dir + '/mixed-audio.m4a', mixedWav: dir + '/mixed-audio.wav', bgmConfig: dir + '/bgm-config.json', loopValidation: dir + '/loop-validation.json', video, qualityReport: dir + '/quality-report.json', validation: dir + '/validation.json', repairLog: dir + '/repair-log.json', selection: dir + '/holder-selection.json', legacy: true };
}
export async function loadResources(path: string | undefined, excelSha: string) { if (!path)
    return {}; const x = await read(path); if (x.sourceExcelSha256 !== excelSha)
    throw Error('Resource package must bind this exact Excel SHA256'); return x; }
export async function validateCatalog(path: string) { const data = await read(path); const assets = data.assets; if (!Array.isArray(assets))
    throw Error('Asset catalog requires assets array'); const seen = new Set(), ids = new Set(); for (const a of assets) {
    if (ids.has(a.assetId) || seen.has(a.sha256))
        throw Error('Duplicate asset ID/SHA');
    ids.add(a.assetId);
    seen.add(a.sha256);
    if (await digest(a.localPath) !== a.sha256)
        throw Error('Asset bytes do not match index: ' + a.assetId);
    if (a.reviewStatus === 'rejected' || a.license.localExperimentAllowed !== true || !['verified_for_local_experiment', 'local_experiment_only'].includes(a.licenseStatus))
        throw new Blocked('ASSET_LICENSE', 'Asset is not permitted for this local review', [a.assetId]);
    if (!a.analysis?.frameEvidence?.length)
        throw new Blocked('ASSET_UNDERSTANDING', 'Actual frame evidence missing', [a.assetId]);
    for (const f of a.analysis.frameEvidence)
        if (await digest(f.path) !== f.sha256)
            throw Error('Asset analysis frame changed: ' + f.path);
} return assets; }
export function checkTimeline(t: any, script: any, voiced: any, c: any, assets: any[]) {
    if (t.width !== c.video.width || t.height !== c.video.height || t.fps !== c.video.fps)
        throw Error('Timeline format mismatch');
    if (t.captions.map((v: any) => v.text).join('') !== script.shots.map((v: any) => v.narration).join(''))
        throw Error('Timeline caption text changed');
    if (t.scenes[0]?.from !== 0 || t.scenes.at(-1)?.to !== t.durationInFrames || t.scenes.some((s: any, i: number) => s.to <= s.from || (i && s.from !== t.scenes[i - 1].to)))
        throw Error('Timeline has coverage gap/overlap');
    const set = new Set(t.scenes.map((s: any) => s.shotNumber));
    if (script.shots.some((s: any) => !set.has(s.shotNumber)))
        throw Error('Missing original shot');
    for (const s of t.scenes) {
        if (s.kind === 'diagram')
            continue;
        const a = assets.find(a => a.assetId === s.assetId);
        if (!a || s.sha256 !== a.sha256 || s.localPath !== a.localPath || s.sourceType !== a.sourceType)
            throw Error('Scene identity not bound to original Asset');
        if (a.mediaType === 'video') {
            const duration = (s.to - s.from) / t.fps;
            if (!Number.isFinite(s.sourceStart) || Math.abs(s.sourceEnd - s.sourceStart - duration) > .002 || !a.usableSegments.some((u: any) => s.sourceStart >= u.start - .001 && s.sourceEnd <= u.end + .001))
                throw new Blocked('SOURCE_MARGIN', 'Scene needs longer or reviewed source range', [s.id]);
        }
    }
    for (let i = 0; i < t.captions.length; i++) {
        const cap = t.captions[i];
        if (cap.startSeconds < 0 || cap.endSeconds <= cap.startSeconds || cap.endSeconds > t.durationInFrames / t.fps || (i && cap.startSeconds < t.captions[i - 1].endSeconds))
            throw Error('Invalid caption times');
    }
    const expected = voiced.captions;
    if (expected && (expected.length !== t.captions.length || expected.some((v: any, i: number) => v.text !== t.captions[i]?.text || Math.abs(v.startSeconds - t.captions[i].startSeconds) > .002 || Math.abs(v.endSeconds - t.captions[i].endSeconds) > .002)))
        throw Error('Timeline moved authoritative actual-audio cues');
    const end = voiced.shots.at(-1).voiceover.timelineEndSeconds;
    if (t.durationInFrames / t.fps < end)
        throw Error('Timeline truncates actual narration');
    return true;
}
