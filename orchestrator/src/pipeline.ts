import { mkdirSync, writeFileSync, appendFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { generateScripts, type VideoScript } from "./clients/llm.js";
import { tts } from "./clients/sovits.js";
import { runWorkflow } from "./clients/comfyui.js";
import { transcribeToSrt } from "./clients/whisper.js";
import { recordDemo } from "./record/demo-recorder.js";
import { compose } from "./compose/composer.js";
import { createLogger } from "./logger.js";

export async function runPipeline(opts: {
  topic: string;
  hookType: string;
  lang: "yue" | "zh";
  count: number;
}) {
  const runLog = createLogger();
  const scripts = await runLog.step(`脚本生成 (LLM ${process.env.LLM_MODEL ?? ""})`, () =>
    generateScripts(opts),
  );
  runLog.info(`共生成 ${scripts.length} 条脚本`);

  let ok = 0;
  for (const script of scripts) {
    const id = nextId();
    script.id = id; // id 由编排层分配 (PRD 4.1: YYYYMMDD-序号), 覆盖 LLM 返回值
    const dir = resolve(`output/${id}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/script.json`, JSON.stringify(script, null, 2));

    const log = createLogger(`${dir}/pipeline.log`);
    const t0 = Date.now();
    log.info(`—— 任务 ${id} 开始 (主题: ${opts.topic}, hook: ${script.hookType}, 语言: ${script.lang}) ——`);
    try {
      // 1. TTS 配音 (hook + 正文 + CTA 连成一段)
      const fullText = `${script.hookLine}。${script.narration}。${script.ctaLine}`;
      const audio = await log.step("TTS配音 (GPT-SoVITS)", () =>
        tts({ text: fullText, lang: script.lang, outPath: `${dir}/narration.wav` }),
      );

      // 2. 数字人对口型 (ComfyUI LatentSync 工作流)
      const head = await log.step("数字人对口型 (ComfyUI)", () =>
        runWorkflow({
          workflow: "lipsync",
          inputs: { audio: resolve(audio), video: resolve("base/talking-base.mp4") },
          outPath: `${dir}/talking-head.mp4`,
        }),
      );

      // 3. 产品录屏 (Playwright)
      const screen = await log.step(`产品录屏 (Playwright: ${script.demoSteps[0]})`, () =>
        recordDemo(script.demoSteps[0], dir),
      );

      // 4. 字幕
      const srt = await log.step("字幕生成 (Whisper)", () =>
        transcribeToSrt(audio, `${dir}/subs.srt`),
      );
      log.info("字幕已生成, 记得人工校对粤语用字!");

      // 5. 合成
      const final = await log.step("视频合成 (ffmpeg)", () =>
        compose({
          screencast: screen, talkingHead: head, narrationAudio: audio,
          srt, outPath: `${dir}/final.mp4`,
        }),
      );

      logMetric(script, opts.topic);
      ok++;
      log.info(`—— 任务 ${id} 完成, 总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s, 成片: ${final} ——`);
    } catch (e) {
      log.error(`—— 任务 ${id} 中止: ${e instanceof Error ? e.message : String(e)} ——`);
    }
  }
  runLog.info(`批次结束: 成功 ${ok}/${scripts.length}`);
}

/** id 格式 YYYYMMDD-序号 (PRD 4.1), 序号按当天已有产出目录递增 */
function nextId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outRoot = resolve("output");
  mkdirSync(outRoot, { recursive: true });
  const seqs = readdirSync(outRoot)
    .filter((d) => d.startsWith(`${date}-`))
    .map((d) => Number(d.slice(date.length + 1)))
    .filter((n) => Number.isInteger(n));
  return `${date}-${(seqs.length ? Math.max(...seqs) : 0) + 1}`;
}

/** 数据回流表 (PRD 4.3): 生产时自动写前7列, 发布数据人工回填 */
function logMetric(s: VideoScript, topic: string) {
  const f = "output/metrics.csv";
  if (!existsSync(f))
    writeFileSync(
      f,
      "id,date,hookType,lang,topic,hookLine,templateId,platform,publishDate,views,avgWatchPct,clicks,signups,notes\n",
    );
  const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const date = new Date().toISOString().slice(0, 10);
  const templateId = s.templateId ?? "standard-v";
  appendFileSync(
    f,
    `${s.id},${date},${csv(s.hookType)},${s.lang},${csv(topic)},${csv(s.hookLine)},${templateId},,,,,,,\n`,
  );
}
