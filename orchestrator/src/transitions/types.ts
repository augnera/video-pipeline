/** Extends visual-timeline/0.1 transitions; no parallel scene clock. */
export type Status = 'REGISTERED' | 'VERIFIED' | 'FAILED' | 'BLOCKED';
export interface Effect {
    transitionId: string;
    upstreamName: string;
    technicalStatus: Status;
    humanEvaluation: 'NOT_EVALUATED' | 'RECOMMENDED' | 'ALLOWED' | 'REJECTED';
    category: string;
    visualIntensity: string;
    parameters: Record<string, {
        type: string;
        default: unknown;
        verifiedSafeValues: unknown[];
    }>;
    validatedDurationFrames: number[];
    extraTextures: {
        name: string;
        localPath: string;
    }[];
    semanticUse: string[];
    renderCostSeconds?: number;
    fallbackId: string;
}
export interface CutSelection {
    fromShotId: string;
    toShotId: string;
    toRequestId: string;
    type: 'gl_transition' | 'hard_cut';
    engine: 'gl-transitions' | 'none';
    transitionId: string;
    boundaryFrame: number;
    startFrame: number;
    durationFrames: number;
    params: Record<string, unknown>;
    selectionMode: 'rules';
    selectionReason: string;
    reason: string;
    fallbackId: string;
    isTrial: boolean;
    relation: string;
    texturePaths: Record<string, string>;
    edgeHolds: {
        previousFrames: number;
        nextFrames: number;
    };
    maxBlurPx: number;
    widthPx: number;
}
export interface Scene {
    id: string;
    requestId: string;
    from: number;
    to: number;
    kind: string;
    goal?: string;
    visualReason?: string;
    transitionRelation?: string;
    requiresClearReading?: boolean;
    transitionPolicy?: 'hard_cut'|'soft'|'progression';
    transitionDurationFrames?:number;
    sourceStart?: number | null;
    sourceEnd?: number | null;
    assetId?: string;
    [key: string]: unknown;
}
export interface Timeline {
    fps: number;
    durationInFrames: number;
    width: number;
    scenes: Scene[];
    transitions: unknown[];
    [key: string]: unknown;
}
export interface SelectionConfig {
    exploration: boolean;
    durationFrames: number;
    maxConsecutiveSame: number;
    maxSameEffectPerFilm: number;
    minStrongGapSeconds: number;
    minAnimatedGapSeconds?: number;
    maxStrongFraction: number;
    maxAnimatedCutFraction: number;
    recentPenalty: number;
    maxExtraEdgeHoldFrames: number;
    defaultFallbackId: string;
    readableKinds: string[];
    relations: Record<string, string[]>;
}
