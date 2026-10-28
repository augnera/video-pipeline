import type { ReactNode } from 'react';
/** Chrome149 + Remotion4.0.539 CanvasDrawElement may show the other capture at p=0.
 * Keep the official presentation running, but explicitly show exact endpoints.
 * This layer lives inside the picture transition only; captions never enter it.
 */
export function EndpointGuard({ frame, durationFrames, from, to }: {
    frame: number;
    durationFrames: number;
    from: ReactNode;
    to: ReactNode;
}) { return frame === 0 ? from : frame === durationFrames - 1 ? to : null; }
