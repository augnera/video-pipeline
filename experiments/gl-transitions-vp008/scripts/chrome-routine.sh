#!/usr/bin/env bash
set -euo pipefail
: "${VP_BROWSER_EXECUTABLE:?Set existing approved browser path}"
exec "$VP_BROWSER_EXECUTABLE" "$@" --use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --ozone-platform=headless --headless=new
