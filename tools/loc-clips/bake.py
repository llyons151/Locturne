#!/usr/bin/env python3
"""
Bakes an AI video of Loc (a black silhouette on white, standing on a black ledge at the bottom)
into a transparent animated WebP the app plays (src/features/wake/loc-clip.tsx).

Every pixel becomes Loc's black with an alpha from how dark it was, cut steep so the AI's grey mush
goes and his edge stays crisp with a little anti-aliasing. The ledge is cropped off: his feet stand
on the crop's bottom edge, which the app puts on the panel's edge. The videos have no face: his eyes
are painted on, following his head.

Each clip's cut, speed and eyes are in clips.json, edited in the lab (`npm run loc-clips`, lab.py):

    python3 tools/loc-clips/bake.py loc-jump

Writes assets/loc-clips/NAME.webp, NAME-again.webp (the replay when he's tapped) and NAME.json (the
timings loc-clip.tsx reads). Needs ffmpeg with libwebp, Pillow and numpy.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageChops, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'assets', 'loc-clips')
CLIPS = os.path.join(HERE, 'clips.json')
CACHE = os.path.join(HERE, '.cache')

# Darker than LO is fully Loc, lighter than HI is fully clear; between, a smoothstep.
LO, HI = 70, 170
# A frame with more of him than this (source pixels) on its top row is cut off there.
MAX_CUT = 4
# The baked frames' width.
WIDTH = 480
# The video's own frame rate.
FPS = 24
# The player's video frame: a clip's frame scaled to this width (the stacked video is twice as tall).
VIDEO_W = 400
VIDEO_H = 444

# His eyes, in head widths unless said.
EYES = {
    'on': True,
    'gap': 0.36,       # between the eyes' centres
    'drop': 0.40,      # from the top of his ears down to the eyes
    'size': 0.060,     # an eye's half width
    'tall': 1.05,      # its height over its width
    'pupil': 0.033,    # the pupil's radius
    'lookX': 0.0,      # the pupil off centre, right
    'lookY': -0.006,   # and down
    'glint': 0.35,     # the pupil's highlight, as a share of the pupil; 0 for none
    'lid': 0.2,        # how much of the eye its lid covers from the top, 0 to 1
    'lidTilt': 12,     # the lid's slope in degrees, down toward his nose
}


def load(name):
    with open(CLIPS) as f:
        clips = json.load(f)
    cfg = clips[name]
    # One face for all of them: a clip can wear another's eyes (`eyesFrom`).
    worn = clips[cfg['eyesFrom']] if cfg.get('eyesFrom') else cfg
    cfg['eyes'] = {**EYES, **worn.get('eyes', {})}
    return cfg


def central_run(row, cx):
    """The dark run on this row that holds (or is nearest to) column cx."""
    xs = np.nonzero(row)[0]
    if not len(xs):
        return None
    cuts = np.nonzero(np.diff(xs) > 1)[0]
    starts = np.concatenate(([xs[0]], xs[cuts + 1]))
    ends = np.concatenate((xs[cuts], [xs[-1]]))
    best = min(range(len(starts)), key=lambda i: 0 if starts[i] <= cx <= ends[i] else min(abs(starts[i] - cx), abs(ends[i] - cx)))
    return int(starts[best]), int(ends[best])


def track(lum, usual):
    """Where his head is in this frame: its centre, the top of his ears and its width, or None. `usual`: the width so far."""
    h, w = lum.shape
    dark = lum < 128
    ys, xs = np.nonzero(dark)
    if len(xs) < 200:
        return None, usual
    cx = float(np.median(xs))
    near = dark[:, max(0, int(cx - w * 0.12)):int(cx + w * 0.12)]
    rows = np.nonzero(near.any(1))[0]
    if not len(rows):
        return None, usual
    top = int(rows[0])
    run = central_run(dark[min(h - 1, top + int(h * 0.1))], cx)
    if run:
        hw = run[1] - run[0]
        # An arm passing his head makes the run far too wide: keep the last good head.
        if usual is None or 0.8 * usual < hw < 1.2 * usual:
            cx = (run[0] + run[1]) / 2
            usual = hw if usual is None else usual * 0.8 + hw * 0.2
    if usual is None:
        return None, usual
    return {'cx': round(cx, 2), 'top': top, 'hw': round(float(usual), 2)}, usual


def draw_eyes(shape, tr, e):
    """Masks (0..1) of his eye whites and pupils. lab.html draws the same in the browser."""
    h, w = shape
    S = 4
    white = Image.new('L', (w * S, h * S), 0)
    pupil = Image.new('L', (w * S, h * S), 0)
    dw, dp = ImageDraw.Draw(white), ImageDraw.Draw(pupil)
    hw, cx = tr['hw'], tr['cx']
    ey = tr['top'] + e['drop'] * hw
    rx = e['size'] * hw
    ry = rx * e['tall']
    pr = e['pupil'] * hw
    slope = np.tan(np.radians(e['lidTilt']))
    for side in (-1, 1):
        ex = cx + side * e['gap'] * hw / 2
        dw.ellipse([(ex - rx) * S, (ey - ry) * S, (ex + rx) * S, (ey + ry) * S], fill=255)
        px, py = ex + e['lookX'] * hw, ey + e['lookY'] * hw
        dp.ellipse([(px - pr) * S, (py - pr) * S, (px + pr) * S, (py + pr) * S], fill=255)
        if e['glint'] > 0:
            g = pr * e['glint']
            gx, gy = px + pr * 0.35, py - pr * 0.35
            dp.ellipse([(gx - g) * S, (gy - g) * S, (gx + g) * S, (gy + g) * S], fill=0)
        if e['lid'] > 0:
            y0 = ey - ry + e['lid'] * 2 * ry
            x1, x2 = ex - 2 * rx, ex + 2 * rx
            line = lambda x: y0 - side * slope * (x - ex)
            dw.polygon([(x1 * S, line(x1) * S), (x2 * S, line(x2) * S), (x2 * S, (ey - 3 * ry) * S), (x1 * S, (ey - 3 * ry) * S)], fill=0)
    pupil = ImageChops.multiply(pupil, white.point(lambda v: 255 if v else 0))
    small = lambda m: np.asarray(m.resize((w, h), Image.LANCZOS), np.float32) / 255
    return small(white), small(pupil)


def cache_dir(name):
    return os.path.join(CACHE, name)


def prepare(name, cfg, force=False):
    """
    Every frame of the clip's video as an eyeless transparent PNG (.cache/NAME/e0000.png…), and for each
    its time, whether he's cut off at the top, and where his head is. Kept until the video or crop changes.
    """
    out = cache_dir(name)
    src = os.path.join(ROOT, cfg['src'])
    key = {'src': cfg['src'], 'mtime': os.path.getmtime(src), 'x': cfg['x'], 'w': cfg['w'], 'ledge': cfg['ledge'], 'pad': cfg.get('pad', 0), 'rebuild': cfg.get('rebuild', True), 'v': 3}
    meta = os.path.join(out, 'frames.json')
    if not force and os.path.exists(meta):
        with open(meta) as f:
            got = json.load(f)
        if got['key'] == key:
            return got
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    x, w, h = cfg['x'], cfg['w'], cfg['ledge']
    height = round(WIDTH * h / w / 2) * 2
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-i', src,
         '-vf', f'crop={w}:{h}:{x}:0,scale={WIDTH}:{height}:flags=lanczos,format=gray',
         os.path.join(out, 'g%04d.png')],
        check=True,
    )
    names = sorted(n for n in os.listdir(out) if n.startswith('g'))
    frames = []
    alphas = []
    usual = None
    for i, n in enumerate(names):
        path = os.path.join(out, n)
        lum = np.asarray(Image.open(path), dtype=np.float32)
        os.remove(path)
        t = np.clip((HI - lum) / (HI - LO), 0, 1)
        alphas.append((t * t * (3 - 2 * t) * 255).astype(np.uint8))
        head, usual = track(lum, usual)
        frames.append({'t': round(i / FPS, 4), 'cut': bool((lum[0] < 128).sum() > MAX_CUT * WIDTH / w), 'head': head})
    # Room over the video's top (`pad`), where the part of him that left the video is drawn back in.
    pad = round(cfg.get('pad', 0) * WIDTH / w)
    for i, f in enumerate(frames):
        a = np.zeros((height + pad, WIDTH), np.uint8)
        a[pad:] = alphas[i]
        if f['head']:
            f['head']['top'] += pad
        if f['cut'] and pad and cfg.get('rebuild', True):
            missing = rebuild(alphas, frames, i, pad)
            if missing is not None:
                m, piece = missing
                a[pad - m:pad] = piece
                f['cut'] = False
                if f['head']:
                    f['head']['top'] = pad - m
        rgba = np.zeros((height + pad, WIDTH, 4), np.uint8)
        rgba[..., 3] = a
        Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'e{i:04d}.png'))
    height += pad
    got = {'key': key, 'size': [WIDTH, height], 'frames': frames}
    with open(meta, 'w') as f:
        json.dump(got, f)
    return got


# How much of the frame's top is matched against a whole frame to place the missing piece.
BAND = 45


def rebuild(alphas, frames, i, pad):
    """
    Frame i has him cut off at the video's top (he jumped out of it). The missing rows come from the
    nearest whole frame before or after: slid until its head lies on what's left of his here, then the
    part above the video's top is taken. Returns (rows, the piece) or None.
    """
    whole = [j for j in range(len(frames)) if not frames[j].get('was_cut') and not frames[j]['cut'] and alphas[j].any()]
    before = [j for j in whole if j < i]
    after = [j for j in whole if j > i]
    a = alphas[i][:BAND].astype(np.float32)
    best = None
    for d in ([before[-1]] if before else []) + ([after[0]] if after else []):
        b = alphas[d].astype(np.float32)
        rows = np.nonzero((b > 128).sum(1) > 3)[0]
        if not len(rows):
            continue
        top = int(rows[0])
        for m in range(2, pad + 1):
            if top + m + BAND > b.shape[0]:
                break
            for dx in range(-14, 15, 2):
                err = np.abs(np.roll(b[top + m:top + m + BAND], dx, 1) - a).sum()
                if best is None or err < best[0]:
                    best = (err, d, m, dx, top)
    if best is None:
        return None
    _, d, m, dx, top = best
    frames[i]['was_cut'] = True
    return m, np.roll(alphas[d][top:top + m], dx, 1)


def picked(cfg, frames, start):
    """The frames a clip plays, from `start` to the cut's end; those cut off at the top go if asked."""
    # `skipFrom`–`skipTo`: a stretch left out, where the video holds still too long.
    # `skips`: more of them, as [from, to] pairs (not on the lab's sliders).
    cuts = [(cfg.get('skipFrom', 0), cfg.get('skipTo', 0))] + [tuple(s) for s in cfg.get('skips', [])]
    return [
        i for i, f in enumerate(frames)
        if start - 1e-6 <= f['t'] < cfg['end'] - 1e-6 and not (cfg['dropCut'] and f['cut'])
        and not any(a - 1e-6 <= f['t'] < b - 1e-6 for a, b in cuts)
    ]


