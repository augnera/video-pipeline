#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Single browser, sequential effects, one render frame worker: failures recorded per effect.
node --require ../day9-remotion/scripts/loopback.cjs scripts/render.mjs "$@"
python3 scripts/validate.py
node scripts/catalog.mjs
