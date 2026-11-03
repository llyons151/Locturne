#!/usr/bin/env python3
"""Put a screenshot on a pre-rendered angle in about a second (no Blender).

    ./compose.py <angle> <screenshot.png> <out.png> [--grid DIR] [--roll DEG]
    ./compose.py yawm030_pitchp15 ../shots/08-home.png out/home.png
    ./compose.py list                       (angle names)

The body PNG was rendered with a black screen, so its screen area holds only the glass sheen. The screenshot is
warped onto the screen's exact corners (grid.json), clipped by the screen mask, and added in linear light, which is
what the renderer does with a lit screen. Result matches a direct Blender render.
"""
import json, sys, os, argparse
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument('angle'); ap.add_argument('shot', nargs='?'); ap.add_argument('out', nargs='?')
ap.add_argument('--grid', default=os.path.join(HERE, 'grid'))
ap.add_argument('--roll', type=float, default=0, help='spin in the picture plane, degrees (+ = counter-clockwise)')
a = ap.parse_args()
meta = json.load(open(os.path.join(a.grid, 'grid.json')))
if a.angle == 'list':
    for k, v in sorted(meta.items(), key=lambda kv: (kv[1]['pitch'], kv[1]['yaw'])):
        print(k, 'back' if not v['screen'] else '')
    sys.exit()
m = meta[a.angle]
body = Image.open(os.path.join(a.grid, a.angle + '.png')).convert('RGBA')
box = body.getbbox(); ox, oy = box[0], box[1]
body = body.crop(box)  # work on the phone only (about a third of the frame)
if m['screen']:
    shot = Image.open(a.shot).convert('RGB')
    sw, sh = shot.size
    src = [(0, 0), (sw, 0), (sw, sh), (0, sh)]
    dst = [(x - ox, y - oy) for x, y in m['screen']]
    # PIL wants the map from output pixels back to the screenshot: solve the homography dst -> src.
    A = []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
    coef = np.linalg.solve(np.array(A, float), np.array([c for p in src for c in p], float))
    warped = shot.transform(body.size, Image.Transform.PERSPECTIVE, tuple(coef), Image.Resampling.BICUBIC)
    mask = np.asarray(Image.open(os.path.join(a.grid, a.angle + '.mask.png')).convert('RGBA').crop(box))[..., 3:4] / 255.0
    lin = lambda c: np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    srgb = lambda c: np.where(c <= 0.0031308, c * 12.92, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055)
    b = np.asarray(body).astype(float) / 255.0
    rgb = srgb(lin(b[..., :3]) + lin(np.asarray(warped).astype(float) / 255.0) * mask)
    out = np.concatenate([np.clip(rgb, 0, 1), b[..., 3:4]], axis=2)
    body = Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA')
if a.roll:
    body = body.rotate(a.roll, Image.Resampling.BICUBIC, expand=True)
body = body.crop(body.getbbox())  # trim (after roll)
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
body.save(a.out, compress_level=1)
print(a.out, body.size)
