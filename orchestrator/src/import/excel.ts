import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import readXlsxFile from "read-excel-file/node";

// New IP contract: deliberately independent of the DSE VideoScript model.
export interface ImportedShot {
  order: number;
  shotNumber: number;
  sourceRow: number;
  narration: string;
  visualDescription: string;
  overlayText: string | null;
  suggestedDuration: { raw: string | number; seconds: number };
  soundEffect: string | null;
  bgm: string | null;
  timeRange: string | null;
  cropGuidance: string | null;
  bgmGuidance: string | null;
  visualGuidance: string | null;
  rawCells: Record<string, string | number | boolean | null>;
  voiceover: { audioPath: string | null; durationSeconds: number | null };
  assetMatch: { assetPath: string | null; reason: string | null };
}

export interface ImportedScript {
  schemaVersion: "ip-script/1";
  source: {
    inputPath: string;
    absolutePath: string;
    sha256: string;
    importedAt: string;
    sheetName: string;
    headerRow: number;
    columns: Record<string, string | null>;
  };
  validation: { skippedEmptyRows: number[]; warnings: string[] };
  shots: ImportedShot[];
}

const aliases = {
  shotNumber: ["分镜号", "镜头编号", "分镜编号", "镜头号"],
  visualDescription: ["分镜画面"],
  narration: ["旁白（口播原文）", "旁白(口播原文)", "旁白"],
  overlayText: ["叠加文字规范"],
  suggestedDuration: ["建议时长"],
  soundEffect: ["音效"],
  bgm: ["BGM"],
  timeRange: ["起止时间"],
  cropGuidance: ["屏幕裁切建议"],
  bgmGuidance: ["统一-BGM规范", "统一BGM规范", "BGM规范"],
  visualGuidance: ["视觉CTA规范", "视觉规范"],
} as const;
type Field = keyof typeof aliases;
const required: Field[] = ["shotNumber", "visualDescription", "narration", "suggestedDuration"];
const normalizeHeader = (v: unknown) => typeof v === "string"
  ? v.replace(/\s/g, "").replace(/（/g, "(").replace(/）/g, ")") : "";
const isEmpty = (v: unknown) => v == null || (typeof v === "string" && !v.trim());

/** Numeric cells mean seconds; text accepts 2秒, 2.5s, 00:02.5 or 01:00:02. */
export function parseDuration(value: unknown): number {
  let seconds: number;
  if (typeof value === "number") seconds = value;
  else if (typeof value === "string") {
    const text = value.trim();
    const scalar = text.match(/^(\d+(?:\.\d+)?)\s*(?:秒|s|sec|seconds?)?$/i);
    const clock = text.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d(?:\.\d+)?)$/);
    if (scalar) seconds = Number(scalar[1]);
    else if (clock) seconds = Number(clock[1] ?? 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
    else throw new Error(`时长格式无效: ${JSON.stringify(value)}（支持正数秒、2秒、2.5s、mm:ss、hh:mm:ss）`);
  } else throw new Error(`时长类型无效: ${String(value)}（请填写秒数或文本时长）`);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("建议时长必须为大于 0 的有限秒数");
  return seconds;
}

function findHeaders(rows: unknown[][]): number[] {
  return rows.flatMap((row, i) => required.every((field) =>
    aliases[field].some((name) => row.some((v) => normalizeHeader(v) === normalizeHeader(name))),
  ) ? [i] : []);
}

