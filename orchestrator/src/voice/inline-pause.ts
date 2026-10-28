/** Conservative, review-gated silence-core shortening; no TTS/model dependencies. */
export interface SpeechRegion { id: number; text: string; startFrame: number; endFrame: number }
export const INLINE_POLICY = {
  detectDb: -40, cutPeakDb: -55, minCandidateMs: 140, maxCandidateMs: 500,
  keepMs: 60, edgeGuardMs: 20, regionGuardMs: 80, maxConnectedCharacters: 16,
};
export interface PauseCandidate {
  id: string; regionId: number; text: string; startFrame: number; endFrame: number;
  durationMs: number; shortUnpunctuatedUnit: boolean;
  cut: { startFrame: number; endFrame: number; removedMs: number; retainedMs: number;
    maxRemovedAmplitude: number; spliceJumpAmplitude: number } | null;
  decision: string;
}

export function readMonoPcm16(wav: Buffer): { sampleRate: number; pcm: Buffer } {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE")
    throw new Error("需要 RIFF WAV 音频");
  const declaredEnd = wav.readUInt32LE(4) + 8;
  if (declaredEnd > wav.length) throw new Error("WAV 文件不完整");
  let sampleRate: number | undefined, pcm: Buffer | undefined;
  for (let offset = 12; offset + 8 <= declaredEnd;) {
    const size = wav.readUInt32LE(offset + 4), begin = offset + 8, end = begin + size;
    if (end > declaredEnd) throw new Error("WAV 数据块不完整");
    const tag = wav.toString("ascii", offset, offset + 4);
    if (tag === "fmt ") {
      if (size < 16 || wav.readUInt16LE(begin) !== 1 || wav.readUInt16LE(begin + 2) !== 1
        || wav.readUInt16LE(begin + 14) !== 16 || wav.readUInt16LE(begin + 12) !== 2)
        throw new Error("当前仅支持单声道 PCM16，不自动转换或重采样");
      sampleRate = wav.readUInt32LE(begin + 4);
    } else if (tag === "data") {
      if (pcm) throw new Error("不支持多个 WAV data 块");
      pcm = wav.subarray(begin, end);
    }
    offset = end + size % 2;
  }
  if (!sampleRate || !pcm?.length || pcm.length % 2) throw new Error("缺少有效 PCM 数据或采样率");
  return { sampleRate, pcm };
}

export function encodeMonoPcm16(pcm: Buffer, sampleRate: number): Buffer {
  if (!pcm.length || pcm.length % 2 || !Number.isInteger(sampleRate) || sampleRate <= 0)
    throw new Error("PCM 数据或采样率无效");
  const header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40); return Buffer.concat([header, pcm]);
}

