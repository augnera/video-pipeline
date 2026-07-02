import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { serviceFetch } from "./http.js";

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
  brollPrompt?: string; // Phase 3: B-roll 生成提示词
  templateId?: string; // Phase 3: 合成模板ID, 默认 "standard-v"
}

function envConfig() {
  const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } = process.env;
  if (!LLM_BASE_URL || !LLM_MODEL || !LLM_API_KEY)
    throw new Error("LLM 未配置: 请在 .env 中设置 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY (参考 .env.example)");
  return { base: LLM_BASE_URL, model: LLM_MODEL, key: LLM_API_KEY };
}

export async function generateScripts(opts: {
  topic: string;
  hookType: string;
  lang: "yue" | "zh";
  count: number;
}): Promise<VideoScript[]> {
  const attempts: string[] = [];
  // JSON 解析失败自动重试 1 次 (F1.1), 共两次请求机会
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await requestScripts(opts);
    attempts.push(text);
    const scripts = tryParseScripts(text);
    if (scripts) return scripts;
  }
  const errFile = saveRawToErrors(attempts, opts);
  throw new Error(`LLM 返回两次均无法解析为 JSON 数组, 原始返回已保存: ${errFile}`);
}

async function requestScripts(opts: {
  topic: string;
  hookType: string;
  lang: "yue" | "zh";
  count: number;
}): Promise<string> {
  const { base, model, key } = envConfig();
  const sellingPoints = readFileSync("assets/selling-points.json", "utf-8");
  const hooks = readFileSync("assets/hooks.json", "utf-8");
  const langName = opts.lang === "yue" ? "香港口语化粤语(书面粤文)" : "简体中文普通话";

  const res = await serviceFetch(`LLM(${model})`, `${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
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

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

/** 先直接解析(去掉围栏), 失败则正则截取首个 JSON 数组兜底; 均失败返回 null */
function tryParseScripts(text: string): VideoScript[] | null {
  const candidates = [text.replace(/```json|```/g, "").trim()];
  const m = text.match(/\[[\s\S]*\]/);
  if (m) candidates.push(m[0]);
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as VideoScript[];
    } catch {
      /* 尝试下一个候选 */
    }
  }
  return null;
}

function saveRawToErrors(attempts: string[], opts: { topic: string; hookType: string }): string {
  const dir = resolve("output/errors");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `${dir}/llm-${stamp}.txt`;
  const body = attempts
    .map((t, i) => `===== 第 ${i + 1} 次请求原始返回 =====\n${t}`)
    .join("\n\n");
  writeFileSync(file, `主题: ${opts.topic} | hook: ${opts.hookType}\n\n${body}\n`);
  return file;
}
