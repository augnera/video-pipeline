import { readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import type { ImportedScript } from "../import/excel.js";
import { encodeMonoPcm16 } from "./inline-pause.js";
import { readConsistentVoiceClips, stitchVoicePcm } from "./delivery.js";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
type Clip = { shotNumber: number; sourceRow: number; narration: string; audioPath: string; audioSha256: string;
  acquisition: Record<string, unknown> };
try {
  const { values } = parseArgs({ options: { script: { type: "string" }, clips: { type: "string" },
    preview: { type: "string" }, out: { type: "string" } } });
  if (!values.script || !values.clips || !values.preview || !values.out)
    throw new Error("用法: --script <标准化 JSON> --clips <配音清单 JSON> --preview <完整试听 WAV> --out <配音 JSON>");
  const scriptPath = resolve(values.script), manifestPath = resolve(values.clips), previewPath = resolve(values.preview), outputPath = resolve(values.out);
  if (new Set([scriptPath, manifestPath, previewPath, outputPath]).size !== 4) throw new Error("输入输出路径必须互不相同");
  const input = await readFile(scriptPath), script = JSON.parse(input.toString()) as ImportedScript;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { schemaVersion: string; scriptSha256: string;
    lockedConfigPath: string; lockedConfigSha256: string; gapPolicy: { targetMs: number; thresholdDb: number };
    createdAt: string; clips: Clip[]; automatedChecksPath: string };
  if (manifest.schemaVersion !== "voice-clips/1" || manifest.scriptSha256 !== sha(input)) throw new Error("配音清单与原始脚本哈希不匹配");
  if (sha(await readFile(manifest.lockedConfigPath)) !== manifest.lockedConfigSha256) throw new Error("声音配置记录哈希不匹配");
  if (manifest.clips.length !== script.shots.length || new Set(manifest.clips.map(c => c.shotNumber)).size !== script.shots.length)
    throw new Error("分镜音频缺失或编号重复");
  const ordered = script.shots.map(s => {
    const c = manifest.clips.find(c => c.shotNumber === s.shotNumber);
    if (!c || c.sourceRow !== s.sourceRow || c.narration !== s.narration) throw new Error(`分镜 ${s.shotNumber} 原文或 sourceRow 不匹配`);
    return c;
  });
  const wavs = await Promise.all(ordered.map(async c => {
    const wav = await readFile(c.audioPath);
    if (sha(wav) !== c.audioSha256) throw new Error(`分镜 ${c.shotNumber} 音频哈希不匹配`);
    return wav;
  }));
  const { sampleRate, clips } = readConsistentVoiceClips(wavs);
  const joined = stitchVoicePcm(clips, sampleRate, manifest.gapPolicy.targetMs, manifest.gapPolicy.thresholdDb);
  const preview = encodeMonoPcm16(joined.pcm, sampleRate);
  const manifestSha256 = sha(await readFile(manifestPath));
  const fingerprint = sha(JSON.stringify({ script: sha(input), config: manifest.lockedConfigSha256,
    manifest: manifestSha256, clips: ordered.map(c => c.audioSha256), gapPolicy: manifest.gapPolicy }));
  const exists = async (p: string) => { try { await access(p); return true; } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e;
  } };
  if (await exists(outputPath)) {
    const old = JSON.parse(await readFile(outputPath, "utf8"));
    if (old.voiceDelivery?.fingerprint !== fingerprint || sha(await readFile(previewPath)) !== sha(preview))
      throw new Error("已有交付与当前输入不一致；禁止覆盖，请使用新输出路径");
    console.log(`复用已验证的完整交付: ${outputPath}`);
  } else {
    if (await exists(previewPath)) {
      if (sha(await readFile(previewPath)) !== sha(preview)) throw new Error("已有试听 WAV 不匹配，禁止覆盖");
    } else await writeFile(previewPath, preview, { flag: "wx" });
    const timeline = joined.timeline.map((row, i) => ({ ...row, shotNumber: ordered[i].shotNumber,
      sourceRow: ordered[i].sourceRow, startSeconds: row.startFrame / sampleRate, endSeconds: row.endFrame / sampleRate,
      gapBeforeSeconds: row.insertedGapBeforeFrames / sampleRate }));
    const result = { ...script, schemaVersion: "ip-script-voiced/1", voiceDelivery: { fingerprint,
      createdAt: manifest.createdAt, scope: "private-noncommercial-technical-evaluation",
      inputScriptPath: scriptPath, inputScriptSha256: sha(input), clipManifestPath: manifestPath, clipManifestSha256: manifestSha256,
      lockedConfigPath: manifest.lockedConfigPath, lockedConfigSha256: manifest.lockedConfigSha256,
      previewPath, previewSha256: sha(preview), sampleRate, channels: 1, codec: "pcm_s16le",
      totalDurationSeconds: joined.durationFrames / sampleRate,
      sumClipDurationSeconds: clips.reduce((n, c) => n + c.length / 2 / sampleRate, 0),
      insertedGapSeconds: joined.timeline.reduce((n, t) => n + t.insertedGapBeforeFrames / sampleRate, 0),
      gapPolicy: manifest.gapPolicy, timeline, automatedChecksPath: manifest.automatedChecksPath,
      hearingStatus: "awaiting-holder-final-preview-review" },
      shots: script.shots.map((s, i) => ({ ...s, voiceover: { ...s.voiceover,
        audioPath: ordered[i].audioPath, audioSha256: ordered[i].audioSha256,
        durationSeconds: clips[i].length / 2 / sampleRate, durationFrames: clips[i].length / 2,
        sampleRate, channels: 1, codec: "pcm_s16le", timelineStartSeconds: timeline[i].startSeconds,
        timelineEndSeconds: timeline[i].endSeconds, gapBeforeSeconds: timeline[i].gapBeforeSeconds,
        gapAfterSeconds: timeline[i + 1]?.gapBeforeSeconds ?? 0, acquisition: ordered[i].acquisition } })) };
    await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    console.log(`交付 ${ordered.length} 段，完整试听 ${(joined.durationFrames / sampleRate).toFixed(3)} 秒: ${outputPath}`);
  }
} catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; }