export function detectInlinePauses(pcm: Buffer, sampleRate: number, regions: SpeechRegion[], policy = INLINE_POLICY): PauseCandidate[] {
  if (!pcm.length || pcm.length % 2 || !Number.isInteger(sampleRate) || sampleRate <= 0)
    throw new Error("无效 PCM 输入");
  if (!Object.values(policy).every(Number.isFinite)
    || !(policy.detectDb >= -80 && policy.detectDb <= -20 && policy.cutPeakDb < policy.detectDb)
    || policy.keepMs < 2 * policy.edgeGuardMs || policy.edgeGuardMs < 1
    || policy.minCandidateMs <= policy.keepMs || policy.maxCandidateMs < policy.minCandidateMs
    || policy.maxCandidateMs > 2000 || policy.regionGuardMs < 0
    || !Number.isInteger(policy.maxConnectedCharacters) || policy.maxConnectedCharacters < 1)
    throw new Error("句内停顿策略无效");
  const length = pcm.length / 2, ids = new Set<number>();
  let previousEnd = 0;
  for (const r of regions) {
    if (!Number.isInteger(r.id) || ids.has(r.id) || !r.text?.trim()
      || !Number.isInteger(r.startFrame) || !Number.isInteger(r.endFrame)
      || r.startFrame < previousEnd || r.endFrame <= r.startFrame || r.endFrame > length)
      throw new Error("生成片段边界重复、重叠或超出音频范围");
    ids.add(r.id); previousEnd = r.endFrame;
  }
  const threshold = 32768 * 10 ** (policy.detectDb / 20);
  const strict = 32768 * 10 ** (policy.cutPeakDb / 20);
  const frame = (ms: number) => Math.ceil(ms * sampleRate / 1000);
  const candidates: PauseCandidate[] = [];
  let runStart = -1;
  const finish = (end: number) => {
    if (runStart < 0) return;
    const start = runStart; runStart = -1;
    const count = end - start;
    if (count < frame(policy.minCandidateMs)) return;
    // Whole run must be inside one independently generated utterance. This
    // excludes the sentence/paragraph gaps already approved by the rhythm plan.
    const r = regions.find(r => start >= r.startFrame + frame(policy.regionGuardMs)
      && end <= r.endFrame - frame(policy.regionGuardMs));
    if (!r) return;
    const body = r.text.trim().replace(/[。！？!?”’」』）》】"']+$/u, "");
    const shortUnpunctuatedUnit = [...body].filter(c => /[\p{L}\p{N}]/u.test(c)).length <= policy.maxConnectedCharacters
      && !/[，,、；;：:。！？!?…—\r\n]/u.test(body);
    let cut: PauseCandidate["cut"] = null;
    if (shortUnpunctuatedUnit && count <= frame(policy.maxCandidateMs)) {
      const remove = count - frame(policy.keepMs), guard = frame(policy.edgeGuardMs);
      let bestScore = Infinity;
      for (let a = start + guard; a <= end - guard - remove; a++) {
        const b = a + remove;
        let peak = 0;
        for (let i = a; i < b; i++) { peak = Math.max(peak, Math.abs(pcm.readInt16LE(i * 2))); if (peak > strict) break; }
        if (peak > strict) continue;
        const jump = Math.abs(pcm.readInt16LE((a - 1) * 2) - pcm.readInt16LE(b * 2));
        if (jump > strict) continue;
        const score = jump * length + Math.abs(a + b - start - end);
        if (score < bestScore) {
          bestScore = score;
          cut = { startFrame: a, endFrame: b, removedMs: remove / sampleRate * 1000,
            retainedMs: (count - remove) / sampleRate * 1000, maxRemovedAmplitude: peak, spliceJumpAmplitude: jump };
        }
      }
    }
    candidates.push({ id: `${r.id}:${start}-${end}`, regionId: r.id, text: r.text,
      startFrame: start, endFrame: end, durationMs: count / sampleRate * 1000, shortUnpunctuatedUnit, cut,
      decision: cut ? "可供已确认连读区域的审核修剪；低音量本身不是异常证明"
        : "仅报告；需词/音素对齐或局部重生成，禁止自动裁切" });
  };
  for (let i = 0; i < length; i++) {
    if (Math.abs(pcm.readInt16LE(i * 2)) <= threshold) { if (runStart < 0) runStart = i; }
    else finish(i);
  }
  finish(length); return candidates;
}

export function shortenReviewedPauses(pcm: Buffer, candidates: PauseCandidate[], approvedRegionIds: Set<number>) {
  const edits = candidates.filter(c => approvedRegionIds.has(c.regionId) && c.cut).map(c => ({ candidateId: c.id,
    regionId: c.regionId, ...c.cut! })).sort((a, b) => a.startFrame - b.startFrame);
  let cursor = 0, removed = 0;
  const parts: Buffer[] = [];
  const timeline = edits.map(e => {
    if (e.startFrame < cursor || e.endFrame <= e.startFrame || e.endFrame > pcm.length / 2)
      throw new Error("修剪区间重叠或超出范围");
    parts.push(pcm.subarray(cursor * 2, e.startFrame * 2)); cursor = e.endFrame;
    const row = { ...e, outputJoinFrame: e.startFrame - removed, removedFrames: e.endFrame - e.startFrame };
    removed += row.removedFrames; return row;
  });
  parts.push(pcm.subarray(cursor * 2));
  return { pcm: Buffer.concat(parts), edits: timeline, removedFrames: removed,
    retainedPcmUnchanged: true, originalToOutputFrame: (f: number) => {
      let shift = 0;
      for (const e of edits) {
        if (f >= e.endFrame) shift += e.endFrame - e.startFrame;
        else if (f > e.startFrame) return e.startFrame - shift;
      }
      return f - shift;
    } };
}
