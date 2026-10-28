import { readMonoPcm16 } from "./inline-pause.js";

/** Keep existing silence; add only the missing part of an inter-shot pause. */
export function stitchVoicePcm(clips: Buffer[], sampleRate: number, targetGapMs: number, thresholdDb: number) {
  if (!clips.length || clips.some(p => !p.length || p.length % 2) || !Number.isInteger(sampleRate) || sampleRate <= 0)
    throw new Error("缺少有效 PCM 分镜音频");
  if (!Number.isFinite(targetGapMs) || targetGapMs < 0 || targetGapMs > 2000
    || !Number.isFinite(thresholdDb) || thresholdDb < -80 || thresholdDb > -20)
    throw new Error("跨镜停顿配置无效");
  const threshold = 32768 * 10 ** (thresholdDb / 20), target = Math.ceil(sampleRate * targetGapMs / 1000);
  const edge = (pcm: Buffer, leading: boolean) => {
    const frames = pcm.length / 2;
    let count = 0;
    while (count < frames && Math.abs(pcm.readInt16LE((leading ? count : frames - count - 1) * 2)) <= threshold) count++;
    return count;
  };
  const parts: Buffer[] = [], timeline: { startFrame: number; endFrame: number; durationFrames: number;
    insertedGapBeforeFrames: number; existingQuietBeforeFrames: number }[] = [];
  let cursor = 0;
  for (let i = 0; i < clips.length; i++) {
    const existing = i ? edge(clips[i - 1], false) + edge(clips[i], true) : 0;
    const missing = i ? Math.max(0, target - existing) : 0;
    if (missing) parts.push(Buffer.alloc(missing * 2));
    cursor += missing;
    const frames = clips[i].length / 2;
    timeline.push({ startFrame: cursor, endFrame: cursor + frames, durationFrames: frames,
      insertedGapBeforeFrames: missing, existingQuietBeforeFrames: existing });
    parts.push(clips[i]); cursor += frames;
  }
  return { pcm: Buffer.concat(parts), timeline, durationFrames: cursor };
}

export function readConsistentVoiceClips(wavs: Buffer[]) {
  const clips = wavs.map(readMonoPcm16);
  if (!clips.length || clips.some(c => c.sampleRate !== clips[0].sampleRate))
    throw new Error("所有分镜必须使用相同采样率，不自动重采样");
  return { sampleRate: clips[0].sampleRate, clips: clips.map(c => c.pcm) };
}
