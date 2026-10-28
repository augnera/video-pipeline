import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import type { ImportedScript } from "../import/excel.js";
import { planRhythm } from "./rhythm-plan.js";

try {
  const { values } = parseArgs({ options: {
    script: { type: "string" }, out: { type: "string" }, from: { type: "string" }, to: { type: "string" },
  } });
  if (!values.script || !values.out) throw new Error("用法: --script <标准化 JSON> --out <停顿计划 JSON> [--from <分镜编号> --to <分镜编号>]");
  const inputPath = resolve(values.script), outputPath = resolve(values.out);
  if (inputPath === outputPath) throw new Error("不能覆盖原始脚本");
  const input = await readFile(inputPath);
  const script = JSON.parse(input.toString()) as ImportedScript;
  if (!Array.isArray(script.shots)) throw new Error("脚本缺少 shots");
  const index = (value: string | undefined, fallback: number) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new Error("分镜编号必须是非负整数");
    const found = script.shots.findIndex(p => p.shotNumber === Number(value));
    if (found < 0) throw new Error(`找不到分镜: ${value}`);
    return found;
  };
  const first = index(values.from, 0), last = index(values.to, script.shots.length - 1);
  if (first > last) throw new Error("分镜范围顺序无效");
  const selected = script.shots.slice(first, last + 1);
  const plan = { ...planRhythm(selected), source: { inputPath,
    scriptSha256: createHash("sha256").update(input).digest("hex"),
    shotNumbers: selected.map(p => p.shotNumber), sourceRows: selected.map(p => p.sourceRow) } };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(plan, null, 2) + "\n", { flag: "wx" });
  console.log(`已生成 ${plan.segments.length} 个口播段的通用停顿计划: ${outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
}
