#!/usr/bin/env bash
# The onboarding preview on its own Metro server (port 8082 by default), apart from the main
# `expo start` on 8081. Same source tree, so editing src/features/onboarding/ still hot-reloads
# every frame.
#
# LOCTURNE_WEB_SPA=1 (app.config.js) serves the web app as a single-page app. With the app's
# static output, Metro rendered each frame's page on the server, one frame at a time (3–8 s
# each), so with ~25 frames most skies and moons hadn't drawn after 25 s. Now every frame gets
# the same HTML shell at once and they all draw within ~15 s.
# Usage: npm run onboarding-preview [-- --port 8090]
set -euo pipefail
cd "$(dirname "$0")/../.."

port=8082
if [[ ${1:-} == --port ]]; then port=$2; fi

echo
echo "  Onboarding preview: http://localhost:$port/onboarding-preview"
echo "  (first load builds the web bundle; give it a minute)"
echo
LOCTURNE_WEB_SPA=1 exec npx expo start --port "$port"
