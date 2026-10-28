import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runProcess } from '../visual-mvp/process.ts';
import { downgrade } from '../transitions/select.ts';
import { isGlRenderFailure } from '../transitions/render-errors.ts';
import { root, read, save, digest, exists, Blocked } from './core.ts';
import { stagePublic } from './visual.ts';
export const ff = (args: string[], log?: string) => runProcess('ffmpeg', ['-hide_banner', ...args], { log });
export const probe = async (p: string) => JSON.parse((await runProcess('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', p])).toString());
export async function mixAudio(dir: string, c: any, voice: string, t: any) { const music = await read(c.music.configRef), source = resolve(root, music.defaultBgmPath); if (await digest(source) !== music.defaultBgmSha256)
    throw new Blocked('MUSIC_IDENTITY', 'Configured BGM differs from holder-confirmed file'); const m = await probe(source); if (Number(m.format.duration) <= c.music.crossfadeSeconds)
    throw new Blocked('MUSIC_LOOP', 'Source shorter than configured overlap'); const p = dir + '/audio-request.json'; await save(p, { out: dir, voice, music: source, timeline: t, policy: c.music }); await runProcess(c.paths.python, [resolve(root, 'orchestrator/src/episode-production/audio.py'), '--request', p], { log: dir + '/audio.log' }); return { mixedAudio: dir + '/mixed-audio.m4a', mixedWav: dir + '/mixed-audio.wav', bgmConfig: dir + '/bgm-config.json', loopValidation: dir + '/loop-validation.json' }; }
export async function renderPicture(dir: string, t: any, c: any) {
    if (!c.paths.browserExecutable)
        throw new Blocked('BROWSER_PATH_REQUIRED', 'Set existing approved browser executable');
    let timeline = await stagePublic(t, c, dir);
    const ledgerPath = dir + '/attempts.json';
    const ledger = await exists(ledgerPath) ? await read(ledgerPath) : [];
    if (ledger.some((x: any) => x.status === 'EXPORTED')) {
        const done = ledger.find((x: any) => x.status === 'EXPORTED');
        if (await digest(done.picture) !== done.sha256)
            throw Error('Cached render receipt mismatch');
        return done;
    }
    const partial=ledger.find((x:any)=>x.partialPictureExported);
    if(partial&&!(partial.probeOnlyAttempts>=1)){
        partial.probeOnlyAttempts=1;await save(ledgerPath,ledger);const at=resolve(dir,'attempt-'+partial.attempt),req=at+'/request.json';const request=await read(req);request.probesOnly=true;await save(at+'/probe-only-request.json',request);
        await runProcess(process.execPath,['--require','../day9-remotion/scripts/loopback.cjs','scripts/render-routine.mjs','--request='+at+'/probe-only-request.json'],{cwd:resolve(root,c.paths.rendererProject),log:at+'/probe-only.log'});
        partial.status='EXPORTED';partial.picture=at+'/picture.mp4';partial.sha256=await digest(partial.picture);partial.evidence=at+'/render-evidence.json';partial.timeline=dir+'/effective-timeline.json';partial.pictureReusedWithoutRerender=true;await save(partial.timeline,request.timeline);await save(ledgerPath,ledger);return partial;
    }
    if (ledger.length)
        throw new Blocked('RENDER_ATTEMPT_REVIEW', 'This fingerprint already attempted rendering; fix input/runtime/config before retrying. No blind full render repeat');
    for (let attempt = 1; attempt <= 2; attempt++) {
        const at = resolve(dir, 'attempt-' + attempt);
        await mkdir(at, { recursive: true });
        const req = at + '/request.json';
        await save(req, { out: at, timeline, config: c });
        const row: any = { attempt, status: 'STARTED' };
        ledger.push(row);
        await save(ledgerPath, ledger);
        try {
            await runProcess(process.execPath, ['--require', '../day9-remotion/scripts/loopback.cjs', 'scripts/render-routine.mjs', '--request=' + req], { cwd: resolve(root, c.paths.rendererProject), log: at + '/render.log' });
            row.status = 'EXPORTED';
            row.picture = at + '/picture.mp4';
            row.sha256 = await digest(row.picture);
            row.evidence = at + '/render-evidence.json';
            row.timeline = dir + '/effective-timeline.json';
            await save(row.timeline, timeline);
            await save(ledgerPath, ledger);
            return row;
        }
        catch (e) {
            row.status = 'FAILED';
            row.error = String(e);
            await save(ledgerPath, ledger);
            if(await exists(at+'/picture-export.json')){row.partialPictureExported=true;await save(ledgerPath,ledger);throw new Blocked('RENDER_PROBES_INCOMPLETE','Picture exported; --resume will verify its receipt and run pending probes once without rerendering picture',[at+'/picture-export.json']);}
            const detail = await exists(at + '/render-error.json') ? (await read(at + '/render-error.json')).error : String(e);
            if (attempt === 2 || !isGlRenderFailure(detail))
                throw e;
            const affected = timeline.transitions.filter((x: any) => x.durationFrames).map((x: any) => x.boundaryFrame);
            if (!affected.length)
                throw e;
            const repair = downgrade(timeline, affected, detail);
            timeline = repair.timeline;
            await save(dir + '/render-repair.json', repair.logs);
        }
    }
    throw Error('Bounded render failed');
}
export async function compose(dir: string, picture: string, audio: string) { await mkdir(dir, { recursive: true }); const out = dir + '/review.mp4'; await ff(['-v', 'error', '-y', '-i', picture, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', out]); return out; }
