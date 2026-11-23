#!/usr/bin/env bash
# "Dog's shit" trend edit: reference reel's dog intro + music; its Ducati beats swapped for Locturne.
# Footage: web-build screencasts made with record-flow.mjs (see out/dog-intro/cap): walk.mp4 = App states
# lab → Walk steps (Home walk, fake pedometer); pay.mp4 = /?demo=1 then /morning-won?demo=1&at=426&mornings=12.
# Motion (no zooms): focus pull, speed-ramped counter, real app motion, static wide.
# Usage: tools/reels/dogintro.sh path/to/ref.mp4 [out.mp4]
set -euo pipefail
cd "$(dirname "$0")"
REF="$1"; OUT="${2:-out/dog-intro/dog-intro.mp4}"
CAP=out/dog-intro/cap; WALK=$CAP/walk/walk.mp4; PAY=$CAP/pay/pay.mp4
FONT=../slides/fonts/TikTokSans-700.ttf
T=$(mktemp -d)
GRADE="eq=contrast=1.05:saturation=0.92,noise=alls=4:allf=t,format=yuv420p"
enc="-c:v libx264 -preset slow -crf 16 -r 30 -an"
# Beats in the reference: 2.97 4.50 6.11 8.64 (end 11.93)
ffmpeg -v error -y -i "$REF" -t 2.97 -vf "fps=30,drawtext=fontfile=$FONT:text='my mornings before Locturne':fontsize=64:fontcolor=white:borderw=5:bordercolor=black:x=(w-tw)/2:y=h*0.17,format=yuv420p" $enc $T/0.mp4
# 1 · 1.53s Home at night, focus pull (blurred → sharp in 0.45 s); static, chrome cropped off
ffmpeg -v error -y -ss 0.35 -t 1.53 -i $PAY -filter_complex "[0:v]scale=1166:-2,crop=1080:1920:43:392,split[a][b];[b]gblur=sigma=28[bl];[a][bl]blend=all_expr='A*min(T/0.45,1)+B*(1-min(T/0.45,1))',$GRADE" $enc $T/1.mp4
# 2 · 1.61s step counter, 0 → 199 speed-ramped, locked-off tight frame
ffmpeg -v error -y -ss 0.8 -t 57.4 -i $WALK -vf "setpts=PTS*1.61/57.4,fps=30,crop=860:1529:215:625,scale=1080:1920:flags=lanczos,$GRADE" -t 1.61 $enc $T/2.mp4
# 3 · 2.53s Loc pops up, the moon launches — static, the app does the moving
ffmpeg -v error -y -ss 5.85 -t 2.53 -i $PAY -vf "scale=1080:-2,crop=1080:1920:0:80,$GRADE" $enc $T/3.mp4
# 4 · 3.29s the time lands under the moon — static wide
# …then the CTA from 1.95 s (11.59 is the song's end): frame blurs + darkens, icon and words come up
C=1.95; R="min(max((T-$C)/0.3,0),1)"; RT="min(max((t-$C)/0.3,0),1)"
ffmpeg -v error -y -ss 8.38 -t 3.29 -i $PAY -loop 1 -t 3.29 -i public/demo/icon-round.png -filter_complex \
  "[0:v]scale=1080:-2,crop=1080:1920:0:80,split[a][b];[b]gblur=sigma=70:steps=3,eq=brightness=-0.28[bl];[a][bl]blend=all_expr='A*(1-$R)+B*$R',$GRADE[bg]; \
   [1:v]format=rgba,fade=t=in:st=$C:d=0.3:alpha=1[ic];[bg][ic]overlay=x=(W-w)/2:y=640:shortest=1, \
   drawtext=fontfile=$FONT:text='Locturne':fontsize=96:fontcolor=white:x=(w-tw)/2:y=960:alpha='$RT', \
   drawtext=fontfile=../slides/fonts/TikTokSans-500.ttf:text='Search Locturne on the App Store':fontsize=46:fontcolor=white@0.85:x=(w-tw)/2:y=1090:alpha='$RT',format=yuv420p" $enc $T/4.mp4
ffmpeg -v error -y -i $T/0.mp4 -i $T/1.mp4 -i $T/2.mp4 -i $T/3.mp4 -i $T/4.mp4 -i "$REF" \
  -filter_complex "[0:v]settb=1/30,setsar=1[a];[1:v]settb=1/30,setsar=1[b];[2:v]settb=1/30,setsar=1[c];[3:v]settb=1/30,setsar=1[d];[4:v]settb=1/30,setsar=1[e];[a][b][c][d][e]concat=n=5:v=1:a=0[v]" \
  -map "[v]" -map 5:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
rm -rf $T; echo "$OUT"
