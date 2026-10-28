import React from 'react';
import { AbsoluteFill, Composition, Freeze, Sequence, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { glTransition } from '@gl-transitions/remotion';
import { TimelineVisual } from '../../day9-remotion/src/Vp007Root';
import { EndpointGuard } from './EndpointGuard';
import timeline from '../../../orchestrator/output/day9-vp007/timeline.json';
const s = timeline.scenes;
const demos = [{ id: 'image-video', from: 0, to: 1, name: 'SimpleZoom' }, { id: 'video-diagram', from: 2, to: 3, name: 'DirectionalWipe' }, { id: 'diagram-video', from: 3, to: 2, name: 'Fade' }, { id: 'video-video', from: 1, to: 2, name: 'Cube' }, { id: 'texture-video-diagram', from: 2, to: 3, name: 'LumaWipe' }];
function Scaled({ index, frame }: {
    index: number;
    frame: number;
}) { return <AbsoluteFill><div style={{ position: 'absolute', width: 1080, height: 1920, transform: 'scale(0.3333333333)', transformOrigin: 'top left' }}><Freeze frame={(s[index].kind === 'diagram' ? 120 : 0) + frame}><TimelineVisual s={s[index] as any} fps={30}/></Freeze></div></AbsoluteFill>; }
function Sample({ demo = 'image-video' }: {
    demo?: string;
}) { const f = useCurrentFrame(), d = demos.find(x => x.id === demo)!; const from = <Scaled index={d.from} frame={f}/>, to = <Scaled index={d.to} frame={f}/>; return <AbsoluteFill><TransitionSeries><TransitionSeries.Sequence durationInFrames={24}>{from}</TransitionSeries.Sequence><TransitionSeries.Transition presentation={glTransition({ name: d.name, textures: { luma: staticFile('luma.png') } })} timing={linearTiming({ durationInFrames: 18 })}/><TransitionSeries.Sequence durationInFrames={24}>{to}</TransitionSeries.Sequence></TransitionSeries><EndpointGuard frame={f - 6} durationFrames={18} from={from} to={to}/><div style={{ position: 'absolute', top: 10, left: 8, right: 8, fontSize: 12, color: 'white', background: '#111d', padding: 6 }}>{d.id} / glt:{d.name}</div></AbsoluteFill>; }
registerRoot(() => <Composition id="GLMediaCompatibility" component={Sample} width={360} height={640} fps={30} durationInFrames={30}/>);
