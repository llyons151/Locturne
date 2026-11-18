#!/usr/bin/env python3
"""Cut the payoff shots out of downloaded TikTok edits into 1080x1920 clips (public/confession/edits/eNN.mp4).
Each shot: (file stem, start, end of that shot in the source, horizontal centre 0-1 for the 9:16 crop).
A shot shorter than MIN plays slightly slowed so it still fills a beat. Sources: docs/reel-refs/edits (gitignored)."""
import subprocess
from pathlib import Path
SRC = Path(__file__).resolve().parents[3] / 'docs/reel-refs/edits'
OUT = Path(__file__).resolve().parents[1] / 'public/confession/edits'
MIN = 60 / 117.45 + 0.04
SHOTS = [
    ('gibbysoutside_7542598422348483871', 2.00, 3.79, .45),   # three friends running into the sunset (first: holds through the window)
    ('tonyolsenfilm_7455836334175817006', 1.15, 2.23, .50),   # girl running on the beach
    ('rafaelvidx_7381280893500984582', 1.19, 1.95, .50),      # summer party
    ('tonyolsenfilm_7614278189275155725', 0.05, 1.40, .40),   # couple running at sunset
    ('rafaelvidx_7381280893500984582', 6.11, 6.57, .35),      # silhouettes, arms up
    ('quincy.visuals_7521972489744895240', 6.61, 7.10, .50),  # boats from above
    ('tonyolsenfilm_7455836334175817006', 7.30, 8.20, .45),   # surfers with boards
    ('rafaelvidx_7381280893500984582', 13.88, 14.37, .50),    # girl in the field
    ('tonyolsenfilm_7614278189275155725', 9.45, 10.93, .50),  # carried and spun
    ('quincy.visuals_7521972489744895240', 11.44, 11.93, .50),# girl on the rocks by the sea
    ('rafaelvidx_7381280893500984582', 14.88, 15.37, .50),    # splashing in the sea
    ('quincy.visuals_7521972489744895240', 12.91, 13.37, .50),# speedboat
    ('rafaelvidx_7381280893500984582', 17.34, 18.30, .50),    # holding hands, spinning
    ('tonyolsenfilm_7455836334175817006', 9.04, 9.77, .50),   # couple at sunset
    ('tonyolsenfilm_7614278189275155725', 10.94, 11.47, .45), # arms out at the water
    ('gibbysoutside_7542598422348483871', 11.40, 13.50, .45),  # standing in the sunset
]
OUT.mkdir(parents=True, exist_ok=True)
for i, (stem, a, b, cx) in enumerate(SHOTS):
    f = SRC / f'{stem}.mp4'
    w, h = map(int, subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(f)], capture_output=True, text=True).stdout.split(','))
    span = b - a
    slow = max(1.0, MIN / span)
    cw = h * 9 // 16 // 2 * 2
    crop = f'crop={cw}:{h}:{max(0, min(w - cw, int(w * cx - cw / 2)))}:0' if w * 16 > h * 9 + 16 else 'null'
    vf = f'{crop},scale=1080:1920:flags=lanczos,setpts={slow:.3f}*PTS,fps=30,setsar=1'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-t', f'{span}', '-i', str(f), '-vf', vf, '-an',
                    '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', str(OUT / f'e{i:02d}.mp4')], check=True)
    print(f'e{i:02d} {stem[:14]} {span:.2f}s x{slow:.2f}')
