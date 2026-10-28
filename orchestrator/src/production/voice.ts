import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readMonoPcm16 } from '../voice/inline-pause.ts';
import { runProcess } from '../visual-mvp/process.ts';
import { root, read, save, Blocked, ref, digest } from './core.ts';
export async function generateVoice(dir: string, c: any, rhythm: any, fingerprint: string) { for (const k of ['ttsServiceDir', 'ttsPython'])
    if (!c.paths[k])
        throw new Blocked('TTS_PATH_REQUIRED', 'Configure existing approved TTS paths in production.local.json or environment', [k]); const profile = await read(c.voice.profileRef); const request = resolve(dir, 'request.json'); await save(request, { out: dir, config: c, profile, rhythm, fingerprint }); try { await runProcess(c.paths.python, [resolve(root, 'orchestrator/src/production/voice-runtime.py'), request], { log: dir + '/generation.log' }); } catch { throw new Blocked('TTS_SERVICE_UNAVAILABLE','Existing approved TTS did not complete; inspect '+dir+'/generation.log and attempt audit. No model deployment or automatic request retry.'); } const audit = await read(dir + '/rhythm-audit.json'); return { voice: dir + '/voice.wav', audit }; }
export function alignGenerated(wav: Buffer, plan: any, audit: any, script: any) {
    const { sampleRate, pcm } = readMonoPcm16(wav), count = pcm.length / 2, joins = audit.joins;
    if (audit.actualModelChunks !== joins.length + 1)
        throw Error('Missing synthesis provenance');
    let cursor = 0;
    const grouped = new Map<number, {
        start: number;
        end: number;
    }>();
    for (let i = 0; i < audit.actualModelChunks; i++) {
        const row = joins[i], planned = row?.plannedSegment ?? plan.segments.length - 1;
        const samples = row ? Math.round(row.leftChunkDurationSeconds * sampleRate) : count - cursor;
        if (samples <= 0)
            throw Error('Invalid chunk duration');
        const old = grouped.get(planned);
        grouped.set(planned, { start: old?.start ?? cursor, end: cursor + samples });
        cursor += samples + (row?.insertedFrames ?? 0);
    }
    if (cursor !== count)
        throw Error('Synthesis sample count mismatch');
    const captions: any[] = [], timing: any[] = [];
    for (let i = 0; i < plan.segments.length; i++) {
        const s = plan.segments[i], range = grouped.get(i);
        if (!range)
            throw Error('Missing planned segment');
        if (s.shotNumbers.length !== 1)
            throw new Blocked('CROSS_SHOT_ALIGNMENT', 'A sentence crosses shots; provide reviewed actual shot timing, never proportional estimates');
        let first = range.start, last = range.end - 1;
        const threshold = 32768 * 10 ** (-40 / 20);
        while (first < last && Math.abs(pcm.readInt16LE(first * 2)) < threshold)
            first++;
        while (last > first && Math.abs(pcm.readInt16LE(last * 2)) < threshold)
            last--;
        const c = { id: i + 1, shotNumber: s.shotNumbers[0], text: s.text, startSeconds: Math.max(range.start / sampleRate, first / sampleRate - .04), endSeconds: Math.min(range.end / sampleRate, (last + 1) / sampleRate + .08) };
        captions.push(c);
        timing.push({ ...range, ...c });
    }
    const shots = script.shots.map((s: any) => { const rows = timing.filter(x => x.shotNumber === s.shotNumber); return { ...s, voiceover: { timelineStartSeconds: rows[0].start / sampleRate, timelineEndSeconds: rows.at(-1).end / sampleRate, durationSeconds: (rows.at(-1).end - rows[0].start) / sampleRate } }; });
    return { captions, voiced: { ...script, schemaVersion: 'ip-script-voiced/1', shots, actualDurationSeconds: count / sampleRate }, precision: 'Sentence synthesis provenance and actual waveform, not word alignment' };
}
export const srt = (cues: any[]) => cues.map((c, i) => `${i + 1}\n${stamp(c.startSeconds)} --> ${stamp(c.endSeconds)}\n${c.text}\n`).join('\n');
function stamp(s: number) { const n = Math.round(s * 1000); return `${String(Math.floor(n / 3600000)).padStart(2, '0')}:${String(Math.floor(n / 60000) % 60).padStart(2, '0')}:${String(Math.floor(n / 1000) % 60).padStart(2, '0')},${String(n % 1000).padStart(3, '0')}`; }
