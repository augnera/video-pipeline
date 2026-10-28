# VP009 full Day9 private review

Reuse chain: frozen Excel/voiced script/45 cues → explicit `directFull()` narrative rules → existing `recommend()` Asset Agent with procedural callback → existing `finalize()` → VP008 verified catalog selector → shared GLBackground / original media/Method/OpinionCard → existing Quality Gate with external layout/probe adapter.

Run from repository root: `bash orchestrator/src/full-day9/run.sh`. No dependency installation or model inference is needed. It uses the pinned VP008 software WebGL renderer and existing local materials only. `run.sh` stops on failure; shader-specific fallback is bounded once, non-GL errors stop. New full-audio mix retains original files and the existing +3dB default audition gain, adds explicit1s crossfade joins for full duration, and writes independent voice/music/mixed stems. Actual speech clarity, musical continuity and visual quality remain human review.

The original approved OpinionCard animation is reused with `includeAudio=false, showBrand=false`; original component defaults remain available. All non-foundation graphics are conceptual, not genuine product UI or operating footage. Lack of actual product/feedback recording is recorded in shot review. No new public Asset contract, database, service or material download.

Outputs in `orchestrator/output/day9-vp009/`: `day9-full.mp4` (same data as Quality Gate's `sample.mp4`), `timeline.json`, `shot-review.json`, `shot-and-transition-list.json`, `transition-selection-report.json`, `quality-report.json`, `repair-log.json`, `bgm-config.json`, `loop-validation.json`, `frame-scan.json`, full mixed WAV and source review frames. Failed construction/quality evidence is preserved separately, never labelled accepted output.

Tests: `node --import ./orchestrator/node_modules/tsx/dist/loader.mjs --test orchestrator/src/full-day9/full.test.ts orchestrator/src/transitions/select.test.ts orchestrator/src/visual-mvp/core.test.ts orchestrator/src/visual-mvp/quality.test.ts`.
