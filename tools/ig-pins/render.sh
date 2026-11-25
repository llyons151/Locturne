#!/bin/bash
# ./render.sh [ids...]  → out/<id>/trio.png + tile-1..3.jpg (1080x1440) + grid preview
cd "$(dirname "$0")"
ids=${@:-$(node -e "console.log(require('./versions.js').map(v=>v.id).join(' '))")}
for id in $ids; do
  mkdir -p out/$id
  google-chrome-stable --headless=new --hide-scrollbars --disable-gpu --allow-file-access-from-files \
    --window-size=3240,1440 --virtual-time-budget=15000 --screenshot=out/$id/trio.png \
    "file://$PWD/trio.html?v=$id" 2>/dev/null
  for i in 0 1 2; do magick out/$id/trio.png -crop 1080x1440+$((i*1080))+0 +repage -quality 92 out/$id/tile-$((i+1)).jpg; done
  echo "$id done"
done
