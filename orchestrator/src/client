import { readFileSync } from "node:fs";

/**
 * 通用 LLM 客户端 (OpenAI 兼容格式), 替换原 claude.ts
 * 在 .env 里配置供应商, 三选一:
 *
 * 千问(阿里云百炼):
 *   LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
 *   LLM_MODEL=qwen-plus            # 或 qwen-max, 按质量/成本权衡
 *   LLM_API_KEY=sk-xxx             # 百炼控制台生成
 *
 * 豆包(火山方舟):
 *   LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
 *   LLM_MODEL=<你的接入点ID, ep-xxx 或模型名, 以方舟控制台为准>
 *   LLM_API_KEY=<方舟API Key>
 *
 * Anthropic(经OpenAI兼容层)或任何兼容网关同理。
 */
export interface VideoScript {
  id: string;
  hookType: string;
  lang: "yue" | "zh";
  hookLine: string;
  narration: string;
  demoSteps: string[];
  ctaLine: string;
  subtitleKeywords: string[];
}

const BASE = process.env.LLM_BASE_URL!;
const MODEL = process.env.LLM_MODEL!;
const KEY = process.env.LLM_API_KEY!;

export async function generateScripts(opts: {
  topic: string;
  hookType: string;
  lang: "yue" | "zh";
  count: number;
}): Promise<VideoScript[]> {
  const sellingPoints = readFileSync("assets/selling-points.json", "utf-8");
  const hooks = readFileSync("assets/hooks.json", "utf-8");
  const langName = opts.lang === "yue" ? "香港口语化粤语(书面粤文)" : "简体中文普通话";

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `你是DSE教育产品的短视频带货编剧。产品卖点库:\n${sellingPoints}\n\n爆款hook库:\n${hooks}\n\n规则: 口播25-35秒(约120-180字), hook须在3秒内制造停留理由, 台词用${langName}, 禁止承诺具体成绩等级。只输出JSON数组, 不要markdown围栏或任何其他文字。`,
        },
        {
          role: "user",
          content: `围绕主题「${opts.topic}」, 使用「${opts.hookType}」hook, 生成${opts.count}条差异化脚本。每条字段: id, hookType, lang(固定"${opts.lang}"), hookLine, narration, demoSteps(选卖点库demoId), ctaLine, subtitleKeywords。`,
        },
      ],
      temperature: 0.8,
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = data.choices[0].message.content;
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    // 重试一次: 部分国产模型偶尔会带解释文字, 截取首个JSON数组
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`LLM返回无法解析为JSON, 原始内容已保存供排查:\n${text.slice(0, 500)}`);
  }
}
