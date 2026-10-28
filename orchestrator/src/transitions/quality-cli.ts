import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runQualityGate } from '../visual-mvp/quality-run.ts';
import { runProcess } from '../visual-mvp/process.ts';
import { transitionGate } from './gate.ts';
const root = process.cwd(), out = resolve(root, 'orchestrator/output/day9-vp008');
const read = async (p: string) => JSON.parse(await readFile(resolve(root, p), 'utf8'));
const report = await runQualityGate(out, { allowRepair: false, probe: { sourcePaths: ['experiments/gl-transitions-vp008/src/day9.tsx', 'experiments/day9-remotion/src/Vp007Root.tsx', 'experiments/day9-remotion/src/Vp006R1Root.tsx', 'experiments/day9-remotion/src/PocShared.tsx', 'experiments/gl-transitions-vp008/scripts/render-day9.mjs'], run: async (p, fingerprint) => {
            await runProcess(process.execPath, ['--require', '../day9-remotion/scripts/loopback.cjs', 'scripts/render-day9.mjs', '--probes-only'], { cwd: resolve(root, 'experiments/gl-transitions-vp008'), log: resolve(out, 'quality-probes.log') });
            await writeFile(resolve(p, 'quality-evidence/probe-run.json'), JSON.stringify({ fingerprint, frames: (await read('orchestrator/output/day9-vp008/timeline.json')).transitions.map((x: any) => x.boundaryFrame), control: 'Same source clocks and captions; GL backgrounds disabled only' }, null, 2));
        } } });
const t = await read('orchestrator/output/day9-vp008/timeline.json'), catalog = await read('orchestrator/output/day9-vp008/transition-catalog.json'), config = await read('orchestrator/config/transition-selection.json'), source = await read('orchestrator/output/day9-vp007/timeline.json');
const textures = new Set<string>();
for (const e of catalog.effects)
    for (const x of e.extraTextures) {
        try {
            await access(resolve(root, x.localPath));
            textures.add(x.localPath);
        }
        catch { }
    }
;
const gl = transitionGate(t, catalog.effects, config, textures, source);
report.checks.push(gl as any);
report.automaticSummary[gl.automatic.result as 'PASS' | 'FAIL']++;
report.resultSummary.NOT_EVALUATED++;
report.overallResult = report.automaticSummary.FAIL ? 'FAIL' : report.overallResult;
await writeFile(out + '/quality-report.json', JSON.stringify({ ...report, glExtension: 'visual-transition/0.2', publicationReady: false }, null, 2) + '\n');
console.log('GL extension: ' + gl.automatic.result);
for (const name of ['validation.json', 'run.json']) {
    const v = await read('orchestrator/output/day9-vp008/' + name);
    v.qualityGate = { overallResult: report.overallResult, automaticSummary: report.automaticSummary, notEvaluatedIsNotPass: true, report: 'quality-report.json' };
    await writeFile(out + '/' + name, JSON.stringify(v, null, 2) + '\n');
}
