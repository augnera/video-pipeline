#!/usr/bin/env bash
# Chrome149: force offscreen software WebGL; bypass XCB surface initialization.
exec /home/chen/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome "$@" --use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --ozone-platform=headless --headless=new
