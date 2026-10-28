#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Pinned unmodified official sources; only build config resolves standalone npm types.
node vendor/upstream/scripts/catalog/generate-transition-types.mjs vendor/upstream/packages/remotion/src/transition-types.generated.ts
./node_modules/.bin/tsc -p vendor/upstream/packages/remotion/tsconfig.build.json
npm pack ./vendor/upstream/packages/remotion --ignore-scripts --pack-destination ./vendor
# The checked-in lock pins the already built tarball. Updating it is an explicit maintenance action.
