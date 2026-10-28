import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readMonoPcm16 } from "../../../orchestrator/src/voice/inline-pause.ts";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(project, "../../orchestrator/output/day9-vp003a");
const video = resolve(out, "shot-005-remotion.mp4");
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const run = (exe: string, args: string[]) => {
  const r = spawnSync(exe, args, { maxBuffer: 16 * 1024 * 1024 });
  if (r.error) throw r.error;
  assert.equal(r.status, 0, `${exe}: ${r.stderr.toString()}`);
  return r.stdout;
};
const probe = JSON.parse(run("ffprobe", ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", video]).toString());
await writeFile(resolve(out, "ffprobe.json"), JSON.stringify(probe, null, 2) + "\n");
const vs = probe.streams.find((s: any) => s.codec_type === "video"), as = probe.streams.find((s: any) => s.codec_type === "audio");
assert.equal(vs.width, 1080); assert.equal(vs.height, 1920); assert.equal(vs.nb_read_frames, "107");
assert.equal(vs.r_frame_rate, "30/1"); assert.equal(vs.codec_name, "h264"); assert.equal(vs.pix_fmt, "yuv420p");
assert.equal(as.codec_name, "aac");
run("ffmpeg", ["-nostdin", "-v", "error", "-xerror", "-threads", "2", "-i", video, "-f", "null", "-"]);
const voiced = JSON.parse(await readFile(resolve(project, "../../orchestrator/output/day9/script.voiced.json"), "utf8"));
const source = voiced.shots[4].voiceover;
const original = readMonoPcm16(await readFile(source.audioPath));
const decoded = run("ffmpeg", ["-nostdin", "-v", "error", "-threads", "2", "-i", video, "-map", "0:a:0", "-ac", "1", "-ar", "22050", "-f", "s16le", "pipe:1"]);
const array = (b: Buffer) => Float64Array.from({ length: b.length / 2 }, (_, i) => b.readInt16LE(i * 2));
const a = array(original.pcm), b = array(decoded);
const similarity = (lag: number, start = 7000, end = a.length - 7000) => {
  let aa = 0, bb = 0, ab = 0;
  for (let i = start; i < end; i++) {
    const j = i + lag; if (j < 0 || j >= b.length) continue;
    aa += a[i] * a[i]; bb += b[j] * b[j]; ab += a[i] * b[j];
  }
  return ab / Math.sqrt(aa * bb);
};
let best = { lag: 0, correlation: -1 };
for (let lag = -660; lag <= 660; lag += 3) {
  const correlation = similarity(lag); if (correlation > best.correlation) best = { lag, correlation };
}
const center = best.lag;
for (let lag = center - 3; lag <= center + 3; lag++) {
  const correlation = similarity(lag); if (correlation > best.correlation) best = { lag, correlation };
}
assert.ok(best.correlation > 0.97, "压缩后音频与原音频不一致，停止");
assert.ok(Math.abs(best.lag / 22050) < 1 / 30, "音频偏移超过一帧");
const tailCorrelation = similarity(best.lag, Math.floor(2.5 * 22050), Math.floor(3.18 * 22050));
assert.ok(tailCorrelation > 0.97, "结尾语音覆盖或音色异常");
const videoDuration = Number(vs.duration), difference = videoDuration - source.durationSeconds;
assert.ok(difference >= 0 && difference < 1 / 30);
await mkdir(resolve(out, "frames"), { recursive: true });
for (const [name, seconds] of [["early", 0.6], ["middle", 2], ["late", 3.333333]] as const)
  run("ffmpeg", ["-nostdin", "-v", "error", "-n", "-ss", String(seconds), "-i", video, "-frames:v", "1", "-threads", "2", resolve(out, "frames", `${name}.png`)]);
const before = JSON.parse(await readFile(resolve(out, "protected-inputs.before.json"), "utf8"));
for (const f of before) assert.equal(sha(await readFile(f.path)), f.sha256, `受保护文件变化 ${f.path}`);
const check = { checkedAt: new Date().toISOString(), videoPath: video, videoSha256: sha(await readFile(video)),
  decode: "full video and audio FFmpeg -xerror decode passed", resolution: [1080, 1920], fps: 30, frames: 107,
  videoDurationSeconds: videoDuration, sourceAudioDurationSeconds: source.durationSeconds,
  ceilPaddingSeconds: difference, audioStreamDurationSeconds: Number(as.duration), audioStreamSampleRate: Number(as.sample_rate),
  sourceAudioUnchanged: sha(await readFile(source.audioPath)) === source.audioSha256,
  publicAudioCopyMatchesSource: sha(await readFile(resolve(project, "public/shot-005.wav"))) === source.audioSha256,
  audioComparison: { decodedAtSampleRate: 22050, bestLagSamples: best.lag, bestLagSeconds: best.lag / 22050,
    correlation: best.correlation, tail2500to3180msCorrelation: tailCorrelation,
    note: "AAC is lossy; correlation verifies media timing/coverage, not phonetic or subjective quality." },
  protectedFilesUnchanged: before.length, captionAlignment: "not implemented; timeline has whole-shot draft envelopes only",
  visualAccentTiming: "Existing ASR estimates: 功能 1.84s, 越做越多 2.22s; rough design markers, not forced alignment.",
  humanReview: "待持有人观看 MP4，确认视觉风格、运动节奏与主观音画同步" };
await writeFile(resolve(out, "validation.json"), JSON.stringify(check, null, 2) + "\n", { flag: "wx" });
const timeline = JSON.parse(await readFile(resolve(out, "timeline.draft.json"), "utf8"));
timeline.visualAudioPolicy = "Mute embedded audio of visual MP4 assets; audioPath is the only narration source. Render against the original global timeline, not by concatenating encoded file durations.";
timeline.shots[4].assetPath = video;
timeline.shots[4].visualStatus = "experiment-rendered-awaiting-holder-review";
await writeFile(resolve(out, "timeline.visual-draft.json"), JSON.stringify(timeline, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(check, null, 2));
