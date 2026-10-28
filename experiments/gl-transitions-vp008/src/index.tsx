import React from 'react';
import { EndpointGuard } from './EndpointGuard';
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { glTransition } from '@gl-transitions/remotion';
const scene = (to: boolean) => <AbsoluteFill style={{ background: to ? '#d38a40' : '#214877', color: '#ffffff', alignItems: 'center', justifyContent: 'center' }}><div style={{ position: 'absolute', inset: 35, border: '12px solid ' + (to ? '#502373' : '#32caca'), transform: to ? 'rotate(8deg)' : 'rotate(-8deg)' }}/><div style={{ fontSize: 100, fontWeight: 900 }}>{to ? 'B' : 'A'}</div><div style={{ width: 90, height: 90, borderRadius: to ? 45 : 0, background: to ? '#80dc63' : '#d96caa', position: 'absolute', top: to ? 370 : 130, left: to ? 190 : 60 }}/></AbsoluteFill>;
export const textures = { luma: staticFile('luma.png'), displacementMap: staticFile('displacement.png') };
export function Preview({ name = 'DirectionalWipe', params = {}, noTransition = false }: {
    name?: string;
    params?: Record<string, unknown>;
    noTransition?: boolean;
}) {
    const f = useCurrentFrame();
    if (noTransition)
        return <AbsoluteFill>{scene(f >= 15)}</AbsoluteFill>;
    return <AbsoluteFill><TransitionSeries><TransitionSeries.Sequence durationInFrames={24}>{scene(false)}</TransitionSeries.Sequence><TransitionSeries.Transition presentation={glTransition({ name: name as never, params: params as never, textures })} timing={linearTiming({ durationInFrames: 18 })}/><TransitionSeries.Sequence durationInFrames={24}>{scene(true)}</TransitionSeries.Sequence></TransitionSeries><EndpointGuard frame={f - 6} durationFrames={18} from={scene(false)} to={scene(true)}/><div style={{ position: 'absolute', top: 12, left: 10, right: 10, fontSize: 13, fontFamily: 'sans-serif', color: 'white', background: '#101225dd', padding: 8 }}>glt:{name} · GL Transitions 2.0.0</div></AbsoluteFill>;
}
const Root = () => <Composition id="GLPreview" component={Preview} width={360} height={640} fps={30} durationInFrames={30}/>;
registerRoot(Root);
