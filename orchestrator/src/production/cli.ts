import {parseSrtCues} from '../voice/subtitles.ts';
import { parseArgs } from 'node:util';
import { readFile, writeFile, copyFile, mkdir, constants } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { root, read, save, ref, digest, sha, stable, exists, loadConfig, Engine, Blocked, type StageResult } from './core.ts';
import { importProduction } from './import.ts';
import { legacy, loadResources, validateCatalog, checkTimeline } from './resources.ts';
import { generateVoice, alignGenerated, srt } from './voice.ts';
import { intentBrief, assembleTimeline } from './visual.ts';
import { mixAudio, renderPicture, compose, probe, ff } from './media.ts';
import { qualityAndRepair } from './quality.ts';
import { runProcess } from '../visual-mvp/process.ts';
import { validateOverlays } from './overlays.ts';
const { values } = parseArgs({ options: { excel: { type: 'string' }, episode: { type: 'string' }, config: { type: 'string' }, resources: { type: 'string' }, out: { type: 'string' }, resume: { type: 'boolean' }, reuse: { type: 'string' }, help: { type: 'boolean' } } });
if (values.help) {
    console.log('npm --prefix orchestrator run produce -- --excel <absolute.xlsx> --episode <id> [--config <override.json>] [--resources <bound-resources.json>] [--out <new-directory>] [--resume] [--reuse <verified-legacy-output>]\n--reuse is frozen historical-cache verification only; never applies new visual/audio overrides. No cover or publication.');
    process.exit(0);
}
let engine: Engine | undefined;
try {
    if (!values.excel || !values.episode || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(values.episode))
        throw Error('--excel and safe --episode are required');
    if (values.reuse && (values.config || values.resources))
        throw Error('--reuse validates a frozen legacy result, cannot combine with content overrides. Use --resources for a new arrangement.');
    let c = await loadConfig(values.config);
    const excel = resolve(root, values.excel), excelSha = await digest(excel);
    const out = resolve(root, values.out ?? c.paths.outputRoot + '/' + values.episode + '/production-v1');
    if (values.resume && await exists(out + '/production-request.json')) {
        const prior = await read(out + '/production-request.json');
        if (!values.config)
            values.config = prior.config;
        if (!values.resources)
            values.resources = prior.resources;
        if (!values.reuse && !values.config && !values.resources)
            values.reuse = prior.reuse;
        c = await loadConfig(values.config);
    }
    if (out === root || out === resolve(root, c.paths.outputRoot))
        throw Error('Unsafe output root');
    if (await exists(out + '/script.normalized.json') || await exists(out + '/microsoft-skills-review.mp4'))
        throw Error('Existing legacy episode directory cannot be used as new output');
    engine = new Engine(out, { episodeId: values.episode, excelPath: excel, excelSha256: excelSha }, !!values.resume);
    await engine.init();
    const E = engine;
    await save(out + '/production-request.json', { config: values.config ? resolve(root, values.config) : null, resources: values.resources ? resolve(root, values.resources) : null, reuse: values.reuse ? resolve(root, values.reuse) : null });
    await save(out + '/config.resolved.json', c);
    await save(out + '/input-summary.json', { excelPath: excel, excelSha256: excelSha, episodeId: values.episode, configVersion: c.version, configSha256: sha(stable(c)), mode: c.mode, cover: c.cover, publish: false });
    const imp = await E.stage('import', { excelSha, cfg: c.excel, rhythm: c.voice.rhythm, code: await digest('orchestrator/src/production/import.ts') }, [], async (dir):Promise<StageResult> => { const x = await importProduction(excel, c.excel, values.episode!, c.voice.rhythm); await save(dir + '/script.normalized.json', x.script); await save(dir + '/rhythm-plan.json', x.rhythm); return { artifacts: { script: dir + '/script.normalized.json', rhythm: dir + '/rhythm-plan.json' }, data: { shots: x.script.shots.length, narrationSha256: x.rhythm.textSha256, metadataRows: x.script.metadata.length } }; });
    if (!imp)
        throw Error('Excel import failed; inspect production-state.json');
    const script = await read(E.file('import', 'script')), rhythm = await read(E.file('import', 'rhythm'));
    let resources: any = values.reuse ? await legacy(values.reuse, excelSha, rhythm.text) : await loadResources(values.resources, excelSha);
    if (!values.reuse)
        resources.legacy = false;
    const resourceRef = async (...keys: string[]) => Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await ref(resources[k])])));
    await E.stage('facts', { script: imp.data.narrationSha256, metadata: script.metadata, resources: await resourceRef('factCheck') }, ['import'], async (dir):Promise<StageResult> => {
        const requiresSources = /https?:\/\//.test(JSON.stringify(script.metadata)) || /新闻|报道|宣布|裁员|离职邀约/.test(rhythm.text);
        let facts;
        if (resources.factCheck) {
            facts = await read(resources.factCheck);
            if (!facts.checkedAt || !Array.isArray(facts.materialConflicts))
                throw new Blocked('FACTS_EVIDENCE', 'Fact check needs date, actual sources and conflict list');
            if (requiresSources && (!Array.isArray(facts.facts) || !facts.facts.length || facts.facts.some((f: any) => !f.claim || !Array.isArray(f.sources) || !f.sources.some((u: any) => typeof u === 'string' && /^https?:/.test(u)))))
                throw new Blocked('FACTS_EVIDENCE', 'News fact check needs specific claims with sourceURLs; an empty checked flag is insufficient');
            if (facts.materialConflicts.length)
                throw new Blocked('FACT_CONFLICT', 'Affected narration cannot be synthesized', facts.materialConflicts);
        }
        else {
            const urls = JSON.stringify(script.metadata).match(/https?:\/\/[^"\s]+/g) ?? [];
            const news = urls.length || /新闻|报道|宣布|裁员|离职邀约/.test(rhythm.text);
            facts = { checkedAt: null, materialConflicts: [], status: news ? 'NEEDS_SOURCE_REVIEW' : 'NOT_EVALUATED', sourceExcelSha256: excelSha, urls, scope: 'No automatic fact-verification model configured' };
            await save(dir + '/fact-check-template.json', facts);
            if (news)
                throw new Blocked('FACTS_REQUIRED', 'Provide reviewed source-backed factCheck JSON bound by resource package. Not a request to approve ordinary implementation.', [dir + '/fact-check-template.json']);
        }
        await save(dir + '/fact-check.json', facts);
        return { artifacts: { facts: dir + '/fact-check.json' }, origin: resources.legacy ? 'legacy_cache' : undefined, data: { externalFactsReviewed: !!facts.checkedAt } };
    });
    await E.stage('brief', { narration: imp.data.narrationSha256, resources: await resourceRef('visualBrief'), policy: c.visual, code: await digest('orchestrator/src/production/visual.ts') }, ['import'], async (dir):Promise<StageResult> => { const b = resources.visualBrief ? await read(resources.visualBrief) : intentBrief(script); await save(dir + '/visual-brief.json', b); return { artifacts: { brief: dir + '/visual-brief.json' }, origin: resources.legacy ? 'legacy_cache' : undefined, data: { mode: 'rules', modelUsed: null } }; });
    await E.stage('voice-acquire', { narration: imp.data.narrationSha256, policy: { seed: c.voice.seed, emoAlpha: c.voice.emoAlpha, inference: c.voice.inference, rhythm: c.voice.rhythm }, profile: await ref(c.voice.profileRef), resources: await resourceRef('voice'), voiceSha256: resources.voiceSha256 ?? null, adapter: await digest('orchestrator/src/production/voice-runtime.py') }, ['import', 'facts'], async (dir):Promise<StageResult> => {
        if (resources.voice) {
            const voice = resolve(root, resources.voice);
            if (resources.legacy) {
                const old = await read(resources.bgmConfig);
                if (await digest(voice) !== old.stemChecks.voiceSourceSha256)
                    throw Error('Legacy narration hash mismatch');
            }
            else if (!resources.voiceSha256 || await digest(voice) !== resources.voiceSha256)
                throw Error('Cached voice requires explicit voiceSha256');
            return { artifacts: { voice }, origin: resources.legacy ? 'legacy_cache' : undefined, data: { voiceSha256: await digest(voice), acquisition: 'bound_audio_cache', newInference: false } };
        }
        const generated = await generateVoice(dir, c, rhythm, E.state.stages['voice-acquire'].fingerprint);
        await save(dir + '/synthesis-audit.json', generated.audit);
        return { artifacts: { voice: generated.voice, audit: dir + '/synthesis-audit.json' }, data: { voiceSha256: await digest(generated.voice), acquisition: 'existing_approved_IndexTTS2_service' } };
    });
    await E.stage('voice', { acquisition: E.state.stages['voice-acquire']?.fingerprint, resources: await resourceRef('voicedScript', 'captions', 'srt'), code: await digest('orchestrator/src/production/voice.ts') }, ['voice-acquire'], async (dir):Promise<StageResult> => {
        const voice = E.file('voice-acquire', 'voice');
        let voiced: any, caps: any[], sub: string;
        if (resources.voice) {
            for (const k of ['voicedScript', 'captions', 'srt'])
                if (!resources[k])
                    throw new Blocked('VOICE_BUNDLE', 'Cached voice needs matching actual-time script/cues/SRT', [k]);
            voiced = await read(resources.voicedScript);
            caps = await read(resources.captions);
            sub = await readFile(resolve(root, resources.srt), 'utf8');
        }
        else {
            const a = alignGenerated(await readFile(voice), rhythm, await read(E.file('voice-acquire', 'audit')), script);
            voiced = a.voiced;
            caps = a.captions;
            sub = srt(caps);
        }
        if (caps.map(x => x.text).join('') !== rhythm.text || voiced.shots.map((s: any) => s.narration).join('') !== rhythm.text)
            throw Error('Voice bundle changed frozen narration');
        const sourceSrt=parseSrtCues(sub);if(sourceSrt.length!==caps.length||sourceSrt.some((v,i)=>v.text!==caps[i].text||v.id!==caps[i].id||Math.abs(v.startSeconds-caps[i].startSeconds)>.002||Math.abs(v.endSeconds-caps[i].endSeconds)>.002))throw Error('SRT and actual-audio JSON cues disagree');
        voiced.captions = caps;
        await save(dir + '/script.voiced.json', voiced);
        await save(dir + '/captions.json', caps);
        await writeFile(dir + '/subtitles.srt', sub);
        return { artifacts: { voice, voiced: dir + '/script.voiced.json', captions: dir + '/captions.json', srt: dir + '/subtitles.srt' }, origin: resources.legacy ? 'legacy_cache' : undefined, data: { voiceSha256: await digest(voice), acquisition: resources.voice ? 'bound_audio_cache' : 'existing_approved_IndexTTS2_service', precision: 'sentence provenance/activity or explicitly bound cached timestamps; not word forced alignment' } };
    });
    let externalAssetRefs: any = [];
    if (resources.assetCatalog && await exists(resolve(root, resources.assetCatalog))) {
        const cat = await read(resources.assetCatalog);
        externalAssetRefs = await Promise.all(cat.assets.map(async (a: any) => ({ file: await ref(a.localPath), frames: await Promise.all(a.analysis.frameEvidence.map((f: any) => ref(f.path))) })));
    }
    await E.stage('assets', { brief: E.state.stages.brief?.fingerprint, resources: await resourceRef('assetCatalog', 'assetMatches', 'assetProposal'), media: externalAssetRefs }, ['brief'], async (dir):Promise<StageResult> => {
        if (!resources.assetCatalog || !resources.assetMatches) {
            const gaps = script.shots.map((s: any) => ({ shotNumber: s.shotNumber, narration: s.narration, need: s.visualDescription, reason: 'No supplied verified actual-frame catalog/match; no unattended stock acquisition or vision service configured' }));
            await save(dir + '/asset-proposal.json', { mode: 'rules', modelUsed: null, recommendations: [], gaps });
            throw new Blocked('ASSET_GAPS', 'Use existing acquisition/real recording + frame inspection, then supply Asset/AssetMatch JSON; no unrelated filler', gaps);
        }
        const assets = await validateCatalog(resources.assetCatalog);
        const rawMatches = await read(resources.assetMatches), matches = Array.isArray(rawMatches) ? rawMatches : rawMatches.matches;
        await runProcess(c.paths.python, ['-c', "import sys,json;sys.path.insert(0,sys.argv[1]);from validate_assets import validate_bundle;a=json.load(open(sys.argv[2]))['assets'];m=json.load(open(sys.argv[3]));validate_bundle(a,m if isinstance(m,list) else m['matches'])", resolve(root, 'orchestrator/contracts'), resolve(root, resources.assetCatalog), resolve(root, resources.assetMatches)], { log: dir + '/contract-validation.log' });
        if (script.shots.some((s: any) => !matches.some((m: any) => m.shotNumber === s.shotNumber && m.matchStatus !== 'rejected')) && !resources.timeline)
            throw new Blocked('ASSET_MATCH_GAPS', 'Missing shot matches; do not replace with cards');
        const p = resources.assetProposal ? await read(resources.assetProposal) : { mode: 'rules', modelUsed: null, recommendations: matches.map((m: any) => ({ requestId: 'shot-' + m.shotNumber, available: m.matchStatus !== 'rejected', assetId: m.assetId, reason: m.matchReason })), gaps: [] };
        await save(dir + '/asset-catalog.json', { assets });
        await save(dir + '/asset-matches.json', matches);
        await save(dir + '/asset-proposal.json', p);
        return { artifacts: { catalog: dir + '/asset-catalog.json', matches: dir + '/asset-matches.json', proposal: dir + '/asset-proposal.json' }, origin: resources.legacy ? 'legacy_cache' : undefined, data: { assets: assets.length, matches: matches.length, frameEvidenceVerified: true, review: 'preserve original, no formal library promotion' } };
    });
    await E.stage('timeline', { voice: E.state.stages.voice?.fingerprint, assets: E.state.stages.assets?.fingerprint, resources: await resourceRef('timeline'), video: c.video, transitions: c.transitions, overlay: c.visual.overlay, catalog: await ref(c.transitions.catalogRef), code: await digest('orchestrator/src/production/visual.ts') }, ['voice', 'assets'], async (dir):Promise<StageResult> => {
        const voiced = await read(E.file('voice', 'voiced')), caps = await read(E.file('voice', 'captions')), assets = (await read(E.file('assets', 'catalog'))).assets, matches = await read(E.file('assets', 'matches'));
        const assembled = await assembleTimeline(script, voiced, caps, assets, matches, resources, c);
        const t = resources.legacy ? assembled : assembled.timeline;
        checkTimeline(t, script, voiced, c, assets);
        if (!resources.legacy)
            validateOverlays(t, c);
        await save(dir + '/timeline.json', t);
        await save(dir + '/transition-selection.json', resources.legacy ? { origin: 'frozen legacy final selection; bounded repair already in source report' } : assembled.selection);
        return { artifacts: { timeline: dir + '/timeline.json', selection: dir + '/transition-selection.json' }, origin: resources.legacy ? 'legacy_cache' : undefined, data: { frames: t.durationInFrames, segments: t.scenes.length, seconds: t.durationInFrames / 30 } };
    });
    await E.stage('audio', { voice: E.data('voice-acquire')?.voiceSha256, timelineDuration: E.data('timeline')?.frames, music: c.music, musicFile: await ref((await read(c.music.configRef)).defaultBgmPath), resources: await resourceRef('mixedAudio', 'mixedWav', 'bgmConfig', 'loopValidation'), code: await digest('orchestrator/src/episode-production/audio.py') }, ['voice', 'timeline'], async (dir):Promise<StageResult> => {
        if (resources.legacy)
            return { origin: 'legacy_cache', artifacts: { audio: resources.mixedAudio, wav: resources.mixedWav, bgm: resources.bgmConfig, loop: resources.loopValidation }, data: { configurationApplied: false, reason: 'Exact holder-selected historical mix; defaults are not retroactively applied' } };
        const t = await read(E.file('timeline', 'timeline'));
        const a = await mixAudio(dir, c, E.file('voice', 'voice'), t);
        return { artifacts: { audio: a.mixedAudio, wav: a.mixedWav, bgm: a.bgmConfig, loop: a.loopValidation } };
    });
    await E.stage('render', { timelineSha256: (await ref(E.file('timeline', 'timeline')))?.sha256, video: c.video, captions: c.captions, overlay: c.visual.overlay, browser: c.paths.browserExecutable, sources: await Promise.all([resolve(root, c.paths.rendererProject, 'src/RoutineRoot.tsx'), resolve(root, c.paths.rendererProject, 'src/GLTimeline.tsx'), resolve(root, c.paths.rendererProject, 'src/EndpointGuard.tsx'), resolve(root, c.paths.rendererProject, 'scripts/render-routine.mjs'), 'orchestrator/src/production/overlays.ts', 'experiments/day9-remotion/src/visual-effects.ts', 'experiments/day9-remotion/src/content-disclosure.tsx'].map(ref)), dependencyLock: await ref(resolve(root, c.paths.rendererProject, 'package-lock.json')), legacyVideo: await ref(resources.video) }, ['timeline'], async (dir):Promise<StageResult> => {
        if (resources.legacy)
            return { origin: 'legacy_cache', artifacts: { picture: resources.video, effectiveTimeline: E.file('timeline', 'timeline') }, data: { rendered: false, mode: 'frozen legacy pixel reuse; does not claim RoutineRoot rendered this video' } };
        const x = await renderPicture(dir, await read(E.file('timeline', 'timeline')), c);
        return { artifacts: { picture: x.picture, evidence: x.evidence, effectiveTimeline: x.timeline }, data: { rendered: true } };
    });
    await E.stage('compose', { render: E.state.stages.render?.fingerprint, audio: E.state.stages.audio?.fingerprint }, ['render', 'audio'], async (dir):Promise<StageResult> => { if (resources.legacy)
        return { origin: 'legacy_cache', artifacts: { video: resources.video }, data: { muxed: false } }; const p = await compose(dir, E.file('render', 'picture'), E.file('audio', 'audio')); return { artifacts: { video: p }, data: { muxed: true } }; });
    await E.stage('quality', { compose: E.state.stages.compose?.fingerprint, rules: await ref(c.quality.rulesRef), resources: await resourceRef('qualityReport', 'validation', 'repairLog'), code: await digest('orchestrator/src/production/quality.ts') }, ['compose', 'assets', 'voice'], async (dir):Promise<StageResult> => {
        if (resources.legacy) {
            const q = await read(resources.qualityReport), v = await read(resources.validation);
            if (q.automaticSummary.FAIL || v.sampleSha256 !== await digest(resources.video) || !v.fullDecode)
                throw Error('Legacy evidence failed or does not bind video');
            const actual = await probe(resources.video), video = actual.streams.find((s: any) => s.codec_type === 'video');
            if (Number(video.nb_frames) !== E.data('timeline').frames)
                throw Error('Actual cached video frame count mismatch');
            await save(dir + '/cache-verification.json', { source: resources.video, actualProbe: actual, videoSha256: await digest(resources.video), sourceQuality: resources.qualityReport, sourceValidation: resources.validation, newFullDecodePerformed: false, fullDecodeEvidence: 'bound original validation; original file SHA verified unchanged', newRenderPerformed: false, subjective: 'holder latest score approximately65; no new automatic aesthetic approval', sourceRepairLog: resources.repairLog });
            return { origin: 'legacy_cache', artifacts: { report: resources.qualityReport, validation: resources.validation, repairs: resources.repairLog, verification: dir + '/cache-verification.json', video: resources.video, timeline: E.file('timeline', 'timeline') }, data: { result: q.overallResult, automatic: q.automaticSummary, failed: false } };
        }
        const t = await read(E.file('render', 'effectiveTimeline')), args = { video: E.file('compose', 'video'), timeline: t, voiceCaps: await read(E.file('voice', 'captions')), assets: (await read(E.file('assets', 'catalog'))).assets, brief: { ...(await read(E.file('brief', 'brief'))), transitionPlan: t.transitions }, proposal: await read(E.file('assets', 'proposal')), bgm: await read(E.file('audio', 'bgm')), loop: await read(E.file('audio', 'loop')), renderEvidence: E.file('render', 'evidence'), c, audio: E.file('audio', 'audio') };
        const x = await qualityAndRepair(dir, args);
        return { artifacts: { video: x.video, timeline: x.timeline, report: x.report, repairs: x.repairs, validation: x.validation }, data: { failed: x.failed, result: (await read(x.report)).overallResult } };
    });
    await E.stage('delivery', { quality: E.state.stages.quality?.fingerprint, caption: E.state.stages.voice?.fingerprint }, ['quality'], async (dir):Promise<StageResult> => { if (E.data('quality').failed)
        throw new Blocked('QUALITY_FAIL', 'Technical FAIL remains after bounded repair; artifacts preserved, not marked ready'); const video = E.file('quality', 'video'), hash = await digest(video), target = resolve(out, 'review-' + hash.slice(0, 12) + '.mp4'); if (!await exists(target))
        await copyFile(video, target, constants.COPYFILE_EXCL);
    else if (await digest(target) !== hash)
        throw Error('Delivery collision'); const inventory = { version: c.version, episodeId: values.episode, scope: 'private_review', video: target, timeline: E.file('quality', 'timeline'), script: E.file('import', 'script'), voicedScript: E.file('voice', 'voiced'), subtitles: E.file('voice', 'srt'), visualBrief: E.file('brief', 'brief'), assetCatalog: E.file('assets', 'catalog'), assetMatches: E.file('assets', 'matches'), assetProposal: E.file('assets', 'proposal'), quality: E.file('quality', 'report'), repairs: E.file('quality', 'repairs'), validation: E.file('quality', 'validation'), facts: E.file('facts', 'facts'), bgm: E.file('audio', 'bgm'), cover: { integrated: false, step: 'Generate separately; no cover produced by CLI' }, publish: false, mode: 'rules', modelUsed: null, legacyReuse: !!resources.legacy, manualStepsRemaining: ['source/asset judgement and missing-resource fulfillment as needed', 'visual/voice listening acceptance', 'unresolved publication licenses', 'cover separately generated'] }; await save(dir + '/delivery.json', inventory); await save(out + '/delivery.json', inventory); return { artifacts: { video: target, inventory: dir + '/delivery.json' }, data: { readyForPrivateReview: true } }; });
    const stages = E.state.stages, blocked = Object.entries(stages).filter(([, s]: any) => ['BLOCKED', 'FAILED', 'WAITING'].includes(s.status));
    await save(out + '/execution.json', { completedAt: new Date().toISOString(), configVersion: c.version, input: E.identity, events: E.events, stageStatuses: Object.fromEntries(Object.entries(stages).map(([n, s]: any) => [n, s.status])), blocked: blocked.map(([name, s]: any) => ({ stage: name, ...s.error, dependencies: s.dependencies })), coverIntegrated: false, published: false });
    if (!blocked.length)
        await save(out + '/delivery.json', await read(E.file('delivery', 'inventory')));
    await save(out + '/current-result.json', { status: blocked.length ? 'BLOCKED' : 'DELIVERED', delivery: blocked.length ? null : out + '/delivery.json', previousDeliveryRetained: blocked.length && await exists(out + '/delivery.json'), readState: 'production-state.json', blocked: blocked.map(([stage, s]: any) => ({ stage, ...s.error, dependencies: s.dependencies })) });
    console.log(JSON.stringify({ status: blocked.length ? 'BLOCKED' : 'DELIVERED', output: out, events: E.events, delivery: blocked.length ? null : out + '/delivery.json', blocked: blocked.map(([n]) => n) }, null, 2));
    if (blocked.length)
        process.exitCode = 2;
}
catch (e: any) {
    console.error(e.message);
    process.exitCode = 1;
}
finally {
    await engine?.close();
}
