import {isGlRenderFailure} from './render-errors.ts';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runProcess } from '../visual-mvp/process.ts';
import { downgrade } from './select.ts';
const opt=(key:string,fallback:string)=>process.argv.find(x=>x.startsWith('--'+key+'='))?.split('=').slice(1).join('=')??fallback;
const root = process.cwd(), out = resolve(root, opt('out','orchestrator/output/day9-vp008')), project = resolve(root, 'experiments/gl-transitions-vp008');
const read = async (n: string) => JSON.parse(await readFile(resolve(out, n), 'utf8'));
const save = (n: string, v: unknown) => writeFile(resolve(out, n), JSON.stringify(v, null, 2) + '\n');
const logs: any[] = [];
let success = false;
for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try{await mkdir(out+'/render-errors',{recursive:true});await rename(out+'/day9-render-error.json',out+'/render-errors/previous-'+started+'.json');}catch(e:any){if(e.code!=='ENOENT')throw e;}
    try {
        await runProcess(process.execPath, ['--require', '../day9-remotion/scripts/loopback.cjs', 'scripts/render-day9.mjs','--out='+out,'--entry='+opt('entry','src/day9.tsx')], { cwd: project, log: resolve(out, `render-attempt-${attempt}.log`) });
        success = true;
        logs.push({ attempt, status: 'EXPORTED', elapsedSeconds: (Date.now() - started) / 1000 });
        break;
    }
    catch (e) {
        const t = await read('timeline.json');
        const error = String(e);
        logs.push({ attempt, status: 'FAILED', error });
        if (attempt === 2) {
            await save('render-fallback-log.json', { success: false, attempts: logs });
            throw e;
        }
        const detail = await read('day9-render-error.json').catch(() => ({ error }));
        if (!isGlRenderFailure(detail.error)) {
            await save('render-fallback-log.json', { success: false, attempts: logs, reason: 'Non-GL failure; hard-cut downgrade would not address this cause.' });
            throw e;
        }
        const named = t.transitions.filter((x: any) => x.engine === 'gl-transitions' && detail.error.includes(x.transitionId.slice(4)));
        const affected = (named.length ? named : t.transitions.filter((x: any) => x.engine === 'gl-transitions')).map((x: any) => x.boundaryFrame);
        if (!affected.length) {
            await save('render-fallback-log.json', { success: false, attempts: logs, reason: 'No GL cut to downgrade; stop rather than retry unrelated failure' });
            throw e;
        }
        const repair = downgrade(t, affected, detail.error);
        await save('timeline-before-render-downgrade.json', t);
        await save('timeline.json', repair.timeline);
        const brief=await read('visual-brief.json');brief.originalTransitionPlan??=brief.transitionPlan;brief.transitionPlan=repair.timeline.transitions;brief.renderDowngrades=repair.logs;await save('visual-brief.json',brief);
        logs.push({ boundedRepair: repair.logs });
        const report = await read('transition-selection-report.json');
        report.renderDowngrades = repair.logs;
        report.finalDistribution = (repair.timeline.transitions as any[]).reduce((a, x) => (a[x.transitionId] = (a[x.transitionId] ?? 0) + 1, a), {});
        await save('transition-selection-report.json', report);
    }
}
await save('render-fallback-log.json', { success, maximumAttempts: 2, attempts: logs, policy: 'One hard-cut downgrade attempt only. No asset, narration, caption or timeline changes.' });
