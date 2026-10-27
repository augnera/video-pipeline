import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { importExcel } from "./excel.js";
import { createLogger } from "../logger.js";

const log = createLogger();
try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: "string" }, sheet: { type: "string" } },
  });
  if (positionals.length !== 1 || !values.out) throw new Error(
    "用法: npm run import:ip -- <脚本.xlsx> --out <script.normalized.json> [--sheet <工作表名>]",
  );
  const output = resolve(values.out);
  if (output === resolve(positionals[0])) throw new Error("输出路径不能与原始 Excel 相同");
  const result = await log.step("个人 IP Excel 导入", () => importExcel(positionals[0], values.sheet));
  await mkdir(dirname(output), { recursive: true });
  // Exclusive creation also protects the source via symlinks and existing imports.
  await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  for (const warning of result.validation.warnings) log.info(`警告：${warning}`);
  log.info(`导入 ${result.shots.length} 个分镜，跳过 ${result.validation.skippedEmptyRows.length} 个空行；JSON：${output}`);
} catch (e) {
  log.error(`个人 IP 导入失败：${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
