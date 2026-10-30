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


def gradient_map(img, stops):
    a = np.asarray(img.convert('RGBA'), dtype=np.float64)
    l = lum(a)
    solid = a[..., 3] >= 128
    lo, hi = l[solid].min(), l[solid].max()
    out = a.copy()
    out[..., :3] = ramp(stops, (l - lo) / ((hi - lo) or 1))
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


def save(px, name, size=None):
    img = Image.fromarray(np.clip(px, 0, 255).astype(np.uint8), 'RGBA')
    if size:
        img = img.resize(size, Image.LANCZOS)
    img.save(OUT / name, 'WEBP', quality=86, method=6)
    return name


def ring_image(m, px_size=720):
    """The Eclipse's ring of fire, or a Saturn ring, in a box 1.6 moon-widths wide centred on the moon."""
    box = px_size
    r = box / 1.6 / 2
    o = box / 2
    img = Image.new('RGBA', (box, box), (0, 0, 0, 0))
    if m.get('ring'):
        def stroke(colour, width, alpha, blur):
            layer = Image.new('RGBA', (box, box), (0, 0, 0, 0))
            R = r * 0.985
            ImageDraw.Draw(layer).ellipse([o - R, o - R, o + R, o + R], outline=colour + (int(255 * alpha),), width=max(1, round(width)))
            return layer.filter(ImageFilter.GaussianBlur(blur)) if blur else layer
        for layer in (stroke((255, 154, 60), r * 0.07, 0.55, r * 0.09), stroke((255, 180, 94), r * 0.035, 1, r * 0.035), stroke((255, 240, 208), r * 0.012, 1, 0)):
            img = Image.alpha_composite(img, layer)
    else:
        # Drawn flat at 4x, rotated, then scaled down: a crisp ring with no glow.
        big = box * 4
        layer = Image.new('RGBA', (big, big), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        colour = tuple(int(v) for v in rgb(m['saturn']))
        for rx, ry, w, a in ((1.45, 0.85, 0.045, 0.85), (1.33, 0.76, 0.018, 0.5)):
            R = r * 4
            d.ellipse([big / 2 - rx * R, big / 2 - ry * R, big / 2 + rx * R, big / 2 + ry * R], outline=colour + (int(255 * a),), width=max(1, round(w * R)))
        img = layer.rotate(16, resample=Image.BICUBIC).resize((box, box), Image.LANCZOS)
    img.save(OUT / f"{m['id']}-ring.webp", 'WEBP', quality=90, method=6)
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
    for old in OUT.glob('*.webp'):
        old.unlink()
    sky_img, moon_img = Image.open(SKY), Image.open(MOON)
    entries = []
    for m in data['moons']:
        e = {'id': m['id'], 'name': m['name'], 'kind': m['kind'], 'tag': m['tag'], 'glow': m['glow'],
             'glowOpacity': m.get('glowOpacity', 1), 'scale': m.get('scale', 1), 'cx': m.get('cx', 0.5), 'orb': orb(m)}
        if not m.get('original'):
            e['sky'] = save(gradient_map(sky_img, m['sky']), f"{m['id']}-sky.webp")
            px = gradient_map(moon_img, m['moon'])
            if m.get('tint'):
                px = tint(px, m['tint'])
            if m.get('phase'):
                px = shadow(px, m['phase'])
            e['moon'] = save(px, f"{m['id']}-moon.webp")
            if m.get('ring') or m.get('saturn'):
                e['ring'] = ring_image(m)
            if m.get('twin'):
                t = m['twin']
                e['twin'] = save(gradient_map(moon_img, t['moon']), f"{m['id']}-twin.webp", (360, 360))
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