/** Preserve worksheet order and raw text. Empty rows are skipped and reported, never forward-filled. */
export function parseShotRows(rows: unknown[][], sheetName: string) {
  const headerRows = findHeaders(rows);
  if (headerRows.length !== 1) throw new Error(
    `工作表「${sheetName}」需且只能有一行完整表头（分镜号、分镜画面、旁白（口播原文）、建议时长），找到 ${headerRows.length} 行`,
  );
  const headerIndex = headerRows[0];
  const headers = rows[headerIndex];
  const indices = {} as Record<Field, number>;
  const columns = {} as Record<Field, string | null>;
  for (const field of Object.keys(aliases) as Field[]) {
    const matches = headers.flatMap((v, i) => aliases[field].some((a) =>
      normalizeHeader(a) === normalizeHeader(v)) ? [i] : []);
    if (matches.length > 1) throw new Error(`工作表「${sheetName}」表头字段 ${field} 重复`);
    indices[field] = matches[0] ?? -1;
    columns[field] = matches.length ? String(headers[matches[0]]) : null;
  }
  const warnings: string[] = [];
  for (const field of Object.keys(aliases) as Field[]) {
    if (indices[field] < 0) warnings.push(`缺少可选列：${aliases[field][0]}`);
  }
  const skippedEmptyRows: number[] = [];
  const shots: ImportedShot[] = [];
  const seen = new Map<number, number>();
  const errors: string[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const sourceRow = i + 1;
    if (row.every(isEmpty)) { skippedEmptyRows.push(sourceRow); continue; }
    try {
      const get = (field: Field): unknown => row[indices[field]];
      const text = (field: Field, mandatory = false): string | null => {
        const value = get(field);
        if (isEmpty(value)) {
          if (mandatory) throw new Error(`缺失${aliases[field][0]}`);
          return null;
        }
        if (typeof value !== "string") throw new Error(`${aliases[field][0]}必须为文本`);
        return value; // Do not trim, normalize punctuation, or resolve “同上”.
      };
      const numberValue = get("shotNumber");
      if (isEmpty(numberValue) || !/^[1-9]\d*$/.test(String(numberValue).trim()))
        throw new Error("分镜号必须是正整数");
      const shotNumber = Number(numberValue);
      if (!Number.isSafeInteger(shotNumber)) throw new Error("分镜号超出安全整数范围");
      if (seen.has(shotNumber)) throw new Error(`重复镜头编号 ${shotNumber}（首次在第 ${seen.get(shotNumber)} 行）`);
      seen.set(shotNumber, sourceRow);
      const narration = text("narration", true)!;
      const visualDescription = text("visualDescription", true)!;
      const rawDuration = get("suggestedDuration");
      const seconds = parseDuration(rawDuration);
      const rawCells: ImportedShot["rawCells"] = {};
      for (let c = 0; c < row.length; c++) {
        if (isEmpty(headers[c]) && isEmpty(row[c])) continue;
        if (isEmpty(headers[c])) throw new Error(`第 ${c + 1} 列有内容但缺少列名`);
        const key = String(headers[c]);
        if (Object.hasOwn(rawCells, key)) throw new Error(`重复列名：${key}`);
        const value = row[c] ?? null;
        if (value !== null && !["string", "number", "boolean"].includes(typeof value))
          throw new Error(`列「${key}」包含不支持的日期等单元格类型，请改为文本`);
        Object.defineProperty(rawCells, key, { value, enumerable: true });
      }
      shots.push({
        order: shots.length + 1, shotNumber, sourceRow, narration, visualDescription,
        overlayText: text("overlayText"),
        suggestedDuration: { raw: rawDuration as string | number, seconds },
        soundEffect: text("soundEffect"), bgm: text("bgm"), timeRange: text("timeRange"),
        cropGuidance: text("cropGuidance"), bgmGuidance: text("bgmGuidance"), visualGuidance: text("visualGuidance"),
        rawCells,
        voiceover: { audioPath: null, durationSeconds: null },
        assetMatch: { assetPath: null, reason: null },
      });
    } catch (e) {
      errors.push(`工作表「${sheetName}」第 ${sourceRow} 行：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (errors.length) throw new Error(`分镜校验失败：\n${errors.join("\n")}`);
  if (!shots.length) throw new Error(`工作表「${sheetName}」没有有效分镜行`);
  return { headerRow: headerIndex + 1, columns, shots, validation: { skippedEmptyRows, warnings } };
}

export async function importExcel(inputPath: string, sheetName?: string): Promise<ImportedScript> {
  const absolutePath = resolve(inputPath);
  if (extname(absolutePath).toLowerCase() !== ".xlsx") throw new Error("仅支持 .xlsx 文件");
  let bytes: Buffer;
  try { bytes = await readFile(absolutePath); }
  catch (e) { throw new Error(`无法读取 Excel「${absolutePath}」：${e instanceof Error ? e.message : String(e)}`); }
  let sheets;
  try { sheets = await readXlsxFile(bytes, { trim: false }); }
  catch (e) { throw new Error(`无法解析 XLSX「${absolutePath}」：${e instanceof Error ? e.message : String(e)}`); }
  const candidates = sheetName ? sheets.filter((s) => s.sheet === sheetName)
    : sheets.filter((s) => findHeaders(s.data).length > 0);
  if (candidates.length !== 1) throw new Error(
    `无法唯一选择分镜工作表（匹配 ${candidates.length} 个）；可用工作表：${sheets.map((s) => s.sheet).join("、")}。请检查表头或使用 --sheet 指定`,
  );
  const sheet = candidates[0];
  const parsed = parseShotRows(sheet.data, sheet.sheet);
  return {
    schemaVersion: "ip-script/1",
    source: { inputPath, absolutePath, sha256: createHash("sha256").update(bytes).digest("hex"),
      importedAt: new Date().toISOString(), sheetName: sheet.sheet,
      headerRow: parsed.headerRow, columns: parsed.columns },
    validation: parsed.validation, shots: parsed.shots,
  };
}
