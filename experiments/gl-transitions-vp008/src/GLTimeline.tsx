import React from 'react';
import {AbsoluteFill,Freeze,Sequence,staticFile,useCurrentFrame} from 'remotion';
import {TransitionSeries,linearTiming} from '@remotion/transitions';
import {glTransition} from '@gl-transitions/remotion';
import {EndpointGuard} from './EndpointGuard';
import {pictureStyle,progress,sourceFrame} from '../../day9-remotion/src/visual-effects';
type S = any;
function Layer({ s, frame, timeline, renderVisual }: {
    s: S;
    frame: number; timeline:any; renderVisual:(s:any)=>React.ReactNode;
}) { const local = sourceFrame(frame, s.from, s.to), p = progress(local, s.to - s.from), m = s.motion; return <AbsoluteFill style={pictureStyle(s.entry as any, local)}><AbsoluteFill style={{ transform: `translate(${m.panX * p}px,${m.panY * p}px) scale(${m.scaleFrom + (m.scaleTo - m.scaleFrom) * p})` }}><Freeze frame={local}>{renderVisual(s)}</Freeze></AbsoluteFill></AbsoluteFill>; }
export function GLBackground({ timeline, renderVisual, qualityProbeNoTransitions = false }: {
    timeline:any;renderVisual:(s:any)=>React.ReactNode;
    qualityProbeNoTransitions?: boolean;
}) {
    const f = useCurrentFrame();
    const cut = !qualityProbeNoTransitions && timeline.transitions.find((x:any) => x.engine === 'gl-transitions' && f >= x.startFrame && f < x.startFrame + x.durationFrames);
    if (cut) {
        const before = timeline.scenes.find((x:any) => x.id === cut.fromShotId)!, after = timeline.scenes.find((x:any) => x.id === cut.toShotId)!;
        // Overlap lives only inside an existing cut window. D+D-D = D: no frame is removed from the authoritative timeline.
        return <Sequence from={cut.startFrame} durationInFrames={cut.durationFrames}><TransitionSeries><TransitionSeries.Sequence durationInFrames={cut.durationFrames}><Layer s={before} frame={f} timeline={timeline} renderVisual={renderVisual}/></TransitionSeries.Sequence><TransitionSeries.Transition presentation={glTransition({ name: cut.transitionId.slice(4) as never, params: cut.params as never, textures: Object.fromEntries(Object.entries(cut.texturePaths).map(([name, path]) => [name, staticFile(String(path).includes('luma') ? 'luma.png' : 'displacement.png')])) })} timing={cut.timingProfile==='endpoint-inclusive-linear'?{getDurationInFrames:()=>cut.durationFrames,getProgress:({frame}:{frame:number})=>Math.max(0,Math.min(1,frame/(cut.durationFrames-1)))}:linearTiming({ durationInFrames: cut.durationFrames })}/><TransitionSeries.Sequence durationInFrames={cut.durationFrames}><Layer s={after} frame={f} timeline={timeline} renderVisual={renderVisual}/></TransitionSeries.Sequence></TransitionSeries><EndpointGuard frame={f - cut.startFrame} durationFrames={cut.durationFrames} from={<Layer s={before} frame={f} timeline={timeline} renderVisual={renderVisual}/>} to={<Layer s={after} frame={f} timeline={timeline} renderVisual={renderVisual}/>}/></Sequence>;
    }
    const s = timeline.scenes.find((s:any) => f >= s.from && f < s.to);
    if (!s)
        throw Error('Uncovered primary timeline frame ' + f);
    return <Layer s={s} frame={f} timeline={timeline} renderVisual={renderVisual}/>;
}
