import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectTransitions, validParams, downgrade, relationOf } from './select.ts';
import type { Effect, Timeline, SelectionConfig } from './types.ts';
const config = JSON.parse(readFileSync(new URL('../../config/transition-selection.json', import.meta.url), 'utf8')) as SelectionConfig;
const effect = (name: string, category = 'wipe', extra: Partial<Effect> = {}): Effect => ({ transitionId: 'glt:' + name, upstreamName: name, technicalStatus: 'VERIFIED', humanEvaluation: 'NOT_EVALUATED', category, visualIntensity: 'low', parameters: {}, validatedDurationFrames: [18], extraTextures: [], semanticUse: ['progression', 'visual_type_change'], fallbackId: 'hard_cut', ...extra });
const timeline = (n = 4): Timeline => ({ fps: 30, width: 1080, durationInFrames: 90 * n, scenes: Array.from({ length: n }, (_, i) => ({ id: 's' + i, requestId: 'r' + i, from: 90 * i, to: 90 * (i + 1), kind: i % 2 ? 'diagram' : 'live_action', goal: 'goal' + i })), transitions: [] });
const select = (t: Timeline = timeline(), effects = [effect('DirectionalWipe'), effect('Other')], cfg = config) => selectTransitions(t, effects, cfg, new Set());
test('Repeatable selection uses metadata, not shotNumber or scene ID rotation', () => { const a = select(), b = select(); assert.deepEqual(a, b); const renamed = timeline(); for (const s of renamed.scenes) {
    s.shotNumber = 999;
    s.id = 'renamed' + s.from;
} assert.deepEqual(select(renamed).timeline.transitions.map((x: any) => x.transitionId), a.timeline.transitions.map((x: any) => x.transitionId)); assert.equal(relationOf(timeline().scenes[0], timeline().scenes[1]).relation, 'visual_type_change'); });
test('Unverified, failed, blocked, rejected and missing textures cannot be chosen', () => { for (const e of [effect('a', 'wipe', { technicalStatus: 'REGISTERED' }), effect('a', 'wipe', { technicalStatus: 'FAILED' }), effect('a', 'wipe', { technicalStatus: 'BLOCKED' }), effect('a', 'wipe', { humanEvaluation: 'REJECTED' }), effect('a', 'wipe', { extraTextures: [{ name: 'luma', localPath: 'missing' }] })])
    assert.ok(select(timeline(), [e]).timeline.transitions.every((x: any) => x.transitionId === 'hard_cut')); });
test('Parameter types and exact verified defaults are enforced', () => { const e = effect('p', 'wipe', { parameters: { v: { type: 'vec2', default: [1, 0], verifiedSafeValues: [[1, 0]] } } }); assert.ok(validParams(e, { v: [1, 0] })); assert.ok(!validParams(e, { v: [0, 1] })); assert.ok(!validParams(e, { v: [1, 0], extra: 1 })); assert.ok(!validParams(e, { v: '1,0' })); assert.ok(!validParams(effect('bad', 'wipe', { parameters: { n: { type: 'float', default: 'bad', verifiedSafeValues: ['bad'] } } }), { n: 'bad' })); });
test('Short scenes and important readable UI downgrade without moving the clock', () => { const t = timeline(); t.scenes[1].requiresClearReading = true; const r = select(t); assert.equal((r.timeline.transitions[0] as any).transitionId, 'hard_cut'); const short = timeline(); short.scenes[1].to = short.scenes[1].from + 8; assert.equal((select(short).timeline.transitions[0] as any).transitionId, 'hard_cut'); assert.deepEqual(r.timeline.scenes, t.scenes); assert.equal(r.timeline.durationInFrames, t.durationInFrames); });
test('No forced diversity: repeated single compatible effect falls back to cuts', () => { const r = select(timeline(5), [effect('only')]); const ids = r.timeline.transitions.map((x: any) => x.transitionId); assert.deepEqual(ids, ['glt:only', 'hard_cut', 'glt:only', 'hard_cut']); });
test('Strong budgets and intervals are hard constraints', () => { const t = timeline(7); for (const s of t.scenes)
    s.transitionRelation = 'chapter_change'; const r = select(t, [effect('strong', 'geometry', { visualIntensity: 'strong' })]); const chosen = r.timeline.transitions.filter((x: any) => x.transitionId !== 'hard_cut') as any[]; assert.ok(chosen.length <= Math.floor(6 * config.maxStrongFraction)); for (let i = 1; i < chosen.length; i++)
    assert.ok((chosen[i].boundaryFrame - chosen[i - 1].boundaryFrame) / 30 >= config.minStrongGapSeconds); });
test('Formal mode excludes unreviewed; exploration clearly labels trial', () => { assert.ok(select().timeline.transitions.some((x: any) => x.isTrial)); assert.ok(select(timeline(), [effect('a')], { ...config, exploration: false }).timeline.transitions.every((x: any) => x.transitionId === 'hard_cut')); });
test('Bounded fallback preserves authoritative frames and cannot retry a cut twice', () => { const t = select().timeline; const a = downgrade(t, [90], 'Injected shader failure'); assert.equal(a.logs.length, 1); const b = downgrade(a.timeline, [90], 'Injected again'); assert.equal(b.logs.length, 0); assert.deepEqual(a.timeline.scenes, t.scenes); assert.equal(a.timeline.durationInFrames, t.durationInFrames); });
import { transitionGate } from './gate.ts';
test('GL gate rejects bypassed registry and shifted authoritative scene clocks', () => { const source = timeline(), catalog = [effect('DirectionalWipe'), effect('Other')], selected = select(source, catalog).timeline; assert.equal(transitionGate(selected, catalog, config, new Set(), source).automatic.result, 'PASS'); const bad = structuredClone(selected); (bad.transitions[0] as any).transitionId = 'glt:Unregistered'; assert.equal(transitionGate(bad, catalog, config, new Set(), source).automatic.result, 'FAIL'); const shifted = structuredClone(selected); shifted.scenes[0].to++; assert.equal(transitionGate(shifted, catalog, config, new Set(), source).automatic.result, 'FAIL'); });
test('Missing semantic metadata conservatively selects a dissolve or cut', () => { const t = timeline(); for (const s of t.scenes) {
    delete s.goal;
    delete s.visualReason;
    s.kind = 'live_action';
} const r = select(t, [effect('Fade', 'dissolve')]); assert.ok(r.report.cuts.every(x => x.relation === 'unknown')); assert.ok(r.timeline.transitions.every((x: any) => ['hard_cut', 'glt:Fade'].includes(x.transitionId))); });
test('Per-cut duration requires its own exported duration; explicit hard-cut preference wins',()=>{
 const t=timeline(3);t.scenes[1].transitionDurationFrames=6;t.scenes[2].transitionPolicy='hard_cut';
 const e=effect('Fade','dissolve',{validatedDurationFrames:[6]});
 t.scenes[1].transitionRelation='continuation';
 const r=select(t,[e]);assert.equal((r.timeline.transitions[0] as any).durationFrames,6);assert.equal((r.timeline.transitions[1] as any).transitionId,'hard_cut');
 t.scenes[1].transitionDurationFrames=8;assert.equal((select(t,[e]).timeline.transitions[0] as any).transitionId,'hard_cut');
 assert.deepEqual(r.timeline.scenes,timeline(3).scenes.map((s,i)=>({...s,...(i===1?{transitionDurationFrames:6,transitionRelation:'continuation'}:i===2?{transitionPolicy:'hard_cut'}:{})})));
});
