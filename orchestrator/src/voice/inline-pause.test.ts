import { test } from "node:test";
import assert from "node:assert/strict";
import { readMonoPcm16, encodeMonoPcm16, detectInlinePauses, shortenReviewedPauses } from "./inline-pause.js";
const pcm = (values: number[]) => { const b = Buffer.alloc(values.length * 2); values.forEach((n, i) => b.writeInt16LE(n, i * 2)); return b; };
const region = (endFrame: number, text = "今天介绍新产品。") => [{ id: 7, text, startFrame: 0, endFrame }];
const signal = (level = 0, duration = 180) => pcm([...Array(300).fill(5000), ...Array(duration).fill(level), ...Array(300).fill(5000)]);

test("approved quiet core shortens without changing retained samples or speech rate", () => {
  const input = signal(), candidates = detectInlinePauses(input, 1000, region(input.length / 2));
  assert.equal(candidates.length, 1); assert.ok(candidates[0].cut);
  const result = shortenReviewedPauses(input, candidates, new Set([7]));
  const cut = result.edits[0];
  assert.equal(result.removedFrames, 120);
  assert.deepEqual(result.pcm, Buffer.concat([input.subarray(0, cut.startFrame * 2), input.subarray(cut.endFrame * 2)]));
  assert.equal(result.originalToOutputFrame(780), 660);
});
test("detection alone and unreviewed phonetic closures never trigger an edit", () => {
  const input = signal(), candidates = detectInlinePauses(input, 1000, region(input.length / 2));
  const result = shortenReviewedPauses(input, candidates, new Set());
  assert.deepEqual(result.pcm, input); assert.equal(result.edits.length, 0);
});
test("quiet speech below broad detection threshold but above strict core threshold is retained", () => {
  const input = signal(120), candidates = detectInlinePauses(input, 1000, region(input.length / 2));
  assert.equal(candidates.length, 1); assert.equal(candidates[0].cut, null);
  assert.equal(shortenReviewedPauses(input, candidates, new Set([7])).edits.length, 0);
});
test("punctuated phrases remain review-only, without ASR/phoneme alignment assumptions", () => {
  const input = signal(), c = detectInlinePauses(input, 1000, region(input.length / 2, "先验证，再行动。"));
  assert.equal(c.length, 1); assert.equal(c[0].shortUnpunctuatedUnit, false); assert.equal(c[0].cut, null);
});
test("planned inter-sentence gaps and brief natural closures are protected", () => {
  const input = signal();
  assert.equal(detectInlinePauses(input, 1000, [{ id: 1, text: "前句。", startFrame: 0, endFrame: 300 },
    { id: 2, text: "后句。", startFrame: 480, endFrame: 780 }]).length, 0);
  const short = signal(0, 80); assert.equal(detectInlinePauses(short, 1000, region(short.length / 2)).length, 0);
});
test("WAV roundtrip is exact; unsupported/truncated audio and invalid regions fail", () => {
  const input = signal(); const wav = encodeMonoPcm16(input, 22050);
  assert.deepEqual(readMonoPcm16(wav), { pcm: input, sampleRate: 22050 });
  assert.throws(() => readMonoPcm16(wav.subarray(0, wav.length - 2)), /不完整/);
  const stereo = Buffer.from(wav); stereo.writeUInt16LE(2, 22); assert.throws(() => readMonoPcm16(stereo), /单声道/);
  assert.throws(() => detectInlinePauses(input, 1000, [{ id: 1, text: "甲", startFrame: 0, endFrame: 9999 }]));
});
