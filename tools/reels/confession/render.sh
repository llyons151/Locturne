#!/usr/bin/env bash
# Render Confession reels the one way that's been checked, then QC each before anyone sees it.
#   confession/render.sh ConfessionAutoscroll [ConfessionDad ...]     (or: all)
# Steps per reel:
#   1. remotion render (30 fps, crf 16)
#   2. loudness to -14 LUFS / -1.5 dBTP (TikTok/Reels target), video stream copied untouched
#   3. QC, printed and written to out/qc/<name>.txt:
#      - duplicate frames per second of the reel (stutter shows as a run of repeats)
#      - blur per 2 s window (blurdetect: ~4 sharp, 6+ soft)
#      - loudness per second (a voice that doubles jumps ~6 dB; music that runs out drops to silence)
#      - a contact sheet out/qc/<name>.png (2 fps) to look at
set -euo pipefail
cd "$(dirname "$0")/.."
comps=("$@")
if [ "${1:-}" = all ]; then
  comps=($(grep -oE "^  Confession[A-Za-z]+:" src/confession/specs.ts | tr -d ' :' | grep -v Study))
fi
mkdir -p out/qc
for c in "${comps[@]}"; do
  name=$(echo "$c" | sed -E 's/^Confession//; s/([a-z])([A-Z])/\1-\2/g' | tr 'A-Z' 'a-z')
  out="out/confession-${name}.mp4"
  raw="out/qc/_${name}-raw.mp4"
  echo "== $c -> $out"
  npx remotion render src/index.ts "$c" "$raw" --concurrency=6 --crf=16 --log=error 2>&1 | grep -v "npm notice" || true
  ffmpeg -v error -y -i "$raw" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k "$out"
  rm -f "$raw"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out")
  {
    echo "$c  ${dur}s"
    printf "loudness/s: "; for s in $(seq 0 1 "${dur%.*}"); do ffmpeg -ss "$s" -t 1 -i "$out" -af volumedetect -vn -f null - 2>&1 | grep -o 'mean_volume: [-0-9.]*' | awk '{printf "%.0f ", $2}' || true; done; echo
    printf "blur/2s:    "; for s in $(seq 0 2 "${dur%.*}"); do ffmpeg -ss "$s" -t 0.5 -i "$out" -vf "blurdetect=block_width=32:block_height=32,metadata=print:file=-" -an -f null - 2>/dev/null | grep -o "blur=[0-9.]*" | awk -F= '{s+=$2;n++} END{if(n) printf "%.1f ", s/n}' || true; done; echo
    total=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "$out")
    uniq=$(ffmpeg -i "$out" -vf mpdecimate=hi=64*4:lo=64:frac=0.1 -an -f null - 2>&1 | grep -o "frame= *[0-9]*" | tail -1 | grep -o "[0-9]*")
    echo "frames: $total total, $uniq changed ($((100 * (total - uniq) / total))% repeats; stills and the app's quiet moments count too)"
  } | tee "out/qc/${name}.txt"
  ffmpeg -v error -y -i "$out" -vf "fps=2,scale=110:-1,tile=$(python3 -c "print(int(float('$dur')*2)+1)")x1" -frames:v 1 "out/qc/${name}.png"
done
