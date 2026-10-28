import { createHash } from "node:crypto";
import type { ImportedShot } from "../import/excel.js";

export type NarrationPart = Pick<ImportedShot, "shotNumber" | "sourceRow" | "narration">;
export type Boundary = "sentence" | "shot" | "paragraph" | "end";
export const DEFAULT_RHYTHM = {
  sentenceMs: 350, shotMs: 600, paragraphMs: 700,
  continuationMs: 200, quietThresholdDb: -40, edgeWindowMs: 10,
};

/** Text stays byte-for-byte unchanged. A visual shot change alone is not a speech break. */
export function planRhythm(parts: NarrationPart[], profile = DEFAULT_RHYTHM) {
  if (!parts.length) throw new Error("没有旁白可规划");
  if (new Set(parts.map(p => p.shotNumber)).size !== parts.length) throw new Error("分镜编号重复");
  for (const p of parts) if (!p.narration?.trim()) throw new Error(`分镜 ${p.shotNumber} 旁白为空`);
  for (const key of ["sentenceMs", "shotMs", "paragraphMs", "continuationMs"] as const) {
    if (!Number.isFinite(profile[key]) || profile[key] < 0 || profile[key] > 2000)
      throw new Error(`停顿配置无效: ${key}`);
  }
  if (!Number.isFinite(profile.quietThresholdDb) || profile.quietThresholdDb < -80 || profile.quietThresholdDb > -20
    || !Number.isFinite(profile.edgeWindowMs) || profile.edgeWindowMs < 1 || profile.edgeWindowMs > 50)
    throw new Error("静音测量配置无效");
  const text = parts.map(p => p.narration).join("");
  const boundaries = new Map<number, Boundary>();
  // Chinese sentence endings only: do not split English abbreviations, decimals, commas or lists.
  for (let i = 0; i < text.length; i++) {
    if (!/[。！？!?]/u.test(text[i])) continue;
    let end = i + 1;
    while (end < text.length && /[。！？!?”’」』）》】"']/u.test(text[end])) end++;
    boundaries.set(end, "sentence"); i = end - 1;
  }
  let offset = 0;
  const spans = parts.map(p => {
    const start = offset; offset += p.narration.length;
    if (/[。！？!?][”’」』）》】"']*\s*$/u.test(p.narration)) {
      const punctuationEnd = offset - (p.narration.match(/\s*$/u)?.[0].length ?? 0);
      boundaries.delete(punctuationEnd); boundaries.set(offset, "shot");
    }
    return { ...p, start, end: offset };
  });
  for (const m of text.matchAll(/\r?\n[ \t]*(?:\r?\n)+/g)) boundaries.set(m.index + m[0].length, "paragraph");
  boundaries.set(text.length, "end");
  const segments: { text: string; startUtf16: number; endUtf16: number; shotNumbers: number[];
    boundaryAfter: Boundary; targetPauseAfterMs: number }[] = [];
  let start = 0;
  for (const [end, boundaryAfter] of [...boundaries].sort((a, b) => a[0] - b[0])) {
    if (end <= start) continue;
    const piece = text.slice(start, end);
    const targetPauseAfterMs = boundaryAfter === "end" ? 0 : boundaryAfter === "shot" ? profile.shotMs
      : boundaryAfter === "paragraph" ? profile.paragraphMs : profile.sentenceMs;
    if (!piece.trim() && segments.length) {
      const previous = segments.at(-1)!;
      previous.text += piece; previous.endUtf16 = end;
      previous.boundaryAfter = boundaryAfter; previous.targetPauseAfterMs = targetPauseAfterMs;
    } else {
      segments.push({ text: piece, startUtf16: start, endUtf16: end,
        shotNumbers: spans.filter(p => p.start < end && p.end > start).map(p => p.shotNumber),
        boundaryAfter, targetPauseAfterMs });
    }
    start = end;
  }
  if (segments.some(s => !s.text.trim()) || segments.map(s => s.text).join("") !== text)
    throw new Error("旁白分段未能保持原文完整");
  return { schemaVersion: "voice-rhythm/1", text, textSha256: createHash("sha256").update(text).digest("hex"),
    profile, segments, rules: ["完整句边界保留", "跨镜但句子未结束时不硬停", "不拆逗号/顿号/小数/英文缩写",
      "长句继续复用模型原有 token 上限切分", "仅补足段间停顿，不裁切字音"] };
}
