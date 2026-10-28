import type { Effect, Timeline, Scene, SelectionConfig, CutSelection } from './types.ts';
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function typed(type: string, v: unknown) { if (type === 'bool')
    return typeof v === 'boolean'; if (type === 'float' || type === 'int')
    return typeof v === 'number' && Number.isFinite(v) && (type !== 'int' || Number.isInteger(v)); const n = /^(?:i?vec)([234])$/.exec(type); return !!n && Array.isArray(v) && v.length === Number(n[1]) && v.every(x => typeof x === 'number' && Number.isFinite(x) && (!type.startsWith('i') || Number.isInteger(x))); }
export function validParams(effect: Effect, params: Record<string, unknown>): boolean {
    return Object.keys(params).length === Object.keys(effect.parameters).length && Object.entries(effect.parameters).every(([k, p]) => typed(p.type, params[k]) && p.verifiedSafeValues.some(v => equal(v, params[k])));
}
/** Only metadata actually supplied by upstream roles is consumed. No shot-number rotation. */
export function relationOf(a: Scene, b: Scene) {
    if (b.transitionRelation)
        return { relation: b.transitionRelation, evidence: 'Explicit incoming transitionRelation metadata' };
    const words = (b.visualReason ?? '').toLowerCase();
    if (/conclusion|advice|clear advice/.test(words))
        return { relation: 'conclusion', evidence: 'Existing visualReason explicitly describes advice/conclusion' };
    if (/detail/.test(words))
        return { relation: 'detail', evidence: 'Existing visualReason explicitly describes detail' };
    if (a.kind !== b.kind)
        return { relation: 'visual_type_change', evidence: `Supplied kind changes ${a.kind} → ${b.kind}` };
    if (a.goal && a.goal === b.goal)
        return { relation: 'continuation', evidence: 'Supplied visual goal remains identical' };
    if (a.goal && b.goal)
        return { relation: 'progression', evidence: `Supplied goal changes ${a.goal} → ${b.goal}; semantic polarity not inferred` };
    return { relation: 'unknown', evidence: 'Missing semantic metadata; conservative short dissolve or hard cut' };
}
export function selectTransitions(t: Timeline, catalog: Effect[], cfg: SelectionConfig, availableTextures: Set<string>) {
    const selections: CutSelection[] = [], cuts: any[] = [], counts: Record<string, number> = {};
    let lastStrong = -Infinity, lastAnimated = -Infinity, strongCount = 0, animatedCount = 0;
    const cutCount = t.scenes.length - 1, maxStrong = Math.floor(cutCount * cfg.maxStrongFraction), maxAnimated = Math.floor(cutCount * cfg.maxAnimatedCutFraction);
    for (let i = 1; i < t.scenes.length; i++) {
        const a = t.scenes[i - 1], b = t.scenes[i], boundary = b.from, { relation, evidence } = relationOf(a, b);
        const reading = !!(a.requiresClearReading || b.requiresClearReading || cfg.readableKinds.includes(a.kind) || cfg.readableKinds.includes(b.kind));
        const hold = Math.min(cfg.maxExtraEdgeHoldFrames, Math.floor((a.to - a.from) / 4), Math.floor((b.to - b.from) / 4));
        const duration = b.transitionDurationFrames??cfg.durationFrames, half = Math.floor(duration / 2);
        const audit = catalog.map(effect => {
            const excluded: string[] = [];
            const params = Object.fromEntries(Object.entries(effect.parameters).map(([k, v]) => [k, v.default]));
            if (effect.technicalStatus !== 'VERIFIED')
                excluded.push('technical_status_' + effect.technicalStatus);
            if (effect.humanEvaluation === 'REJECTED')
                excluded.push('human_rejected');
            if (!cfg.exploration && effect.humanEvaluation === 'NOT_EVALUATED')
                excluded.push('human_review_required_for_formal_use');
            if (!validParams(effect, params))
                excluded.push('unverified_parameters');
            if (!effect.validatedDurationFrames.includes(duration))
                excluded.push('unverified_duration');
            if (effect.extraTextures.some(x => !availableTextures.has(x.localPath)))
                excluded.push('missing_texture');
            if (half > hold || duration - half > hold || boundary - half < 0 || boundary + duration - half > t.durationInFrames)
                excluded.push('insufficient_bounded_edge_margin');
            if(b.transitionPolicy==='hard_cut')excluded.push('narrative_prefers_hard_cut');
            if (reading)
                excluded.push('important_readable_content_hard_cut_preferred');
            if ((boundary-lastAnimated)/t.fps < (cfg.minAnimatedGapSeconds??0)) excluded.push('animated_spacing_limit');
            if (animatedCount >= maxAnimated)
                excluded.push('animated_frequency_limit');
            if ((counts[effect.transitionId] ?? 0) >= cfg.maxSameEffectPerFilm)
                excluded.push('per_film_repeat_limit');
            const recent = selections.slice(-cfg.maxConsecutiveSame);
            if (recent.length === cfg.maxConsecutiveSame && recent.every(x => x.transitionId === effect.transitionId))
                excluded.push('consecutive_repeat_limit');
            if (effect.visualIntensity === 'strong' && (strongCount >= maxStrong || (boundary - lastStrong) / t.fps < cfg.minStrongGapSeconds))
                excluded.push('strong_budget_or_interval');
            const categories = cfg.relations[relation] ?? cfg.relations.unknown, rank = categories.indexOf(effect.category);
            if (rank < 0)
                excluded.push('relation_category_mismatch');
            let score = rank < 0 ? -100 : 30 - rank * 6;
            if (effect.semanticUse.includes(relation))
                score += 5;
            if (effect.humanEvaluation === 'RECOMMENDED')
                score += 10;
            else if (effect.humanEvaluation === 'ALLOWED')
                score += 5;
            if (effect.visualIntensity === 'low')
                score += 3;
            score -= (counts[effect.transitionId] ?? 0) * cfg.recentPenalty;
            score -= Math.min(4, (effect.renderCostSeconds ?? 0) * .02);
            // Prefer clear canonical low-cost examples within equally fitting categories, not a cut-index rotation.
            if (['Fade', 'DirectionalWipe', 'SimpleZoom', 'CircleIris'].includes(effect.upstreamName))
                score += 2;
            return { transitionId: effect.transitionId, excluded, score, params };
        });
        const candidates = audit.filter(x => !x.excluded.length).sort((x, y) => y.score - x.score || x.transitionId.localeCompare(y.transitionId, 'en'));
        const winner = candidates[0], effect = winner && catalog.find(x => x.transitionId === winner.transitionId), id = effect?.transitionId ?? 'hard_cut', d = effect ? duration : 0;
        const reason = effect ? `${relation}: ${evidence}; category=${effect.category}, score=${winner.score}; exact verified defaults; composition/focus/movement unknown unless supplied.` : `Hard cut: ${reading ? 'protect readable content' : 'no compatible verified candidate within margins and constraints'}; ${evidence}`;
        const choice: CutSelection = { fromShotId: a.id, toShotId: b.id, toRequestId: b.requestId, type: effect ? 'gl_transition' : 'hard_cut', engine: effect ? 'gl-transitions' : 'none', transitionId: id, boundaryFrame: boundary, startFrame: boundary - Math.floor(d / 2), durationFrames: d, params: winner?.params ?? {}, selectionMode: 'rules', selectionReason: reason, reason, fallbackId: 'hard_cut', isTrial: effect?.humanEvaluation === 'NOT_EVALUATED', relation, texturePaths: Object.fromEntries((effect?.extraTextures ?? []).map(x => [x.name, x.localPath])), edgeHolds: { previousFrames: d ? d - Math.floor(d / 2) : 0, nextFrames: Math.floor(d / 2) }, maxBlurPx: 0, widthPx: t.width };
        selections.push(choice);
        counts[id] = (counts[id] ?? 0) + 1;
        if (effect) {
            animatedCount++;
            lastAnimated=boundary;
            if (effect.visualIntensity === 'strong') {
                lastStrong = boundary;
                strongCount++;
            }
        }
        cuts.push({ fromShotId: a.id, toShotId: b.id, boundaryFrame: boundary, relation, evidence, unknownInformation: ['Subject identity continuity', 'Focal coordinates', 'Camera motion direction', 'Speech rate beyond scene duration'], reading, edgeMarginPolicy: 'At most ' + hold + ' frames per side; scene source frame clamps only outside original interval', candidates: audit, selected: id, selectionReason: reason, isTrial: choice.isTrial });
    }
    return { timeline: { ...structuredClone(t), transitionContractVersion: 'visual-transition/0.2', transitions: selections }, report: { mode: 'rules', modelUsed: null, config: cfg, cuts, distribution: counts, constraints: { strongCount, maxStrong, animatedCount, maxAnimated, reproducible: true }, humanEvaluation: 'NOT_EVALUATED', fallbacks: selections.filter(x => x.transitionId === 'hard_cut').map(x => ({ boundaryFrame: x.boundaryFrame, reason: x.reason })) } };
}
/** One bounded render retry is a hard-cut downgrade; no semantic/content replacement. */
export function downgrade(t: Timeline, boundaries: number[], reason: string) {
    const timeline = structuredClone(t), logs: any[] = [];
    timeline.transitions = (timeline.transitions as CutSelection[]).map(x => { if (!boundaries.includes(x.boundaryFrame) || x.transitionId === 'hard_cut')
        return x; logs.push({ boundaryFrame: x.boundaryFrame, from: x.transitionId, to: 'hard_cut', attempt: 1, reason }); return { ...x, type: 'hard_cut', engine: 'none', transitionId: 'hard_cut', durationFrames: 0, startFrame: x.boundaryFrame, params: {}, isTrial: false, selectionReason: 'Bounded downgrade: ' + reason }; });
    return { timeline, logs };
}
