# VP-008 GL Transitions — isolated adapter and renderer

Production Remotion dependencies are unchanged. This directory pins Remotion **4.0.539**, React **19.2.3**, GL Transitions **2.0.0** and the official source adapter **1.0.0** from commit **0efa1651dfdbc0cdbd57f4cda55f12d8b3dbc0c5**. The published adapter 0.1.0 peers with collection 1.x and is intentionally not forced onto 2.x.

The official shader renderer and GLSL are unchanged. `EndpointGuard.tsx` only protects exact boundary frames against an observed initial CanvasDrawElement capture flash. `chrome-software.sh` forces Chrome149 offscreen ANGLE SwiftShader (`swiftshader-webgl`), avoiding XCB initialization. It does not use CUDA or local video inference. Chrome path is local and explicit; adjust only after equivalent compatibility validation on another machine. Interactive Studio requires the official adapter's HTML-in-canvas browser support/flag; Studio preview alone is not export evidence.

From the repository root:

```bash
cd experiments/gl-transitions-vp008
npm ci --ignore-scripts --no-audit --no-fund
bash scripts/batch.sh
node scripts/audit-library.mjs
python3 scripts/atlas.py
node --require ../day9-remotion/scripts/loopback.cjs scripts/compat.mjs
python3 scripts/validate-compatibility.py
node --require ../day9-remotion/scripts/loopback.cjs scripts/failure-check.mjs
cd ../..
bash experiments/gl-transitions-vp008/scripts/natural.sh
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs --test orchestrator/src/transitions/select.test.ts orchestrator/src/visual-mvp/core.test.ts orchestrator/src/visual-mvp/quality.test.ts
experiments/gl-transitions-vp008/node_modules/.bin/tsc -p experiments/gl-transitions-vp008/tsconfig.json
```

`batch.sh` processes the complete fixed catalog, serially, one frame worker; names may be passed to limit an explicit investigation. Completed revision-2 exports are cached; per-effect errors do not abort the batch. Reattempts are bounded in the renderer. Known pixel-check failures remain failed on revalidation; successful encoding alone never grants VERIFIED. Remove/archive an effect's cached evidence only when intentionally changing its validation revision; preserve old failures.

Outputs: `orchestrator/output/day9-vp008/`. Per-effect default parameters, exact safe values, 9:16 previews, validation JSON, extra-texture hashes, notices, atlas volumes/index and selection audit live there. Preview test: 360×640, 30fps, 30 frames, transition18 frames. Natural sample:1080×1920, 30fps,546 frames. Other durations/parameter values are unverified and excluded by automatic selection. Middle dark/flash/alpha and aesthetics remain human review items; tests distinguish intentional effects from endpoint failures without claiming to classify every flicker.

Selector: `orchestrator/src/transitions/select.ts`. It extends the existing `timeline.transitions`, consumes existing finalized scenes and reasons, and writes no alternate picture clock. New fields are optional extensions to `TransitionDirective`; JSON Schema is `orchestrator/contracts/visual-transition-v0.2.schema.json`.

Config: `orchestrator/config/transition-selection.json`; explicit future human decisions: `orchestrator/config/transition-reviews.json`. No human review is manufactured by rebuilding the catalog. Selection is rule based and deterministic. Formal mode excludes unevaluated effects; exploration labels them trial. Hard cut is a fallback, not part of the library count.

On a shader/WebGL render failure, `orchestrator/src/transitions/render.ts` records a single downgrade to hard cut and retries once. Unrelated I/O/root-loading failures stop; they are not hidden by changing transitions. `quality-cli.ts` reuses VP007's Quality Gate via a probe adapter, adds GL registry/range/repetition/timeline checks, and keeps subjective results NOT_EVALUATED.

Full original shader sources and upstream MIT text are in `vendor/upstream/`; generated notices retain both BSD exceptions in full. Do not treat these software licenses as approval for the BGM, web footage or AI disclosure. Samples remain private local experiments.
