import readXlsxFile from 'read-excel-file/node';
import { readFile } from 'node:fs/promises';
import { parseShotRows } from '../import/excel.ts';
import { planRhythm } from '../voice/rhythm-plan.ts';
import { sha } from './core.ts';
export function separateRows(rows: any[][], cfg: any) {
    const h = cfg.headerRow - 1;
    if (h < 0 || h >= rows.length)
        throw Error('Invalid headerRow');
    const headers = rows[h].slice(0, cfg.maxColumns);
    const col = headers.findIndex((x: any) => /^(分镜号|镜头编号|分镜编号|镜头号)$/.test(String(x ?? '').trim()));
    if (col < 0)
        throw Error('Missing shot-number column');
    const narrationColumn = headers.findIndex((x: any) => /^旁白(?:[（(]口播原文[）)])?$/.test(String(x ?? '').replace(/\s/g, '')));
    let end = cfg.endRow ?? rows.length;
    if (!cfg.endRow) {
        let last = h + 1;
        for (let i = h + 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.every(v => v == null || (typeof v === 'string' && !v.trim())))
                continue;
            if (!/^[1-9]\d*$/.test(String(row[col] ?? '').trim())) {
                if (narrationColumn >= 0 && row[narrationColumn] != null && String(row[narrationColumn]).trim() && !(cfg.metadataLabelPattern && new RegExp(cfg.metadataLabelPattern).test(String(row[col] ?? '').trim())))
                    throw Error('Ambiguous non-numbered row with narration; require explicit shot boundary');
                end = last;
                break;
            }
            last = i + 1;
            end = last;
        }
    }
    if (!Number.isInteger(end) || end <= h + 1 || end > rows.length)
        throw Error('Invalid shot boundary');
    if (rows.slice(end).some(r => /^[1-9]\d*$/.test(String(r[col] ?? '').trim())))
        throw Error('Numeric shot row after metadata boundary; set explicit valid contract, do not drop narration');
    return { body: rows.slice(h, end).map(r => r.slice(0, cfg.maxColumns)), end, metadata: rows.slice(end).map((r, i) => ({ rowNumber: end + i + 1, values: r })).filter(r => r.values.some(v => v != null && v !== '')) };
}
export async function importProduction(path: string, cfg: any, episodeId: string, profile: any) { const bytes = await readFile(path), sheets = await readXlsxFile(bytes, { trim: false }); const sheet = sheets.find(s => s.sheet === cfg.sheet); if (!sheet)
    throw Error('Missing worksheet ' + cfg.sheet); const split = separateRows(sheet.data, cfg), p = parseShotRows(split.body, cfg.sheet); if (p.shots.some((s, i) => i && s.shotNumber <= p.shots[i - 1].shotNumber))
    throw Error('Shot order must be increasing'); for (const s of p.shots)
    s.sourceRow += cfg.headerRow - 1; const rhythm = planRhythm(p.shots, profile); return { script: { schemaVersion: 'ip-script/1', episodeId, source: { absolutePath: path, sha256: sha(bytes), sheetName: cfg.sheet, range: `A${cfg.headerRow}:K${split.end}` }, ...p, metadata: split.metadata, narrationSha256: rhythm.textSha256 }, rhythm }; }
