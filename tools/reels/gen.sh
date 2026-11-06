#!/usr/bin/env bash
# Generate one image with GPT image generation via the Codex CLI (uses the ChatGPT login).
# usage: gen.sh <out.png> "<prompt>" [reference images...]
set -euo pipefail
out="$1"; prompt="$2"; shift 2
refs=(); for r in "$@"; do refs+=(--image "$r"); done
note=""; [ ${#refs[@]} -gt 0 ] && note="The attached image(s) are references."
work=$(mktemp -d)
printf '%s\n' "Use your built-in image generation tool to create ONE image (do not draw it with code). $note Then copy the resulting PNG to $out and reply only with that path.

$prompt" | timeout 900 codex exec --skip-git-repo-check -C "$work" "${refs[@]}" - > "$work/log.txt" 2>&1 || { tail -20 "$work/log.txt"; exit 1; }
test -f "$out" && echo "ok $out" || { tail -20 "$work/log.txt"; exit 1; }
