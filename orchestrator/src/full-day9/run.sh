#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/full-day9/plan.ts
python3 orchestrator/src/full-day9/audio.py
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/transitions/render.ts --out=orchestrator/output/day9-vp009 --entry=src/day9-full.tsx
python3 orchestrator/src/full-day9/validate.py
python3 orchestrator/src/full-day9/frame_scan.py
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/full-day9/quality.ts
