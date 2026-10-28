import { validParams, selectTransitions } from './select.ts';
import type { Effect, Timeline, SelectionConfig, CutSelection } from './types.ts';
export function transitionGate(t: Timeline, catalog: Effect[], config: SelectionConfig, textures: Set<string>, source: Timeline) {
    const errors: string[] = [], effects = new Map(catalog.map(e => [e.transitionId, e]));
    if (effects.size !== catalog.length)
        errors.push('Duplicate internal ID');
    const cuts = t.transitions as CutSelection[];
    let strong = 0, lastStrong = -Infinity, lastAnimated = -Infinity;
    const uses: Record<string, number> = {};
    for (let i = 0; i < cuts.length; i++) {
        const c = cuts[i];
        if (c.transitionId === 'hard_cut') {
            if (c.durationFrames !== 0)
                errors.push('Hard cut consumes frames');
            continue;
        }
        if((c.boundaryFrame-lastAnimated)/t.fps<(config.minAnimatedGapSeconds??0))errors.push('Animated spacing constraint');lastAnimated=c.boundaryFrame;
        const e = effects.get(c.transitionId);
        if (!e || e.technicalStatus !== 'VERIFIED' || e.humanEvaluation === 'REJECTED') {
            errors.push('Illegal/unverified effect ' + c.transitionId);
            continue;
        }
        if (!validParams(e, c.params) || !e.validatedDurationFrames.includes(c.durationFrames))
            errors.push('Unverified parameters/duration ' + c.transitionId);
        if (e.extraTextures.some(x => !textures.has(x.localPath)))
            errors.push('Missing texture');
        if (c.fromShotId !== t.scenes[i]?.id || c.toShotId !== t.scenes[i + 1]?.id || c.boundaryFrame !== t.scenes[i + 1]?.from)
            errors.push('Cut reference mismatch');
        if (c.startFrame < 0 || c.startFrame + c.durationFrames > t.durationInFrames || c.startFrame + c.durationFrames > (cuts[i + 1]?.startFrame ?? t.durationInFrames))
            errors.push('Unsafe transition interval');
        if (c.edgeHolds.previousFrames > config.maxExtraEdgeHoldFrames || c.edgeHolds.nextFrames > config.maxExtraEdgeHoldFrames)
            errors.push('Excess edge freeze');
        uses[c.transitionId] = (uses[c.transitionId] ?? 0) + 1;
        if (uses[c.transitionId] > config.maxSameEffectPerFilm)
            errors.push('Frequency constraint');
        const prior = cuts.slice(Math.max(0, i - config.maxConsecutiveSame), i);
        if (prior.length === config.maxConsecutiveSame && prior.every(x => x.transitionId === c.transitionId))
            errors.push('Consecutive repetition');
        if (e.visualIntensity === 'strong') {
            strong++;
            if ((c.boundaryFrame - lastStrong) / t.fps < config.minStrongGapSeconds)
                errors.push('Strong interval');
            lastStrong = c.boundaryFrame;
        }
    }
    if (strong > Math.floor(cuts.length * config.maxStrongFraction))
        errors.push('Strong budget');
    const identity = (x: Timeline) => JSON.stringify({ scenes: x.scenes, captions: x.captions, durationInFrames: x.durationInFrames, globalStartSeconds: x.globalStartSeconds, globalEndSeconds: x.globalEndSeconds, fps: x.fps });
    if (identity(t) !== identity(source))
        errors.push('Authoritative picture/audio/caption timeline modified');
    const a = selectTransitions(source, catalog, config, textures), b = selectTransitions(source, catalog, config, textures);
    if (JSON.stringify(a) !== JSON.stringify(b))
        errors.push('Non-deterministic selection');
    return { ruleId: 'VQ-03-GL', automatic: { result: errors.length ? 'FAIL' : 'PASS', evidence: { errors, cutCount: cuts.length, distribution: uses, strongCount: strong, catalogCount: catalog.length, sourceClocksPreserved: identity(t) === identity(source) } }, human: { result: 'NOT_EVALUATED', questions: ['正常速度下是否自然、不过度？', '试用效果是否应允许进入正式编排？'] }, result: errors.length ? 'FAIL' : 'NOT_EVALUATED' };
}
