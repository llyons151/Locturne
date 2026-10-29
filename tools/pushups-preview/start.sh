#!/usr/bin/env bash
# The push-ups camera preview on its own Metro server (port 8083 by default), apart from the main
# `expo start` on 8081 and the onboarding preview on 8082. Same source tree, so editing
# src/features/wake/pushups-view.tsx hot-reloads every phone. Single-page web output, as the
# onboarding preview (tools/onboarding-preview/start.sh) explains.
# Usage: npm run pushups-preview [-- --port 8090]
set -euo pipefail
cd "$(dirname "$0")/../.."

port=8083
if [[ ${1:-} == --port ]]; then port=$2; fi

echo
echo "  Push-ups preview: http://localhost:$port/pushups-preview"
echo "  (first load builds the web bundle; give it a minute)"
echo
LOCTURNE_WEB_SPA=1 exec npx expo start --port "$port"
