"""Bakes the moon lab's moons into the app: a recoloured sky and moon per moon, plus the extras
(twin moon, Eclipse ring, Saturn ring), as webp in assets/moons/, and src/features/moons/moon-data.ts.

The colouring is the lab's (index.html): each image's brightness, spread over its own darkest to
brightest, mapped onto the moon's colour ramp. Run `npm run moons:bake` after changing the lab.
"""

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT = REPO / 'assets' / 'moons'
DATA = REPO / 'src' / 'features' / 'moons' / 'moon-data.ts'
SKY = REPO / 'assets' / 'onboarding' / 'night-sky-moonless.png'
MOON = REPO / 'assets' / 'onboarding' / 'moon-frosted.png'

# The lab's phone, to turn its twin positions into offsets from the main moon.
W, PANEL = 320, 693 - round((14 + 52 + 34) * 320 / 390)
BASE = W * 0.9


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)


def ramp(stops, t):
    cs = np.stack([rgb(s) for s in stops])
    x = np.clip(t, 0, 1) * (len(cs) - 1)
    i = np.minimum(np.floor(x).astype(int), len(cs) - 2)
    f = (x - i)[..., None]
    return cs[i] * (1 - f) + cs[i + 1] * f


def lum(px):
    return (0.2126 * px[..., 0] + 0.7152 * px[..., 1] + 0.0722 * px[..., 2]) / 255


def blur(x, sigma):
    """A Gaussian blur of a float array, separable, in numpy (no scipy here)."""
    if sigma <= 0:
        return x
    r = int(sigma * 3) + 1
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    rows = np.pad(x, ((0, 0), (r, r)), mode='edge')
    x = sum(k[i] * rows[:, i:i + x.shape[1]] for i in range(2 * r + 1))
    cols = np.pad(x, ((r, r), (0, 0)), mode='edge')
    return sum(k[i] * cols[i:i + x.shape[0], :] for i in range(2 * r + 1))


def gradient_map(img, stops, scale=2, sigma=1.0):
    """
    The source images are dark and 8-bit: the sky has about 60 brightness levels and the moon about
    35, and stretching them over a whole colour ramp shows as bands and blotches (user, on the phone,
    2026-10-29). So the brightness is taken as floats, scaled up `scale` times (the phone shows these
    at about 2x their source size) and softened by `sigma` (in output pixels) to fill in between the
    levels, then mapped, and `save` dithers it back to 8 bits.
    """
    src = img.convert('RGBA')
    a = np.asarray(src, dtype=np.float64)
    l0 = lum(a)
    solid = a[..., 3] >= 128
    lo, hi = l0[solid].min(), l0[solid].max()
    size = (src.width * scale, src.height * scale)
    l = np.asarray(Image.fromarray(l0.astype(np.float32), 'F').resize(size, Image.BICUBIC), dtype=np.float64)
    l = blur(l, sigma)
    alpha = np.asarray(src.getchannel('A').resize(size, Image.BICUBIC), dtype=np.float64)
    out = np.zeros((size[1], size[0], 4))
    out[..., :3] = ramp(stops, (l - lo) / ((hi - lo) or 1))
    out[..., 3] = alpha
    return out


def set_lum(colour, l):
    """The 'color' blend mode: the tint's hue and saturation at the base's luminance (W3C compositing)."""
    lw = np.array([0.3, 0.59, 0.11])
    c = colour + (l - colour @ lw)[..., None]
    L = (c @ lw)[..., None]
    n, x = c.min(-1, keepdims=True), c.max(-1, keepdims=True)
    c = np.where(n < 0, L + (c - L) * L / np.maximum(L - n, 1e-6), c)
    c = np.where(x > 1, L + (c - L) * (1 - L) / np.maximum(x - L, 1e-6), c)
    return c


def tint(px, spec):
    """A CSS linear-gradient washed over the disc in 'color' blend at `amount`."""
    h, w = px.shape[:2]
    a = math.radians(spec['angle'])
    dx, dy = math.sin(a), -math.cos(a)
    length = abs(w * dx) + abs(h * dy)
    ys, xs = np.mgrid[0:h, 0:w]
    t = ((xs - w / 2) * dx + (ys - h / 2) * dy) / length + 0.5
    colour = ramp(spec['stops'], t) / 255
    base = px[..., :3] / 255
    blended = set_lum(colour, base @ np.array([0.3, 0.59, 0.11]))
    px[..., :3] = (base * (1 - spec['amount']) + blended * spec['amount']) * 255
    return px