def render(name, cfg, got, start, dest, loop=False):
    tmp = tempfile.mkdtemp()
    try:
        idx = picked(cfg, got['frames'], start)
        # Played backwards (`reverse`): the jump's landing run back is him springing up off the edge.
        if cfg.get('reverse'):
            idx = idx[::-1]
        speed = cfg['speed']
        # His eyes go once his head turns away from us (`eyesUntil`): they're only drawn face on.
        until = cfg.get('eyesUntil', 1e9)
        for k, i in enumerate(idx):
            im = Image.open(os.path.join(cache_dir(name), f'e{i:04d}.png'))
            head = got['frames'][i]['head']
            if cfg['eyes']['on'] and head and got['frames'][i]['t'] < until:
                a = np.asarray(im).astype(np.float32)
                white, pupil = draw_eyes(a.shape[:2], head, cfg['eyes'])
                # Only on him: never past his edge.
                white = white * (a[..., 3] / 255)
                a[..., 0] = a[..., 1] = a[..., 2] = white * (1 - pupil) * 255
                im = Image.fromarray(a.astype(np.uint8), 'RGBA')
            im.save(os.path.join(tmp, f'a{k:04d}.png'))
            # The player's video (loc-clip-player.tsx): grey only, his alpha on top and his eyes' white
            # under it, so no colour subsampling blurs either.
            a = np.asarray(im.convert('RGBA'))
            alpha = a[..., 3]
            white = (a[..., 0].astype(np.uint16) * alpha // 255).astype(np.uint8)
            stack = Image.fromarray(np.concatenate([alpha, white]), 'L').resize((VIDEO_W, VIDEO_H * 2), Image.LANCZOS)
            stack.save(os.path.join(tmp, f's{k:04d}.png'))
        rate = FPS * speed
        frames_dir = smooth(tmp, len(idx), rate, loop)
        out_rate = OUT_FPS if frames_dir != tmp else rate
        subprocess.run(
            ['ffmpeg', '-v', 'error', '-y', '-framerate', f'{out_rate:.4f}', '-i', os.path.join(frames_dir, 's%04d.png'),
             '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '14', '-g', '24',
             '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dest],
            check=True,
        )
        return idx
    finally:
        shutil.rmtree(tmp)


# RIFE (github.com/nihui/rife-ncnn-vulkan, on the GPU): AI in-between frames, so the 24 fps videos play at
# the app's 60 (user, 2026-11-12: "it still looks choppy"). Without it the bake keeps the video's own rate.
RIFE = os.environ.get('RIFE', os.path.expanduser('~/.local/share/rife-dl/rife-ncnn-vulkan-20221029-ubuntu/rife-ncnn-vulkan'))
RIFE_MODEL = 'rife-v4.6'
OUT_FPS = 60


def smooth(tmp, n, rate, loop):
    """The stacked frames (tmp/s%04d.png) taken to OUT_FPS by RIFE, cleaned; the folder they're in."""
    if not os.path.exists(RIFE) or n < 2:
        return tmp
    src, dst = os.path.join(tmp, 'rin'), os.path.join(tmp, 'rout')
    os.makedirs(src)
    os.makedirs(dst)
    names = [f's{k:04d}.png' for k in range(n)]
    # A loop's last frame runs into its first: the first goes on the end too, so the in-betweens
    # across the wrap are made, and the copy is dropped after.
    if loop:
        names.append(names[0])
    for k, name in enumerate(names):
        Image.open(os.path.join(tmp, name)).convert('RGB').save(os.path.join(src, f'{k + 1:08d}.png'))
    want = round(n * OUT_FPS / rate)
    subprocess.run(
        [RIFE, '-i', src, '-o', dst, '-n', str(want + (1 if loop else 0)), '-m', RIFE_MODEL, '-g', '0'],
        check=True, cwd=os.path.dirname(RIFE), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    out = sorted(os.listdir(dst))[:want]
    final = os.path.join(tmp, 'smooth')
    os.makedirs(final)
    for k, name in enumerate(out):
        g = np.asarray(Image.open(os.path.join(dst, name)).convert('L'), np.float32) / 255
        h = g.shape[0] // 2
        # The bake's cut again: an in-between's soft blend firms up to his crisp edge, eyes too.
        t = np.clip((g - 0.15) / 0.7, 0, 1)
        g = t * t * (3 - 2 * t)
        g[h:] = np.minimum(g[h:], g[:h])
        Image.fromarray((g * 255).astype(np.uint8), 'L').save(os.path.join(final, f's{k:04d}.png'))
    return final


def launch_ms(cfg, frames, idx):
    """When the frame at `launchAt` shows, in the played clip."""
    before = sum(1 for i in idx if frames[i]['t'] < cfg['launchAt'] - 1e-6)
    return round(before * 1000 / (FPS * cfg['speed']))


def bake(name, say=print):
    cfg = load(name)
    say('reading the video…')
    got = prepare(name, cfg)
    os.makedirs(OUT, exist_ok=True)
    say(f'baking {name}…')
    if cfg.get('loop') or cfg.get('exit'):
        # A loop plays round and round: its cut's last frame runs into its first (docs/LOC_CLIPS.md).
        # An exit (Done) plays once: `moonAt` is when the moon starts to fall.
        main = render(name, cfg, got, cfg['start'], os.path.join(OUT, f'{name}.mp4'))
        meta = {'aspect': round(cfg['w'] / (cfg['ledge'] + cfg.get('pad', 0)), 4), 'ms': round(len(main) * 1000 / (FPS * cfg['speed']))}
        if cfg.get('exit'):
            meta['moonMs'] = launch_ms({**cfg, 'launchAt': cfg['moonAt']}, got['frames'], main)
        with open(os.path.join(OUT, f'{name}.json'), 'w') as f:
            json.dump(meta, f, indent=2)
            f.write('\n')
        say(f"done: {len(main)} frames, {meta['ms']} ms, {os.path.getsize(os.path.join(OUT, name + '.mp4')) // 1024} KB")
        write_art()
        return meta
    main = render(name, cfg, got, cfg['start'], os.path.join(OUT, f'{name}.mp4'))
    again = main
    meta = {
        'aspect': round(cfg['w'] / (cfg['ledge'] + cfg.get('pad', 0)), 4),
        # The share of the clip's height that's the room over the video's top.
        'headroom': round(cfg.get('pad', 0) / (cfg['ledge'] + cfg.get('pad', 0)), 4),
        # His clip's width as a share of the screen's.
        'share': cfg.get('size', 0.4),
        'launchMs': launch_ms(cfg, got['frames'], main),
        'againLaunchMs': launch_ms(cfg, got['frames'], again),
        'ms': round(len(main) * 1000 / (FPS * cfg['speed'])),
        'againMs': round(len(again) * 1000 / (FPS * cfg['speed'])),
    }
    with open(os.path.join(OUT, f'{name}.json'), 'w') as f:
        json.dump(meta, f, indent=2)
        f.write('\n')
    say(f"done: {len(main)} frames, {meta['ms']} ms, {os.path.getsize(os.path.join(OUT, name + '.mp4')) // 1024} KB")
    write_art()
    return meta


ART = os.path.join(ROOT, 'src', 'features', 'wake', 'loc-clip-art.ts')


def write_art():
    """The clips' videos inlined for the player's webview, which can't count on the app's asset files in a release build."""
    import base64
    lines = ['// Generated by tools/loc-clips/bake.py from assets/loc-clips/*.mp4. Do not edit.', '']
    for n in sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp4')):
        with open(os.path.join(OUT, n + '.mp4'), 'rb') as f:
            data = base64.b64encode(f.read()).decode()
        key = '_'.join(n.split('-')[1:]).upper()
        lines.append(f"export const {key}_MP4 = '{data}';")
    with open(ART, 'w') as f:
        f.write('\n'.join(lines) + '\n')


def bake_all(say=print):
    with open(CLIPS) as f:
        names = list(json.load(f))
    for n in names:
        bake(n, say)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    print(json.dumps(bake(sys.argv[1]), indent=2))
