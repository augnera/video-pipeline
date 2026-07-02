import { readFileSync, writeFileSync } from "node:fs";
import { serviceFetch } from "./http.js";

const BASE = process.env.SOVITS_URL ?? "http://localhost:9880";

/**
 * 调 GPT-SoVITS api_v2 合成语音。
 * 前置: 已在 WebUI 里克隆好音色, 参考音频挂载在容器 /workspace/voice-ref/,
 * 音色条目配置在 config/voices.json (F1.2)。
 * 接口参数以你部署版本的 api_v2.py 为准, 字段名偶有小版本差异。
 */
interface VoiceConfig {
  ref_audio_path: string;
  prompt_text: string;
  prompt_lang: string;
}

function loadVoice(lang: "yue" | "zh"): VoiceConfig {
  const voices = JSON.parse(readFileSync("config/voices.json", "utf-8")) as Record<
    string,
    VoiceConfig
  >;
  const voice = voices[lang];
  if (!voice?.ref_audio_path || !voice?.prompt_text)
    throw new Error(`config/voices.json 缺少语言 "${lang}" 的完整音色配置`);
  if (voice.prompt_text.startsWith("TODO"))
    throw new Error(
      `config/voices.json 中 "${lang}" 音色的 prompt_text 仍是占位值, 请填入参考音频的逐字文本`,
    );
  return voice;
}

export async function tts(opts: {
  text: string;
  lang: "yue" | "zh";
  outPath: string; // e.g. output/xxx/narration.wav
}): Promise<string> {
  const voice = loadVoice(opts.lang);
  const body = {
    text: opts.text,
    text_lang: opts.lang, // 粤语: "yue"  普通话: "zh"
    ref_audio_path: voice.ref_audio_path,
    prompt_text: voice.prompt_text,
    prompt_lang: voice.prompt_lang,
    text_split_method: "cut5",
    speed_factor: 1.05, // 带货口播略快更有节奏
    media_type: "wav",
  };

  // 失败重试 1 次 (F1.2)
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await serviceFetch("GPT-SoVITS", `${BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      writeFileSync(opts.outPath, Buffer.from(await res.arrayBuffer()));
      return opts.outPath;
    } catch (e) {
      lastErr = e;
      if (attempt === 1) console.warn(`GPT-SoVITS 第 1 次请求失败, 重试中: ${e instanceof Error ? e.message : e}`);
    }
  }
  throw lastErr;
}
