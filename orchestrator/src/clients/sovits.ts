import { writeFileSync } from "node:fs";

const BASE = process.env.SOVITS_URL ?? "http://localhost:9880";

/**
 * 调 GPT-SoVITS api_v2 合成语音。
 * 前置: 已在 WebUI 里克隆好音色, 参考音频挂载在容器 /workspace/voice-ref/
 * 接口参数以你部署版本的 api_v2.py 为准, 字段名偶有小版本差异。
 */
export async function tts(opts: {
  text: string;
  lang: "yue" | "zh";
  outPath: string; // e.g. output/xxx/narration.wav
}): Promise<string> {
  const body = {
    text: opts.text,
    text_lang: opts.lang, // 粤语: "yue"  普通话: "zh"
    ref_audio_path: "/workspace/voice-ref/brand-voice.wav",
    prompt_text: "这里填参考音频里实际说的那句话",
    prompt_lang: "yue",
    text_split_method: "cut5",
    speed_factor: 1.05, // 带货口播略快更有节奏
    media_type: "wav",
  };

  const res = await fetch(`${BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`SoVITS ${res.status}: ${await res.text()}`);

  writeFileSync(opts.outPath, Buffer.from(await res.arrayBuffer()));
  return opts.outPath;
}
