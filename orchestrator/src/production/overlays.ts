export interface Overlay {
    id: string;
    sceneId?: string;
    text: string;
    fromFrame: number;
    toFrame: number;
    rect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    fontSize?: number;
    animation: {
        type: 'none' | 'fade' | 'slide_up' | 'scale';
        inFrames: number;
        outFrames: number;
    };
}
export function validateOverlays(t: any, c: any) {
    const ids = new Set(), errors: string[] = [];
    for (const o of (t.overlays ?? []) as Overlay[]) {
        const r = o.rect, a = o.animation, d = o.toFrame - o.fromFrame;
        if (!o.id || ids.has(o.id))
            errors.push('duplicate/missing overlay id');
        ids.add(o.id);
        if (typeof o.text !== 'string' || !o.text.trim() || o.text.length > c.visual.overlay.maxTextCharacters)
            errors.push(o.id + ': invalid/long text');
        if (![o.fromFrame, o.toFrame, a?.inFrames, a?.outFrames].every(Number.isInteger) || o.fromFrame < 0 || o.toFrame > t.durationInFrames || d <= 0 || a.inFrames < 0 || a.outFrames < 0 || a.inFrames + a.outFrames > d || !['none', 'fade', 'slide_up', 'scale'].includes(a.type))
            errors.push(o.id + ': invalid frame timing');
        if (!r || ![r.x, r.y, r.width, r.height].every(Number.isFinite) || r.x < 40 || r.y < 60 || r.width <= 0 || r.height <= 0 || r.x + r.width > t.width - 40 || r.y + r.height > c.captions.top - 24 || r.width * r.height > t.width * t.height * c.visual.overlay.maxFrameAreaFraction)
            errors.push(o.id + ': unsafe rect');
        if (o.fontSize !== undefined && (!Number.isFinite(o.fontSize) || o.fontSize < 28 || o.fontSize > 96))
            errors.push(o.id + ': invalid font');
        const scene = o.sceneId ? t.scenes.find((s: any) => s.id === o.sceneId) : null;
        if (o.sceneId && (!scene || o.fromFrame < scene.from || o.toFrame > scene.to))
            errors.push(o.id + ': outside scene');
        for (const s of t.scenes ?? [])
            if (s.to > o.fromFrame && s.from < o.toFrame)
                for (const p of s.protectedRects ?? [])
                    if (r && r.x < p.x + p.width && r.x + r.width > p.x && r.y < p.y + p.height && r.y + r.height > p.y)
                        errors.push(o.id + ': intersects protected subject');
    }
    if (errors.length)
        throw Error('OVERLAY_CONTRACT: ' + errors.join('; '));
    return true;
}
export function overlayProgress(o: Overlay, f: number) { if (f < o.fromFrame || f >= o.toFrame)
    return null; const a = o.animation; if (a.type === 'none')
    return 1; return Math.max(0, Math.min(1, a.inFrames ? (f - o.fromFrame) / a.inFrames : 1, a.outFrames ? (o.toFrame - 1 - f) / a.outFrames : 1)); }
