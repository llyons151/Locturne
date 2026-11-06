#!/usr/bin/env bash
# Side-by-side contact sheet: original reel (left) vs our render (right) at the same moments.
# usage: compare.sh original.mp4 ours.mp4 out.png [times...]
set -euo pipefail
orig="$1"; ours="$2"; out="$3"; shift 3
times=("$@"); [ ${#times[@]} -eq 0 ] && times=(0.2 0.6 1.5 2.6 3.1 4.0 5.0 5.5 6.3 6.9 7.6 9.5)
tmp=$(mktemp -d)
i=0
for t in "${times[@]}"; do
  ffmpeg -v error -y -ss "$t" -i "$orig" -frames:v 1 -vf "scale=270:480" "$tmp/a$i.png"
  ffmpeg -v error -y -ss "$t" -i "$ours" -frames:v 1 -vf "scale=270:480" "$tmp/b$i.png"
  ffmpeg -v error -y -i "$tmp/a$i.png" -i "$tmp/b$i.png" -filter_complex "hstack,drawtext=text='$t s':x=8:y=8:fontcolor=yellow:fontsize=20" "$tmp/p$i.png"
  i=$((i+1))
done
ffmpeg -v error -y -i "$tmp/p%d.png" -vf "tile=6x2:padding=6:color=0x333333" -frames:v 1 "$out"
echo "$out"
