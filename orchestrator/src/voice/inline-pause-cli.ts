import { readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { detectInlinePauses, shortenReviewedPauses, readMonoPcm16, encodeMonoPcm16, INLINE_POLICY, type SpeechRegion } from "./inline-pause.js";

try {
  const { values } = parseArgs({ options: { audio: { type: "string" }, regions: { type: "string" },
    audit: { type: "string" }, out: { type: "string" }, "approved-regions": { type: "string" } } });
  if (!values.audio || !values.regions || !values.audit) throw new Error(
    "用法: --audio <PCM16 WAV> --regions <已知生成边界 JSON> --audit <报告 JSON> [--approved-regions <编号,编号> --out <试听 WAV>]");
  const audioPath = resolve(values.audio), regionPath = resolve(values.regions), auditPath = resolve(values.audit);
  const outputPath = values.out ? resolve(values.out) : undefined;
  const approved = new Set<number>();
  if (values["approved-regions"] !== undefined) {
    for (const id of values["approved-regions"].split(",")) {
      if (!/^\d+$/.test(id)) throw new Error("审核通过的区域编号无效"); approved.add(Number(id));
    }
    if (!outputPath) throw new Error("执行审核修剪时必须指定 --out");
  } else if (outputPath) throw new Error("默认只检测；输出音频必须指定已审核的区域编号");
  const paths = [audioPath, regionPath, auditPath, ...(outputPath ? [outputPath] : [])];
  if (new Set(paths).size !== paths.length) throw new Error("输入输出路径必须互不相同");
  for (const p of [auditPath, ...(outputPath ? [outputPath] : [])]) {
    try { await access(p); throw new Error(`不覆盖已有文件: ${p}`); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
  }
  const raw = await readFile(audioPath), hash = createHash("sha256").update(raw).digest("hex");
  const provenance = JSON.parse(await readFile(regionPath, "utf8")) as {
    schemaVersion: string; origin: string; sourceAudioSha256: string; regions: SpeechRegion[];
  };
  if (provenance.schemaVersion !== "synthesis-regions/1" || provenance.origin !== "synthesis"
    || provenance.sourceAudioSha256 !== hash || !Array.isArray(provenance.regions))
    throw new Error("缺少与本音频哈希匹配的真实生成边界；不以 ASR 猜测时间戳自动裁切");
  if ([...approved].some(id => !provenance.regions.some(r => r.id === id))) throw new Error("审核区域不存在");
  const { pcm, sampleRate } = readMonoPcm16(raw);
  const candidates = detectInlinePauses(pcm, sampleRate, provenance.regions);
  const result = shortenReviewedPauses(pcm, candidates, approved);
  if (approved.size && !result.edits.length) throw new Error("审核区域内没有满足安全条件的静音核心；需要听审或局部重生成");
  const report = { schemaVersion: "inline-pause-audit/1", createdAt: new Date().toISOString(),
    source: audioPath, sourceAudioSha256: hash, sourceRegions: regionPath,
    regionFileSha256: createHash("sha256").update(await readFile(regionPath)).digest("hex"),
    policy: INLINE_POLICY, candidates, approvedRegionIds: [...approved], edits: result.edits,
    sourceDurationSeconds: pcm.length / 2 / sampleRate, outputDurationSeconds: result.pcm.length / 2 / sampleRate,
    removedSeconds: result.removedFrames / sampleRate, retainedPcmUnchanged: true,
    inputUnchanged: hash === createHash("sha256").update(await readFile(audioPath)).digest("hex"),
    mode: approved.size ? "reviewed-silence-core-shortening" : "detection-only",
    sampleRate, output: outputPath, outputSha256: undefined as string | undefined,
    timeMap: provenance.regions.map(r => ({ ...r, outputStartFrame: result.originalToOutputFrame(r.startFrame),
      outputEndFrame: result.originalToOutputFrame(r.endFrame) })),
    limitations: ["静音阈值不能证明语义异常或排除塞音闭塞", "短无标点区域仅是候选启发式，执行前仍需审核",
      "默认参数为本轮工程候选，不是行业统一标准", "不能修正错读或有声的迟疑/拖长，遇到这些需局部重生成"],
  };
  if (outputPath) {
    const wav = encodeMonoPcm16(result.pcm, sampleRate);
    await writeFile(outputPath, wav, { flag: "wx" });
    report.outputSha256 = createHash("sha256").update(wav).digest("hex");
  }
  await writeFile(auditPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(`句内停顿候选 ${candidates.length} 处，已审核修剪 ${result.edits.length} 处，缩短 ${(result.removedFrames / sampleRate * 1000).toFixed(1)} ms`);
} catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; }
