#!/usr/bin/env python3
"""
Tail lab (testing only, not in the app): cuts Loc's tail out of the running video
(docs/design-references/higgsfield/loc-run-kling.mp4, the end where he stands arms up and it sways)
and tracks his hip through each baked clip in assets/loc-clips, so the page can draw the tail behind
him in clips that never had one.

    python3 tools/tail-lab/build.py      # writes tools/tail-lab/out/
    cd tools/tail-lab && python3 -m http.server 5184   # http://localhost:5184

Out: tail.png (a strip of tail frames, black with alpha), CLIP.png (the clip's frames in a strip) and
data.json (frame sizes, timings, and per clip frame where the tail's root goes and how big).
Needs ffmpeg, Pillow and numpy.
"""
import json
import os
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageSequence

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, 'out')
RUN = os.path.join(ROOT, 'docs', 'design-references', 'higgsfield', 'loc-run-kling.mp4')
CLIPS = ['loc-jump', 'loc-jump-again', 'loc-idle', 'loc-down']
# Frames per row of a clip's sheet: 12 × 480 px keeps it under browsers' size limits.
COLS = 12

# The run video at 24 fps: frames 127..136 are him standing, arms up, tail swaying (it freezes after).
TAIL_FROM, TAIL_TO = 127, 136
# Where the tail is in the run video: right of his torso, below his raised arms.
TAIL_X0, TAIL_Y0 = 1076, 560
# Darker than LO is fully him, lighter than HI fully clear (as bake.py).
LO, HI = 70, 170
# Hip height as a share of head-top-to-feet, measured on the run video (torso's right edge, x 1071).
HIP = 0.55


def alpha_of(gray):
    t = np.clip((HI - gray.astype(np.float32)) / (HI - LO), 0, 1)
    return t * t * (3 - 2 * t)


def run_frames():
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', RUN, '-vf', 'fps=24', os.path.join(tmp, 'f%04d.png')], check=True)
    return [np.array(Image.open(os.path.join(tmp, f'f{i:04d}.png')).convert('L')) for i in range(TAIL_FROM, TAIL_TO + 1)]


def head_and_feet(mask):
    """Top of his head (the centre column's first row, under the ears and clear of raised arms) and his feet."""
    ys, xs = np.nonzero(mask)
    if not len(ys):
        return None
    feet = ys.max()
    # The body's centre: the middle of the mass in his lower half, where the arms aren't.
    low = ys > (ys.min() + feet) / 2
    cx = int(np.median(xs[low])) if low.any() else int(np.median(xs))
    col = np.nonzero(mask[:, max(cx - 3, 0):cx + 4].any(1))[0]
    return int(col.min()), int(feet), cx


def torso_right(mask, y, cx):
    """The right edge of the run of him on row y that holds cx."""
    row = mask[y]
    if not row[cx]:
        return None
    x = cx
    while x + 1 < len(row) and row[x + 1]:
        x += 1
    return x


def only_blob(a):
    """The tail alone: the one blob that holds the cut's centre of mass (scraps of hand or leg go)."""
    solid = a > 0.5
    ys, xs = np.nonzero(solid)
    if not len(ys):
        return a
    # Seed: the solid pixel nearest the centre of mass (the tail is the bulk of what's cut).
    cy, cx = ys.mean(), xs.mean()
    i = int(np.argmin((ys - cy) ** 2 + (xs - cx) ** 2))
    keep = np.zeros_like(solid)
    keep[ys[i], xs[i]] = True
    # Grow it through the solid pixels until it stops (PIL's floodfill did nothing here).
    while True:
        grown = keep | np.roll(keep, 1, 0) | np.roll(keep, -1, 0) | np.roll(keep, 1, 1) | np.roll(keep, -1, 1)
        grown &= solid
        if grown.sum() == keep.sum():
            break
        keep = grown
    # Its soft edge too: anything within two pixels of it.
    grown = keep.copy()
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            grown |= np.roll(np.roll(keep, dy, 0), dx, 1)
    return a * grown


