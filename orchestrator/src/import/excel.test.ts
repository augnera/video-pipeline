import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { importExcel, parseDuration, parseShotRows } from "./excel.js";

const realFile = fileURLToPath(new URL("../../../docs/day9一人公司3个必须提前做的正确选择.xlsx", import.meta.url));
const cli = fileURLToPath(new URL("./ip-cli.ts", import.meta.url));
const header = ["分镜号", "分镜画面", "旁白（口播原文）", "叠加文字规范", "建议时长"];
// Unit fixtures validate edge cases only; real-file acceptance is separate below.
const row = [1, "文字卡", "  保留原文\n与标点。  ", "大字：原文", "2秒"];

test("column mapping is independent of order; raw narration whitespace is preserved", () => {
  const data = [header, row].map((r) => [...r].reverse());
  const { shots } = parseShotRows(data, "列重排");
  assert.equal(shots[0].narration, row[2]);
  assert.equal(shots[0].visualDescription, row[1]);
  assert.equal(shots[0].overlayText, row[3]);
  assert.equal(shots[0].suggestedDuration.seconds, 2);
});

test("empty rows are reported; source row and worksheet order remain intact", () => {
  const parsed = parseShotRows([[], ["标题"], header, [], [9, ...row.slice(1)], [2, ...row.slice(1)]], "空行");
  assert.equal(parsed.headerRow, 3);
  assert.deepEqual(parsed.validation.skippedEmptyRows, [4]);
  assert.deepEqual(parsed.shots.map((s) => [s.order, s.shotNumber, s.sourceRow]), [[1, 9, 5], [2, 2, 6]]);
});

test("missing/whitespace narration fails with worksheet and row", () => {
  for (const value of [null, "", "  \n "]) {
    assert.throws(() => parseShotRows([header, [1, "画面", value, "字", "2秒"]], "缺旁白"),
      /工作表「缺旁白」第 2 行：缺失旁白/);
  }
});

test("duplicate and invalid shot numbers fail", () => {
  assert.throws(() => parseShotRows([header, row, [...row]], "重复"), /第 3 行：重复镜头编号 1/);
  for (const number of [null, 0, -1, 1.5, "镜头一"]) {
    assert.throws(() => parseShotRows([header, [number, ...row.slice(1)]], "编号"), /分镜号必须是正整数/);
  }
});

test("supported and invalid duration formats", () => {
  for (const [input, expected] of [[2, 2], ["2秒", 2], ["2.5s", 2.5], ["00:02.5", 2.5], ["01:00:02", 3602]] as const)
    assert.equal(parseDuration(input), expected);
  for (const input of [null, "", 0, -1, Infinity, "2-4秒", "约2秒", "00:70", "2秒垃圾", new Date()])
    assert.throws(() => parseDuration(input), /时长/);
  assert.throws(() => parseShotRows([header, [...row.slice(0, 4), "两秒"]], "非法时长"), /第 2 行：时长格式无效/);
});

test("missing/duplicate headers, blank data and unexpected cell types fail", () => {
  assert.throws(() => parseShotRows([["分镜画面"]], "缺列"), /完整表头/);
  assert.throws(() => parseShotRows([[...header, "旁白"], [...row, "冲突"]], "重复列"), /表头字段 narration 重复/);
  assert.throws(() => parseShotRows([header, []], "空数据"), /没有有效分镜/);
  assert.throws(() => parseShotRows([header, [1, "画面", 123, "字", 2]], "类型"), /旁白.*必须为文本/);
});

test("optional columns are reported, future fields stay null", () => {
  const result = parseShotRows([header, row], "可选字段");
  assert.ok(result.validation.warnings.some((v) => v.includes("音效")));
  assert.equal(result.shots[0].soundEffect, null);
  assert.deepEqual(result.shots[0].voiceover, { audioPath: null, durationSeconds: null });
  assert.deepEqual(result.shots[0].assetMatch, { assetPath: null, reason: null });
});

test("real Day9 XLSX imports ten shots, preserves provenance and actual optional columns", async () => {
  const bytes = await readFile(realFile);
  const result = await importExcel(realFile);
  assert.equal(result.shots.length, 10);
  assert.equal(result.source.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(result.source.absolutePath, resolve(realFile));
  assert.ok(Number.isFinite(Date.parse(result.source.importedAt)));
  assert.equal(result.source.headerRow, 1);
  assert.equal(result.source.sheetName, "Sheet");
  assert.deepEqual(result.validation, { skippedEmptyRows: [], warnings: [] });
  assert.deepEqual(result.shots.map((s) => s.shotNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(result.shots.reduce((n, s) => n + s.suggestedDuration.seconds, 0), 32);
  assert.equal(result.shots[0].bgmGuidance, "100-110 BPM / -15dB");
  assert.equal(result.shots[1].bgmGuidance, "同上");
  assert.equal(result.shots[9].visualGuidance, "关注我");
  for (const shot of result.shots) {
    assert.equal(shot.narration, shot.rawCells["旁白（口播原文）"]);
    assert.equal(shot.visualDescription, shot.rawCells["分镜画面"]);
    assert.equal(shot.overlayText, shot.rawCells["叠加文字规范"]);
  }
});

test("explicit sheet selection and missing sheet", async () => {
  assert.equal((await importExcel(realFile, "Sheet")).shots.length, 10);
  await assert.rejects(importExcel(realFile, "不存在"), /匹配 0 个.*可用工作表/);
});

test("CLI success, invalid arguments/files, no partial output, no overwrite", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vp-import-"));
  const run = (...args: string[]) => spawnSync(process.execPath, ["--import", "tsx", cli, ...args], { encoding: "utf8" });
  try {
    const out = join(dir, "script.json");
    assert.equal(run(realFile, "--out", out).status, 0);
    const original = await readFile(out, "utf8");
    assert.equal(JSON.parse(original).shots.length, 10);
    const again = run(realFile, "--out", out);
    assert.equal(again.status, 1);
    assert.match(again.stderr, /EEXIST/);
    assert.equal(await readFile(out, "utf8"), original);
    assert.equal(run().status, 1);
    assert.equal(run(realFile, "--unknown").status, 1);
    assert.equal(run(realFile, "--out", realFile).status, 1);
    const missing = run(join(dir, "missing.xlsx"), "--out", join(dir, "missing.json"));
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /无法读取 Excel/);
    const badFile = join(dir, "corrupt.xlsx");
    await writeFile(badFile, "This is not an XLSX archive");
    const invalid = run(badFile, "--out", join(dir, "invalid.json"));
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /无法解析 XLSX/);
    await assert.rejects(readFile(join(dir, "invalid.json")), /ENOENT/);
    await assert.rejects(importExcel(join(dir, "file.csv")), /仅支持 .xlsx/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
