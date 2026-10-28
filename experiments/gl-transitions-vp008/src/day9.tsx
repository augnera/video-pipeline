import {GLBackground} from './GLTimeline';
import React from 'react';
import { EndpointGuard } from './EndpointGuard';
import { AbsoluteFill, Composition, Freeze, Img, OffthreadVideo, Sequence, registerRoot, staticFile, useCurrentFrame } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { glTransition } from '@gl-transitions/remotion';
import { PocMotionSample } from '../../day9-remotion/src/Vp006R1Root';
import { TimelineVisual } from '../../day9-remotion/src/Vp007Root';
import { ContentDisclosures } from '../../day9-remotion/src/content-disclosure';
import { pictureStyle, progress, sourceFrame } from '../../day9-remotion/src/visual-effects';
import timeline from '../../../orchestrator/output/day9-vp008/timeline.json';
export const Background=({qualityProbeNoTransitions=false}:{qualityProbeNoTransitions?:boolean})=><GLBackground timeline={timeline} qualityProbeNoTransitions={qualityProbeNoTransitions} renderVisual={s=><TimelineVisual s={s} fps={timeline.fps}/>}/>;
function Sample({ qualityProbeNoTransitions = false }: {
    qualityProbeNoTransitions?: boolean;
}) { return <PocMotionSample background={<Background qualityProbeNoTransitions={qualityProbeNoTransitions}/>} audioSrc={staticFile(timeline.publicVoice)} captionOffsetSeconds={timeline.globalStartSeconds} captions={timeline.captions} showBrand={false} showSceneBadge={false} extraOverlay={<ContentDisclosures entries={timeline.disclosures as any}/>}/>; }
const Root = () => <Composition id="GLDay9" component={Sample} width={timeline.width} height={timeline.height} fps={timeline.fps} durationInFrames={timeline.durationInFrames}/>;
registerRoot(Root);
