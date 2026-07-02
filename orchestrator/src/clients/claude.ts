import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

export interface VideoScript {
  hookType: string;
  lang: "yue" | "zh"; // 粤语 | 普通话
  hookLine: string; // 开头3秒钩子台词
  narration: string; // 口播正文 (给TTS)
  demoSteps: string[]; // 录屏演示指令 (给Playwright场景选择)
  ctaLine: string; // 结尾行动号召
  subtitleKeywords: string[]; // 需要高亮的字幕关键词
}

const client = new Anthropic(); // 自动读 ANTHROPIC_API_KEY

export async function generateScripts(opts: {
  topic: string;
  hookType: string;
  lang: "yue" | "zh";
  count: number;
}): Promise<VideoScript[]> {
  const sellingPoints = readFileSync("assets/selling-points.json", "utf-8");
  const hooks = readFileSync("assets/hooks.json", "utf-8");

  const langName = opts.lang === "yue" ? "香港口语化粤语(书面粤文)" : "简体中文普通话";

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: `你是DSE教育产品的短视频带货编剧。产品卖点库:\n${sellingPoints}\n\n爆款hook库:\n${hooks}\n\n规则: 口播总时长控制在25-35秒(约120-180字), hook必须在3秒内制造停留理由, 台词用${langName}, 避免夸大成绩承诺。只输出JSON数组, 不要任何其他文字或markdown围栏。`,
    messages: [
      {
        role: "user",
        content: `围绕主题「${opts.topic}」, 使用「${opts.hookType}」类型的hook, 生成${opts.count}条差异化脚本。每条为一个JSON对象, 字段: hookType, lang(固定"${opts.lang}"), hookLine, narration, demoSteps(从卖点库的demo场景ID中选1-2个), ctaLine, subtitleKeywords。`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
