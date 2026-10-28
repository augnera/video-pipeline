#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cd ../..
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/transitions/cli.ts
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/transitions/render.ts
cd experiments/gl-transitions-vp008
ffmpeg -v error -y -i ../../orchestrator/output/day9-vp008/sample-picture.mp4 -i ../../orchestrator/output/day9-vp007/sample-bgm-plus3.mp4 -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart ../../orchestrator/output/day9-vp008/sample.mp4
python3 scripts/prepare-validation.py
cd ../..
node --import ./orchestrator/node_modules/tsx/dist/loader.mjs orchestrator/src/transitions/quality-cli.ts
