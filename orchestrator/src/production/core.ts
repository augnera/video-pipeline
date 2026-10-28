import { readFile, writeFile, mkdir, rename, open, unlink, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
export const root = resolve(import.meta.dirname, '../../..');
export const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
export function stable(x: any): string { return JSON.stringify(x, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v); }
export const read = async (p: string) => JSON.parse(await readFile(resolve(root, p), 'utf8'));
export const exists = async (p: string) => { try {
    await readFile(p);
    return true;
}
catch (e: any) {
    if (e.code === 'ENOENT')
        return false;
    throw e;
} };
export async function save(p: string, x: any) { await mkdir(dirname(p), { recursive: true }); const temp = p + '.tmp-' + process.pid; await writeFile(temp, JSON.stringify(x, null, 2) + '\n'); await rename(temp, p); }
export async function digest(p: string) { return sha(await readFile(resolve(root, p))); }
export async function ref(p: string | null | undefined) { if (!p)
    return null; try {
    return { path: resolve(root, p), sha256: await digest(p) };
}
catch (e: any) {
    if (e.code === 'ENOENT')
        return { path: resolve(root, p), missing: true };
    throw e;
} }
export function merge(a: any, b: any): any { const out = structuredClone(a); for (const [k, v] of Object.entries(b ?? {})) {
    if (!(k in a))
        throw Error('Unknown configuration key ' + k);
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? merge(a[k], v) : v;
} return out; }
export class Blocked extends Error {
    constructor(public code: string, message: string, public required: any = []) { super(message); }
}
export async function loadConfig(override?: string) {
    let c = await read('orchestrator/config/production-v1.json');
    if (await exists(resolve(root, 'orchestrator/config/production.local.json')))
        c = merge(c, await read('orchestrator/config/production.local.json'));
    if (override)
        c = merge(c, await read(override));
    for (const [k, env] of Object.entries({ browserExecutable: 'VP_BROWSER_EXECUTABLE', ttsServiceDir: 'VP_TTS_SERVICE_DIR', ttsPython: 'VP_TTS_PYTHON' }))
        if (process.env[env])
            c.paths[k] = process.env[env];
    if (c.version !== 'xiaochen-production/1.0' || c.mode !== 'rules' || c.publish !== false || c.wan !== 'STOP' || c.quality.maxRepairsPerRule !== 1 || c.voice.maxAttempts !== 1 || c.voice.automaticTimeStretch !== false || c.music.sampleRate !== 48000 || !Number.isFinite(c.voice.maxAudioSeconds) || c.voice.maxAudioSeconds <= 5 || c.voice.maxAudioSeconds > 360)
        throw Error('Unsupported mode/version or prohibited boundary override');
    if (c.video.fps !== 30 || c.video.width !== 1080 || c.video.height !== 1920)
        throw Error('v1.0 currently verifies1080x1920/30 only');
    for (const [name, n, low, high] of [
        ['concurrency', c.video.concurrency, 1, 4], ['caption font', c.captions.fontSize, 28, 60], ['long caption font', c.captions.longFontSize, 28, 60],
        ['music overlap', c.music.crossfadeSeconds, .05, 5], ['music boost', c.music.auditionBoostDb, -12, 12], ['master gain', c.music.masterGainDb, -12, 0],
        ['animated fraction', c.transitions.maxAnimatedCutFraction, 0, 1], ['strong fraction', c.transitions.maxStrongFraction, 0, 1]
    ] as [string, number, number, number][]) if (!Number.isFinite(n) || n < low || n > high) throw Error('Invalid production setting: ' + name);
    return c;
}
export type StageResult = {
    artifacts: Record<string, string>;
    data?: any;
    origin?: string;
};
export class Engine {
    state: any;
    events: any[] = [];
    lock: any;
    constructor(public out: string, public identity: any, public resume: boolean) { }
    async init() {
        await mkdir(this.out, { recursive: true });
        const lockPath = resolve(this.out, '.production.lock');
        try {
            this.lock = await open(lockPath, 'wx');
        }
        catch (e: any) {
            if (e.code !== 'EEXIST')
                throw e;
            const lock = await read(lockPath);
            let alive = true;
            try {
                process.kill(lock.pid, 0);
            }
            catch (x: any) {
                if (x.code === 'ESRCH')
                    alive = false;
            }
            if (alive)
                throw Error('Another production process holds this output');
            await unlink(lockPath);
            this.lock = await open(lockPath, 'wx');
        }
        await this.lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
        const p = resolve(this.out, 'production-state.json');
        if (await exists(p)) {
            if (!this.resume)
                throw Error('Output already exists; use --resume or a new --out');
            this.state = await read(p);
            if (stable(this.state.identity) !== stable(this.identity))
                throw Error('Episode/Excel identity changed; use independent output directory');
        }
        else {
            if((await readdir(this.out)).some(p=>p!=='.production.lock'))throw Error('Output contains existing non-production work; choose an independent output directory');
            this.state = { version: 'production-state/1', identity: this.identity, stages: {} };
            await this.persist();
        }
    }
    async persist() { await save(resolve(this.out, 'production-state.json'), this.state); }
    async stage(name: string, key: any, dependencies: string[], action: (dir: string) => Promise<StageResult>) {
        const missing = dependencies.filter(n => !['COMPLETE', 'REUSED', 'IMPORTED_CACHE'].includes(this.state.stages[n]?.status));
        if (missing.length) {
            this.state.stages[name] = { status: 'WAITING', dependencies: missing };
            await this.persist();
            return null;
        }
        const fingerprint = sha(stable({ version: 1, name, key }));
        const dir = resolve(this.out, 'stages', name, fingerprint.slice(0, 20));
        const receipt = resolve(dir, 'stage-receipt.json');
        let previous = this.state.stages[name];
        if (previous?.fingerprint !== fingerprint && await exists(receipt))
            previous = await read(receipt);
        if (previous?.fingerprint === fingerprint && ['COMPLETE', 'REUSED', 'IMPORTED_CACHE'].includes(previous.status)) {
            for (const a of Object.values(previous.artifacts) as any[])
                if (await digest(a.path) !== a.sha256)
                    throw Error('CACHE_INTEGRITY: ' + name + ' artifact changed; use a new output, do not regenerate silently');
            this.state.stages[name] = { ...previous, status: 'REUSED' };
            this.events.push({ stage: name, action: 'REUSED' });
            console.log('[production] ' + name + ' REUSED');
            await this.persist();
            return previous;
        }
        await mkdir(dir, { recursive: true });
        this.state.stages[name] = { status: 'RUNNING', fingerprint, startedAt: new Date().toISOString(), directory: dir };
        await this.persist();
        console.log('[production] ' + name + ' running');
        try {
            const r = await action(dir);
            const artifacts: any = {};
            for (const [k, path] of Object.entries(r.artifacts))
                artifacts[k] = { path: resolve(root, path), sha256: await digest(path) };
            const status = r.origin === 'legacy_cache' ? 'IMPORTED_CACHE' : 'COMPLETE';
            const record = { ...this.state.stages[name], status, origin: r.origin ?? 'executed', artifacts, data: r.data ?? {}, completedAt: new Date().toISOString() };
            await save(receipt, record);
            this.state.stages[name] = record;
            this.events.push({ stage: name, action: status });
            await this.persist();
            return record;
        }
        catch (e: any) {
            this.state.stages[name] = { ...this.state.stages[name], status: e instanceof Blocked || e.code === 'ENOENT' ? 'BLOCKED' : 'FAILED', error: { code: e.code ?? 'EXECUTION_ERROR', message: String(e.message), required: e.required ?? [] } };
            this.events.push({ stage: name, action: this.state.stages[name].status });
            await this.persist();
            return null;
        }
    }
    file(stage: string, key: string) { return this.state.stages[stage]?.artifacts?.[key]?.path; }
    data(stage: string) { return this.state.stages[stage]?.data; }
    async close() { if (this.lock) {
        await this.lock.close();
        await unlink(resolve(this.out, '.production.lock')).catch(() => { });
    } }
}