def shadow(px, phase):
    """Earth's shadow, as the lab draws it: a soft dark shape over the disc (2/3 of the image wide)."""
    h, w = px.shape[:2]
    r, c = w / 3, w / 2
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    circle = lambda x, y, R, fill: d.ellipse([x - R, y - R, x + R, y + R], fill=fill)
    if phase in ('crescent', 'earthshine'):
        circle(c - r * 0.32, c + r * 0.3, r * 1.02, (6, 9, 18, 240) if phase == 'crescent' else (10, 16, 34, 184))
        blur = r * 0.06
    elif phase == 'half':
        d.rectangle([c - r * 1.3, c - r * 1.3, c, c + r * 1.3], fill=(6, 8, 14, 237))
        blur = r * 0.05
    elif phase == 'gibbous':
        circle(c - r * 1.55, c, r, (6, 8, 14, 237))
        blur = r * 0.08
    else:  # bite: the umbra's edge is fuzzy and red-brown
        circle(c + r * 0.85, c - r * 1.2, r, (58, 12, 6, 230))
        blur = r * 0.16
    s = np.asarray(layer.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float64)
    k = (s[..., 3] / 255)[..., None]
    px[..., :3] = px[..., :3] * (1 - k) + s[..., :3] * k
    return px


RNG = np.random.default_rng(7)


def save(px, name):
    """Dithered to 8 bits (triangular noise of one level), so smooth gradients don't step, then near-lossless webp."""
    px = px.copy()
    px[..., :3] += RNG.random(px.shape[:2] + (3,)) - RNG.random(px.shape[:2] + (3,))
    img = Image.fromarray(np.clip(np.round(px), 0, 255).astype(np.uint8), 'RGBA')
    img.save(OUT / name, 'WEBP', quality=96, method=6, alpha_quality=100)
    return name


def sky_luma():
    """
    The original sky's brightness for the live sky (modules/moon-sky): smoothed at 2x like the baked
    skies, spread over its own darkest to brightest, and stored at 16 bits as two 8-bit channels
    (red the high byte, green the low) in a lossless PNG, so the GPU's filtering stays smooth and
    every moon's colours are mapped onto it in the shader, at the screen's resolution.
    """
    src = Image.open(SKY).convert('RGBA')
    a = np.asarray(src, dtype=np.float64)
    l0 = lum(a)
    lo, hi = l0.min(), l0.max()
    size = (src.width * 2, src.height * 2)
    l = np.asarray(Image.fromarray(l0.astype(np.float32), 'F').resize(size, Image.BICUBIC), dtype=np.float64)
    # Softened far past the original's own blur, to one smooth wash like Gemini's: its thin streaks of light read as lines on the phone
    # once drawn cleanly (user, 2026-10-29), so they're blended into one smooth wash. Re-stretched after,
    # since blurring pulls the brightest light down.
    t = blur(l, 70)
    t = np.clip((t - t.min()) / (t.max() - t.min()), 0, 1)
    v = np.round(t * 65535).astype(np.uint32)
    out = np.zeros((size[1], size[0], 4), dtype=np.uint8)
    out[..., 0] = v >> 8
    out[..., 1] = v & 0xFF
    out[..., 3] = 255
    Image.fromarray(out, 'RGBA').save(OUT / 'sky-luma.png', optimize=True)


def ring_glow(m, box=2048):
    """
    The soft light under the Eclipse's ring, in a box 1.6 moon-widths wide centred on the moon. The
    ring's sharp lines are drawn natively (components/moon-ring.tsx): a baked line looked like a
    zoomed-in image on the phone (user, 2026-10-29).
    """
    r = box / 1.6 / 2
    o = box / 2
    img = Image.new('RGBA', (box, box), (0, 0, 0, 0))
    for colour, width, alpha, blur in (((255, 154, 60), 0.07, 0.55, 0.09), ((255, 180, 94), 0.035, 1, 0.035)):
        layer = Image.new('RGBA', (box, box), (0, 0, 0, 0))
        R = r * 0.985
        ImageDraw.Draw(layer).ellipse([o - R, o - R, o + R, o + R], outline=colour + (int(255 * alpha),), width=max(1, round(width * r)))
        img = Image.alpha_composite(img, layer.filter(ImageFilter.GaussianBlur(blur * r)))
    img.save(OUT / f"{m['id']}-ring.webp", 'WEBP', quality=96, method=6, alpha_quality=100)
    return f"{m['id']}-ring.webp"


