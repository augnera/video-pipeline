import { mkdirSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { generateScripts, type VideoScript } from "./clients/claude.js";
import { tts } from "./clients/sovits.js";
import { runWorkflow } from "./clients/comfyui.js";
import { transcribeToSrt } from "./clients/whisper.js";
import { recordDemo } from "./record/demo-recorder.js";
import { compose } from "./compose/composer.js";

export async function runPipeline(opts: {
  topic: string;
  hookType: string;
  lang: "yue" | "zh";
  count: number;
}) {
  const scripts = await generateScripts(opts);
  console.log(`✅ 生成 ${scripts.length} 条脚本`);

  for (const [i, script] of scripts.entries()) {
    const id = `${Date.now()}-${i}`;
    const dir = resolve(`output/${id}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/script.json`, JSON.stringify(script, null, 2));

    try {
      // 1. TTS 配音 (hook + 正文 + CTA 连成一段)
      const fullText = `${script.hookLine}。${script.narration}。${script.ctaLine}`;
      const audio = await tts({ text: fullText, lang: script.lang, outPath: `${dir}/narration.wav` });
      console.log(`  🎙 [${i}] 配音完成`);

      // 2. 数字人对口型 (ComfyUI LatentSync 工作流)
      //    先在网页里导出 API JSON 到 workflows/lipsync.json 并核对节点ID
      const head = await runWorkflow({
        workflowFile: "workflows/lipsync.json",
        patches: {
          "节点ID.inputs.audio": audio, // TODO: 换成你导出JSON里的真实节点ID
          "节点ID.inputs.video": resolve("base/talking-base.mp4"),
        },
        outPath: `${dir}/talking-head.mp4`,
      });
      console.log(`  👤 [${i}] 数字人完成`);

      // 3. 产品录屏 (Playwright)
      const screen = await recordDemo(script.demoSteps[0], dir);
      console.log(`  🖥 [${i}] 录屏完成`);

      // 4. 字幕
      const srt = await transcribeToSrt(audio, `${dir}/subs.srt`);
      console.log(`  📝 [${i}] 字幕完成 (记得人工校对粤语用字!)`);

      // 5. 合成
      const final = await compose({
        screencast: screen, talkingHead: head, narrationAudio: audio,
        srt, outPath: `${dir}/final.mp4`,
      });
      console.log(`  🎬 [${i}] 成片: ${final}`);

      logMetric(id, script);
    } catch (e) {
      console.error(`  ❌ [${i}] 失败:`, e);
    }
  }
}

/** 数据回流表: 生产字段自动记, 播放/转化数据发布后手动补 */
function logMetric(id: string, s: VideoScript) {
  const f = "output/metrics.csv";
  if (!existsSync(f))
    writeFileSync(f, "id,date,hookType,lang,topic_hook,platform,views,clicks,signups\n");
  appendFileSync(f, `${id},${new Date().toISOString().slice(0, 10)},${s.hookType},${s.lang},"${s.hookLine}",,,,\n`);
}
