import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const BASE = process.env.WHISPER_URL ?? "http://localhost:8080";

export async function transcribeToSrt(audioPath: string, srtPath: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(audioPath)]), basename(audioPath));
  form.append("model", "Systran/faster-whisper-large-v3");
  form.append("response_format", "verbose_json");
  // 粤语音频建议加: form.append("language", "yue")  普通话: "zh"

  const res = await fetch(`${BASE}/v1/audio/transcriptions`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { segments: { start: number; end: number; text: string }[] };

  const srt = data.segments
    .map((s, i) => `${i + 1}\n${fmt(s.start)} --> ${fmt(s.end)}\n${s.text.trim()}\n`)
    .join("\n");
  writeFileSync(srtPath, srt);
  return srtPath;
}

function fmt(sec: number): string {
  const ms = Math.round((sec % 1) * 1000);
  const s = Math.floor(sec);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)},${p(ms, 3)}`;
}
