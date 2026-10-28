import { spawn } from "node:child_process";
import { readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(project, "../../orchestrator/output/day9-vp003a");
const video = resolve(output, "shot-005-remotion.mp4");
let attempt = 1;
while (true) {
  try { await access(resolve(output, attempt === 1 ? "render-run.json" : `render-run-${String(attempt).padStart(2, "0")}.json`)); attempt++; }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; break; }
}
const suffix = attempt === 1 ? "" : `-${String(attempt).padStart(2, "0")}`;
try { await access(video); throw new Error("实验视频已存在，禁止覆盖；请先评审现有产物"); }
catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
const browser = process.env.VP003A_CHROME ?? "/home/chen/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome";
await access(browser);
const args = ["--require", "./scripts/loopback.cjs", "node_modules/@remotion/cli/remotion-cli.js", "render", "src/index.ts", "Day9Shot05", video,
  `--browser-executable=${browser}`, "--gl=swangle", "--concurrency=2", "--codec=h264", "--audio-codec=aac", "--audio-bitrate=192k", "--crf=16", "--pixel-format=yuv420p", "--log=verbose"];
const startedAt = new Date().toISOString(), t0 = performance.now();
const child = spawn(process.execPath, args, { cwd: project, env: { ...process.env, NO_COLOR: "1", npm_config_cache: "/tmp/vp003a-npm-cache" } });
let log = "";
child.stdout.on("data", b => { log += b; process.stdout.write(b); });
child.stderr.on("data", b => { log += b; process.stderr.write(b); });
child.on("error", e => { throw e; });
const exitCode = await new Promise<number | null>(done => child.on("close", done));
const renderSeconds = (performance.now() - t0) / 1000;
await writeFile(resolve(output, `render${suffix}.log`), log, { flag: "wx" });
const shot = JSON.parse(await readFile(resolve(project, "src/generated/shot-005.json"), "utf8"));
await writeFile(resolve(output, `render-run${suffix}.json`), JSON.stringify({ attempt, startedAt, completedAt: new Date().toISOString(),
  node: process.version, executable: process.execPath, args, cwd: project, exitCode, renderSeconds,
  browserExecutable: browser, softwareRendering: "swangle; CPU libx264; no model inference",
  inputAudioDurationSeconds: shot.audioDurationSeconds, fps: 30, durationInFrames: Math.ceil(shot.audioDurationSeconds * 30),
  videoPath: video }, null, 2) + "\n", { flag: "wx" });
if (exitCode !== 0) process.exitCode = exitCode ?? 1;
