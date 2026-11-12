#!/usr/bin/env python3
"""
Loc's clips as outlines (user, 2026-11-11: the videos stopped dead on a phone in Low Power Mode and
while screen recording): every frame of the baked videos (assets/loc-clips/*.mp4) traced into
polygons, his shape and the white of his eyes, which the app draws itself on a canvas
(src/features/wake/loc-clip-player.tsx). The same animation, frame for frame, with no video.

    python3 tools/loc-clips/outlines.py

Writes src/features/wake/loc-clip-art.ts. bake.py runs it after every bake. Needs ffmpeg and potrace.

The data, per clip, base64 of a stream of varints:
    frames, then per frame: his polygons, then his eyes' polygons
    polygons: count, then per polygon: points, x, y of the first, then each next as zigzag dx, dy
Points are in a UP times the video's frame (VIDEO_W x VIDEO_H in bake.py), y down. Filled even-odd.
"""
import base64
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'loc-clips')
ART = os.path.join(ROOT, 'src', 'features', 'wake', 'loc-clip-art.ts')
# Traced this many times the video's size: an edge lands within a third of a video pixel.
UP = 3
# Specks under this many traced pixels are dropped (potrace's turdsize).
SPECK = 6
# A point is dropped when the outline without it stays within this of it, in traced pixels.
TOLERANCE = 0.55
FPS = 60


def frames_of(path):
    """Every frame of a baked video, grey: [n, 2h, w]."""
    probe = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path],
        capture_output=True, text=True, check=True,
    ).stdout.strip().split(',')
    w, h = int(probe[0]), int(probe[1])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w)


def simplify(pts):
    """Douglas-Peucker on a closed polygon: split at its two farthest-apart points, each half on its own."""
    if len(pts) < 5:
        return pts
    p = np.asarray(pts, np.float64)
    far = int(np.argmax(((p - p[0]) ** 2).sum(1)))
    if far == 0:
        return pts

    def run(a):
        keep = np.zeros(len(a), bool)
        keep[0] = keep[-1] = True
        stack = [(0, len(a) - 1)]
        while stack:
            i, j = stack.pop()
            if j - i < 2:
                continue
            seg = a[j] - a[i]
            length = np.hypot(*seg)
            mid = a[i + 1:j] - a[i]
            dist = np.abs(mid[:, 0] * seg[1] - mid[:, 1] * seg[0]) / length if length else np.hypot(mid[:, 0], mid[:, 1])
            k = int(np.argmax(dist))
            if dist[k] > TOLERANCE:
                keep[i + 1 + k] = True
                stack += [(i, i + 1 + k), (i + 1 + k, j)]
        return a[keep]

    first, second = run(p[:far + 1]), run(np.vstack([p[far:], p[:1]]))
    return [(int(x), int(y)) for x, y in np.vstack([first[:-1], second[:-1]])]


def trace(mask, tmp):
    """The polygons round a mask's lit parts (holes too: they're filled even-odd), in traced pixels, y down."""
    h, w = mask.shape
    big = Image.fromarray(mask, 'L').resize((w * UP, h * UP), Image.LANCZOS)
    if big.getextrema()[1] < 128:
        return []
    pbm = os.path.join(tmp, 'm.pbm')
    # PBM's black is what potrace traces.
    big.point(lambda v: 0 if v >= 128 else 255).convert('1').save(pbm)
    svg = subprocess.run(['potrace', '-b', 'svg', '-a', '0', '-u', '1', '-t', str(SPECK), pbm, '-o', '-'], capture_output=True, text=True, check=True).stdout
    polys = []
    for d in re.findall(r' d="([^"]+)"', svg):
        x = y = 0
        for cmd, body in re.findall(r'([MmLlZz])([^MmLlZz]*)', d):
            nums = [int(n) for n in re.findall(r'-?\d+', body)]
            if cmd in 'Mm':
                x, y = (nums[0], nums[1]) if cmd == 'M' else (x + nums[0], y + nums[1])
                polys.append([(x, y)])
                rest, rel = nums[2:], cmd == 'm'
            elif cmd in 'Ll':
                rest, rel = nums, cmd == 'l'
            else:
                # Back at the start: a path's next `m` is from there.
                x, y = polys[-1][0]
                continue
            for i in range(0, len(rest), 2):
                x, y = (x + rest[i], y + rest[i + 1]) if rel else (rest[i], rest[i + 1])
                polys[-1].append((x, y))
    out = []
    for poly in polys:
        # potrace's y runs up from the foot.
        poly = simplify([(px, h * UP - py) for px, py in poly])
        if len(poly) >= 3:
            out.append(poly)
    return out


def varint(out, n):
    while n >= 0x80:
        out.append((n & 0x7F) | 0x80)
        n >>= 7
    out.append(n)


def pack(out, polys):
    varint(out, len(polys))
    for poly in polys:
        varint(out, len(poly))
        x, y = poly[0]
        varint(out, max(0, x))
        varint(out, max(0, y))
        for nx, ny in poly[1:]:
            for d in (nx - x, ny - y):
                varint(out, (d << 1) ^ (d >> 63))
            x, y = nx, ny


def clip_data(path, say=print):
    frames = frames_of(path)
    h = frames.shape[1] // 2
    out = bytearray()
    varint(out, len(frames))
    points = 0
    with tempfile.TemporaryDirectory() as tmp:
        for f in frames:
            for part in (f[:h], f[h:]):
                polys = trace(part, tmp)
                points += sum(len(p) for p in polys)
                pack(out, polys)
    say(f'{os.path.basename(path)}: {len(frames)} frames, {points // len(frames)} points a frame, {len(out) // 1024} KB')
    return base64.b64encode(bytes(out)).decode(), frames.shape[2], h


def write_art(say=print):
    lines = ['// Generated by tools/loc-clips/outlines.py from assets/loc-clips/*.mp4. Do not edit.', '']
    size = None
    for n in sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp4')):
        data, w, h = clip_data(os.path.join(OUT, n + '.mp4'), say)
        size = (w * UP, h * UP)
        key = '_'.join(n.split('-')[1:]).upper()
        lines.append(f"export const {key}_SHAPES = '{data}';")
    lines.insert(2, f'/** The frame the points are in, and how many frames play a second. */\nexport const CLIP_FRAME = {{ w: {size[0]}, h: {size[1]}, fps: {FPS} }};')
    with open(ART, 'w') as f:
        f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    if len(sys.argv) != 1:
        sys.exit(__doc__)
    write_art()
