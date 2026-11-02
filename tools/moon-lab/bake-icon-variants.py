"""Bakes three takes on the collection icons for the moon lab (user, 2026-11-02: the icons look like
cutout PNGs). Writes tools/moon-lab/icon-variants/<take>/<id>.webp and icon-variants/moons.json;
open http://localhost:5178/icons.html (`npm run moon-lab`) to compare them with today's icons.

  sphere  the same art, shaded as a ball: darker to its edge, lit from the top left, a soft outline,
          a pale line on the lit edge; clouds lighter on top, a soft neutral shadow on the moon below them
  sky     the sphere icon on a tile of the moon's own night (the gradient is drawn by the page)
  flat    the moon cut to three flat tones, to match the flat clouds

Nothing here touches the app's icons (bake-icons.py does that).
"""

import importlib.util
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('bake_icons', HERE / 'bake-icons.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

SIZE, OUT, CX, CY, R, ART = base.SIZE, base.OUT, base.CX, base.CY, base.R, base.ART
DEST = HERE / 'icon-variants'
# Light from the top left, toward the viewer.
LIGHT = np.array([-0.5, -0.6, 0.62])
LIGHT = LIGHT / np.linalg.norm(LIGHT)


def hex_rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)


def blur(a, r):
    img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(r))
    return np.asarray(img).astype(np.float64) / 255


def masks():
    """The night icon's moon and clouds, as in bake-icons.py, plus each cloud on its own."""
    icon = np.asarray(Image.open(base.SOURCE).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)).astype(np.float64)
    alpha = icon[..., 3] / 255
    solid = Image.fromarray(((alpha > 0.5) * 255).astype(np.uint8), 'L').copy()
    ImageDraw.floodfill(solid, (CX, round(CY)), 128)
    moon = (np.asarray(solid) == 128).astype(np.uint8) * 255
    moon = np.asarray(Image.fromarray(moon, 'L').filter(ImageFilter.MaxFilter(3))).astype(np.float64) / 255
    in_disc = alpha * moon
    clouds = np.clip(alpha - in_disc, 0, 1)
    # Each cloud's own top and bottom, for its shading.
    hard = Image.fromarray(((clouds > 0.5) * 255).astype(np.uint8), 'L').copy()
    tops = np.zeros((SIZE, SIZE))
    label = 1
    while True:
        arr = np.asarray(hard)
        ys, xs = np.nonzero(arr == 255)
        if len(ys) == 0:
            break
        ImageDraw.floodfill(hard, (int(xs[0]), int(ys[0])), label)
        part = np.asarray(hard) == label
        py = np.nonzero(part)[0]
        label += 1
        if len(py) < 200:
            continue
        t = (np.arange(SIZE)[:, None] - py.min()) / max(py.max() - py.min(), 1)
        grow = np.asarray(Image.fromarray((part * 255).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(5))) > 0
        tops = np.where(grow, np.clip(t, 0, 1) * np.ones((1, SIZE)), tops)
    return in_disc, clouds, tops


def art_disc(path):
    art = Image.open(path).convert('RGBA')
    w = art.width
    art = art.crop((round(w * ART[0]), round(w * ART[0]), round(w * ART[1]), round(w * ART[1])))
    d = round(R * 2)
    art = np.asarray(art.resize((d, d), Image.LANCZOS)).astype(np.float64)
    layer = np.zeros((SIZE, SIZE, 4))
    x0, y0 = round(CX - R), round(CY - R)
    layer[y0:y0 + d, x0:x0 + d] = art
    return layer


def save(rgb, a, path):
    out = np.dstack([rgb, np.clip(a, 0, 1) * 255]).round().clip(0, 255).astype(np.uint8)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, 'RGBA').resize((OUT, OUT), Image.LANCZOS).save(path, quality=90, method=3)


def compose(moon_rgb, moon_a, cloud_rgb, cloud_a):
    """Clouds over the moon (premultiplied over)."""
    a = cloud_a + moon_a * (1 - cloud_a)
    rgb = (cloud_rgb * cloud_a[..., None] + moon_rgb * (moon_a * (1 - cloud_a))[..., None]) / np.maximum(a, 1e-6)[..., None]
    return rgb, a


def main():
    in_disc, clouds, tops = masks()
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float64)
    nx, ny = (xx - CX) / R, (yy - CY) / R
    d2 = nx ** 2 + ny ** 2
    nz = np.sqrt(np.clip(1 - d2, 0, 1))
    lambert = np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0, 1)
    # Ambient plus light, then a little limb darkening so the edge rolls away.
    shade = (0.6 + 0.52 * lambert ** 0.9) * (0.8 + 0.2 * nz ** 0.5)
    dist = np.sqrt(d2)
    lxy = LIGHT[:2] / np.linalg.norm(LIGHT[:2])
    lit_side = np.clip((nx * lxy[0] + ny * lxy[1]) / np.maximum(dist, 1e-6), 0, 1)
    rim = np.clip((dist - 0.9) / 0.07, 0, 1) * np.clip((1.0 - dist) / 0.02 + 1, 0, 1) * lit_side ** 1.5
    soft_disc = blur(in_disc, 1.3)
    # Under the clouds: a soft dark band on the moon just above where they cover it.
    occlusion = np.clip(blur(clouds, 9) * 1.4 - clouds, 0, 1)

    data = []
    for id_, light, art_path, ringed in base.moons():
        row = next((ln for ln in base.DATA.read_text().splitlines() if f'"id": "{id_}"' in ln), '')
        meta = {k: json.loads(m.group(1)) for k in ('orb', 'skyColors', 'name') if (m := re.search(rf'"{k}": (\[[^\]]+\]|"[^"]*")', row))}
        data.append({"id": id_, **meta})
        layer = art_disc(art_path)
        art_rgb, art_a = layer[..., :3], layer[..., 3] / 255
        lightc = hex_rgb(light)
        orb = [hex_rgb(c) for c in meta['orb']]

        # Sphere.
        rgb = art_rgb * shade[..., None]
        rgb = rgb * (1 - 0.55 * occlusion[..., None])
        rgb = rgb * (1 - 0.65 * rim[..., None]) + lightc * (0.65 * rim[..., None])
        moon_a = soft_disc * art_a
        cloud_rgb = lightc * (1 - 0.2 * tops[..., None]) + orb[2] * (0.08 * tops[..., None])
        out_rgb, out_a = compose(rgb, moon_a, cloud_rgb, clouds)
        save(out_rgb, out_a, DEST / 'sphere' / f'{id_}.webp')

        # Flat: three tones from the art's own light and dark, smoothed into blobs.
        lum = (art_rgb @ np.array([0.299, 0.587, 0.114]))
        lum = blur(lum / 255, 3.5)
        inside = in_disc > 0.5
        lo, hi = np.percentile(lum[inside], [30, 78])
        mean = art_rgb[inside].mean(axis=0)
        dark = mean * 0.62 + orb[1] * 0.38
        lite = mean * 0.55 + lightc * 0.45
        tone = np.where(lum[..., None] < lo, dark, np.where(lum[..., None] > hi, lite, mean))
        out_rgb, out_a = compose(tone, in_disc * (art_a > 0.05), np.broadcast_to(lightc, tone.shape), clouds)
        save(out_rgb, out_a, DEST / 'flat' / f'{id_}.webp')

    (DEST / 'moons.json').write_text(json.dumps(data, indent=1))
    print(f'{len(data)} moons x 2 takes -> {DEST}')


if __name__ == '__main__':
    main()
