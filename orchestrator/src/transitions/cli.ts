import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { selectTransitions } from './select.ts';
const root = process.cwd(), out = resolve(root, 'orchestrator/output/day9-vp008');
const read = async (p: string) => JSON.parse(await readFile(resolve(root, p), 'utf8'));
const t = await read('orchestrator/output/day9-vp007/timeline.json'), catalog = await read('orchestrator/output/day9-vp008/transition-catalog.json'), cfg = await read('orchestrator/config/transition-selection.json');
const textures = new Set<string>();
for (const e of catalog.effects)
    for (const x of e.extraTextures) {
        try {
            await access(resolve(root, x.localPath));
            textures.add(x.localPath);
        }
        catch { }
    }
const result = selectTransitions(t, catalog.effects, cfg, textures);
(result.timeline as Record<string, unknown>).bgm = { ...t.bgm, selectedBoostDb: 3, audioReuse: 'orchestrator/output/day9-vp007/sample-bgm-plus3.mp4', strategy: 'Bitstream-copy exact accepted VP007 +3dB audio; no remix or loudness strategy change.' };
await mkdir(out, { recursive: true });
for (const [name, data] of Object.entries({ 'timeline.json': result.timeline, 'transition-selection-report.json': result.report, 'transition-selection-config.json': cfg }))
    await writeFile(resolve(out, name), JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify(result.report.distribution));
