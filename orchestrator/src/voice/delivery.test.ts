import { test } from "node:test";
import assert from "node:assert/strict";
import { stitchVoicePcm, readConsistentVoiceClips } from "./delivery.js";
import { encodeMonoPcm16 } from "./inline-pause.js";
const signal = (before: number, after: number) => {
  const b = Buffer.alloc((before + 200 + after) * 2);
  for (let i = before; i < before + 200; i++) b.writeInt16LE(5000, i * 2);
  return b;
};
test("existing accepted inter-shot pause is not padded twice; PCM remains exact", () => {
  const a = signal(0, 300), b = signal(300, 0), result = stitchVoicePcm([a, b], 1000, 600, -40);
  assert.deepEqual(result.pcm, Buffer.concat([a, b]));
  assert.equal(result.timeline[1].insertedGapBeforeFrames, 0);
});
test("missing pause is added outside clips and timeline accounts for every sample", () => {
  const a = signal(0, 100), b = signal(100, 0), result = stitchVoicePcm([a, b], 1000, 600, -40);
  assert.equal(result.timeline[1].insertedGapBeforeFrames, 400);
  assert.equal(result.timeline[1].startFrame, a.length / 2 + 400);
  assert.equal(result.durationFrames, result.pcm.length / 2);
  assert.deepEqual(result.pcm.subarray(0, a.length), a);
  assert.deepEqual(result.pcm.subarray(result.timeline[1].startFrame * 2), b);
});
test("sample-rate mismatches and malformed inputs fail rather than silently speeding or resampling", () => {
  assert.throws(() => readConsistentVoiceClips([encodeMonoPcm16(signal(0, 0), 22050), encodeMonoPcm16(signal(0, 0), 32000)]));
  assert.throws(() => stitchVoicePcm([], 22050, 600, -40));
  assert.throws(() => stitchVoicePcm([signal(0, 0)], 0, 600, -40));
});