def orb(m):
    """The Moonwell's four colours: given, or taken from the sky, halo and moon (as the lab does)."""
    if m.get('orb'):
        return m['orb']
    sky = [rgb(s) for s in m['sky']]
    moon = [rgb(s) for s in m['moon']]
    hexed = lambda c: '#%02X%02X%02X' % tuple(int(round(v)) for v in c)
    return [
        hexed(sky[1] * 0.45),
        hexed(sky[len(sky) - 2] if len(sky) >= 4 else sky[-1]),
        m['glow'],
        hexed(moon[-1] + (255 - moon[-1]) * 0.5),
    ]


def twin_offsets(m):
    """The twin's centre and size as shares of the main moon's width, from the lab's phone."""
    t = m['twin']
    size = BASE * m.get('scale', 1)
    cx, cy = W * m.get('cx', 0.5), PANEL - size * 0.36 + size / 2
    d = W * t['size']
    tx = W * t['x']
    ty = PANEL - d * 0.36 + d / 2 if t['y'] == 'rise' else PANEL * t['y']
    return round((tx - cx) / size, 4), round((ty - cy) / size, 4), round(d / size, 4)


def main():
    data = json.loads((HERE / 'moons.json').read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for old in [*OUT.glob('*.webp'), *OUT.glob('*.png')]:
        old.unlink()
    sky_img, moon_img = Image.open(SKY), Image.open(MOON)
    sky_luma()
    entries = []
    for m in data['moons']:
        e = {'id': m['id'], 'name': m['name'], 'kind': m['kind'], 'tag': m['tag'], 'glow': m['glow'],
             'glowOpacity': m.get('glowOpacity', 1), 'scale': m.get('scale', 1), 'cx': m.get('cx', 0.5), 'orb': orb(m),
             # The live sky's four colours (modules/moon-sky): the sky's stops, three-stop skies repeating their brightest.
             'skyColors': (m['sky'] + [m['sky'][-1]] * 4)[:4]}
        if not m.get('original'):
            e['sky'] = save(gradient_map(sky_img, m['sky'], scale=2, sigma=3), f"{m['id']}-sky.webp")
            px = gradient_map(moon_img, m['moon'], scale=2, sigma=1.2)
            if m.get('tint'):
                px = tint(px, m['tint'])
            if m.get('phase'):
                px = shadow(px, m['phase'])
            e['moon'] = save(px, f"{m['id']}-moon.webp")
            if m.get('ring'):
                e['ring'] = ring_glow(m)
                e['ringLine'] = {'kind': 'eclipse'}
            if m.get('saturn'):
                e['ringLine'] = {'kind': 'saturn', 'color': m['saturn']}
            if m.get('twin'):
                t = m['twin']
                e['twin'] = save(gradient_map(moon_img, t['moon'], scale=2, sigma=1.2), f"{m['id']}-twin.webp")
                x, y, size = twin_offsets(m)
                e['twinAt'] = {'x': x, 'y': y, 'size': size, 'glow': t['glow'], 'glowOpacity': t.get('glowOpacity', 0.6), 'front': bool(t.get('front'))}
        entries.append(e)

    req = lambda name: f"require('@/assets/moons/{name}')"
    lines = []
    for e in entries:
        art = ', '.join(f"{k}: {req(e[k])}" for k in ('sky', 'moon', 'ring', 'twin') if k in e)
        rest = {k: v for k, v in e.items() if k not in ('sky', 'moon', 'ring', 'twin')}
        body = json.dumps(rest, ensure_ascii=False)[1:-1]
        lines.append(f"  {{ {body}{', ' + art if art else ''} }},")
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(
        '// Generated by tools/moon-lab/bake.py from the moon lab (`npm run moons:bake`). Do not edit by hand.\n'
        "import type { MoonDef } from './moon-types';\n\n"
        f"export const LADDER: (string | null)[] = {json.dumps(data['ladder'])};\n\n"
        'export const MOONS: MoonDef[] = [\n' + '\n'.join(lines) + '\n];\n'
    )
    total = sum(f.stat().st_size for f in OUT.glob('*.webp'))
    print(f'baked {len(entries)} moons, {len(list(OUT.glob("*.webp")))} images, {total / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
