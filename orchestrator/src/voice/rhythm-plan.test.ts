import { test } from "node:test";
import assert from "node:assert/strict";
import { planRhythm } from "./rhythm-plan.js";
const part = (shotNumber: number, narration: string) => ({ shotNumber, sourceRow: shotNumber + 1, narration });

test("sentence and shot pauses are generic, without content-specific exceptions", () => {
  const p = planRhythm([part(1, "今天聊个话题。先介绍一下。"), part(2, "接着说正文。")]);
  assert.deepEqual(p.segments.map(s => [s.boundaryAfter, s.targetPauseAfterMs]),
    [["sentence", 350], ["shot", 600], ["end", 0]]);
  assert.equal(p.segments.map(s => s.text).join(""), p.text);
});
test("a visual cut inside an unfinished sentence does not create a speech break", () => {
  const p = planRhythm([part(1, "真正重要的是，"), part(2, "先验证。再行动。")]);
  assert.equal(p.segments[0].text, "真正重要的是，先验证。");
  assert.deepEqual(p.segments[0].shotNumbers, [1, 2]);
});
test("closing quotes, decimals, lists and original whitespace survive segmentation", () => {
  const text = "他说：“要验证！”\n\n先测 1.5 倍，再看 A.I. 的结果。";
  const p = planRhythm([part(1, text)]);
  assert.equal(p.segments.map(s => s.text).join(""), text);
  assert.equal(p.segments[0].boundaryAfter, "paragraph");
  assert.equal(p.segments[0].targetPauseAfterMs, 700);
  assert.equal(p.segments.length, 2);
});
test("invalid input or unsafe pause settings fail explicitly", () => {
  assert.throws(() => planRhythm([]));
  assert.throws(() => planRhythm([part(1, " ")]));
  assert.throws(() => planRhythm([part(1, "甲。"), part(1, "乙。")]), /重复/);
  assert.throws(() => planRhythm([part(1, "甲。")], { sentenceMs: -1, shotMs: 600, paragraphMs: 700,
    continuationMs: 200, quietThresholdDb: -40, edgeWindowMs: 10 }));
});