def cut_tail(frames):
    """The tail of each frame, cropped to one box shared by all, and its root in that box, in run pixels."""
    tails = []
    for g in frames:
        a = alpha_of(g)
        ledge = int(np.argmax((g < 110).mean(1) > 0.9))
        a[ledge:] = 0
        a[:TAIL_Y0] = 0
        a[:, :TAIL_X0] = 0
        tails.append(only_blob(a))
    ys, xs = np.nonzero(np.max(tails, 0) > 0.02)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    # Reach a little into his body, so the root is always hidden behind him however the clip sits.
    pad = 24
    box = (box[0] - pad, box[1], box[2], box[3])
    m = frames[0] < 110
    m[int(np.argmax((frames[0] < 110).mean(1) > 0.9)):] = False
    head, feet, cx = head_and_feet(m)
    hip_y = int(head + HIP * (feet - head))
    root = (torso_right(m, hip_y, cx), hip_y)
    crops = []
    for a in tails:
        c = a[box[1]:box[3], box[0]:box[2]].copy()
        # The pad strip: fill it solid where the tail meets his side, so no seam shows.
        c[:, :pad] = np.maximum(c[:, :pad], (c[:, pad:pad + 1] > 0.5) * 1.0)
        crops.append(c)
    return crops, box, root, feet - head


def main():
    os.makedirs(OUT, exist_ok=True)
    crops, box, root, run_h = cut_tail(run_frames())
    tw, th = box[2] - box[0], box[3] - box[1]
    strip = Image.new('RGBA', (tw * len(crops), th))
    for i, c in enumerate(crops):
        rgba = np.zeros((th, tw, 4), np.uint8)
        rgba[..., 3] = (c * 255).astype(np.uint8)
        strip.paste(Image.fromarray(rgba, 'RGBA'), (i * tw, 0))
    strip.save(os.path.join(OUT, 'tail.png'))
    data = {
        'tail': {'w': tw, 'h': th, 'frames': len(crops), 'rootX': root[0] - box[0], 'rootY': root[1] - box[1], 'bodyH': run_h},
        'clips': {},
    }
    for name in CLIPS:
        src = os.path.join(ROOT, 'assets', 'loc-clips', f'{name}.webp')
        meta_path = os.path.join(ROOT, 'assets', 'loc-clips', f'{name.replace("-again", "")}.json')
        meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
        im = Image.open(src)
        frames = [f.convert('RGBA') for f in ImageSequence.Iterator(im)]
        w, h = frames[0].size
        ms = meta.get('againMs' if name.endswith('again') else 'ms') or 4000
        # His standing height in this clip: the tallest head-to-feet while his feet are on the bottom edge.
        tracks = []
        for f in frames:
            m = np.array(f)[..., 3] > 128
            tracks.append(head_and_feet(m) and (*head_and_feet(m), m))
        standing = max((t[1] - t[0] for t in tracks if t and t[1] >= h - 3), default=h * 0.8)
        scale = standing / run_h
        track = []
        for t in tracks:
            if not t:
                track.append(None)
                continue
            head, feet, cx, m = t
            # Hip from the head down, so it holds while he's half hidden behind the edge.
            hip_y = int(head + HIP * standing)
            x = torso_right(m, min(hip_y, h - 1), cx) if hip_y < h else None
            if x is None:
                # Below the frame (still behind the edge) or not on him: keep his centre plus half a torso.
                x = cx + int(0.5 * 266 * scale)
            track.append([x, hip_y])
        # A grid, not one long strip: browsers shrink images past a few thousand pixels wide, which
        # cut every frame from the wrong place (user, 2026-11-11: Loc drawn as two halves).
        sheet = Image.new('RGBA', (w * COLS, h * -(-len(frames) // COLS)))
        for i, f in enumerate(frames):
            sheet.paste(f, ((i % COLS) * w, (i // COLS) * h))
        sheet.save(os.path.join(OUT, f'{name}.png'))
        data['clips'][name] = {'w': w, 'h': h, 'cols': COLS, 'frames': len(frames), 'ms': ms, 'scale': scale, 'track': track}
        print(name, len(frames), 'frames, scale', round(scale, 3))
    json.dump(data, open(os.path.join(OUT, 'data.json'), 'w'))
    print('tail', tw, 'x', th, len(crops), 'frames, root', data['tail']['rootX'], data['tail']['rootY'])


if __name__ == '__main__':
    main()
