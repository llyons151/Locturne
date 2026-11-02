"""Bakes the collection's moon icons (user, 2026-11-01): the night icon (a moon behind two clouds,
assets/moons/icons/night.png) once per moon, its disc that moon's art cut to three flat tones (user,
2026-11-02: the photo disc looked like a cutout; picked over a shaded take in the moon lab's
icons.html) and its clouds in the moon's lightest colour. The Eclipse is a flat amber moon with a
dark disc sliding across it, leaving a crescent (a black disc in a ring read as "just a circle"). Writes assets/moons/icons/<id>.webp and
src/features/moons/moon-icons.ts. Run `npm run moons:icons` after `npm run moons:bake`;
`--only id,id` re-bakes just those icons.
"""

import argparse
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
ICONS = REPO / 'assets' / 'moons' / 'icons'
SOURCE = ICONS / 'night.png'
DATA = REPO / 'src' / 'features' / 'moons' / 'moon-data.ts'
OUT_TS = REPO / 'src' / 'features' / 'moons' / 'moon-icons.ts'
DEFAULT_MOON = REPO / 'assets' / 'onboarding' / 'moon-frosted.png'

SIZE = 512
# Written smaller: a tile is at most ~350px on a phone.
OUT = 384
# The icon's disc, measured from night.png (its widest row and its top).
CX, CY, R = 262, 238.5, 163.5
# The moon art's solid disc, as a share of its image (the rest is the frosted edge).
ART = (0.18, 0.82)


def moons():
    """Each moon's id, orb colours (dark to light), moon image and whether it's the Eclipse, from moon-data.ts."""
    for line in DATA.read_text().splitlines():
        m = re.search(r'\{ "id": "([^"]+)".*?"orb": (\[[^\]]+\])', line)
        if not m:
            continue
        art = re.search(r"moon: require\('@/assets/moons/([^']+)'\)", line)
        path = (REPO / 'assets' / 'moons' / art.group(1)) if art else DEFAULT_MOON
        yield m.group(1), json.loads(m.group(2)), path, '"kind": "eclipse"' in line


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='', help='comma-separated moon ids to re-bake; the rest keep their icons')
    only = {s for s in ap.parse_args().only.split(',') if s}
    icon = np.asarray(Image.open(SOURCE).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)).astype(np.float64)
    alpha = icon[..., 3] / 255
    # The moon is the shape joined to the disc's centre: the clouds are cut off from it by the icon's gap.
    solid = Image.fromarray(((alpha > 0.5) * 255).astype(np.uint8), 'L').copy()
    ImageDraw.floodfill(solid, (CX, round(CY)), 128)
    moon = (np.asarray(solid) == 128).astype(np.uint8) * 255
    moon = np.asarray(Image.fromarray(moon, 'L').filter(ImageFilter.MaxFilter(3))).astype(np.float64) / 255
    in_disc = alpha * moon
    clouds = np.clip(alpha - in_disc, 0, 1)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float64)
    # The Eclipse's shadow: a disc a little smaller than the moon, down and left of it, so a lit crescent
    # shows along the top right, above the clouds. Anti-aliased over about a pixel.
    shadow = np.clip(R * 0.97 - np.hypot(xx - (CX - R * 0.34), yy - (CY + R * 0.2)) + 0.5, 0, 1)

    ids = []
    for id_, orb, art_path, ringed in moons():
        if only and id_ not in only and (ICONS / f'{id_}.webp').exists():
            ids.append(id_)
            continue
        art = Image.open(art_path).convert('RGBA')
        w = art.width
        art = art.crop((round(w * ART[0]), round(w * ART[0]), round(w * ART[1]), round(w * ART[1])))
        d = round(R * 2)
        art = np.asarray(art.resize((d, d), Image.LANCZOS)).astype(np.float64)
        layer = np.zeros((SIZE, SIZE, 4))
        x0, y0 = round(CX - R), round(CY - R)
        layer[y0:y0 + d, x0:x0 + d] = art
        hexes = [np.array([int(c[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64) for c in orb]
        cloud_rgb = hexes[3]
        art_rgb = layer[..., :3]
        if ringed:
            # The Eclipse's own art is near black: light the moon in its amber and gold instead.
            art_rgb = np.clip(art_rgb * 6, 0, 255)
        # Three flat tones from the art's light and dark, smoothed into soft-edged blobs first.
        lum = art_rgb @ np.array([0.299, 0.587, 0.114]) / 255
        lum = np.asarray(Image.fromarray((lum * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(3.5))).astype(np.float64) / 255
        inside = in_disc > 0.5
        lo, hi = np.percentile(lum[inside], [30, 78])
        if ringed:
            mean, dark, lite = hexes[2], hexes[2] * 0.6 + hexes[1] * 0.4, hexes[2] * 0.45 + hexes[3] * 0.55
        else:
            mean = art_rgb[inside].mean(axis=0)
            dark, lite = mean * 0.62 + hexes[1] * 0.38, mean * 0.55 + cloud_rgb * 0.45
        moon_rgb = np.where(lum[..., None] < lo, dark, np.where(lum[..., None] > hi, lite, mean))
        if ringed:
            night = np.array([20, 12, 9], dtype=np.float64)
            moon_rgb = moon_rgb * (1 - shadow[..., None]) + night * shadow[..., None]
        moon_a = in_disc * (layer[..., 3] > 12)
        a = moon_a + clouds
        rgb = (moon_rgb * moon_a[..., None] + cloud_rgb * clouds[..., None]) / np.maximum(a, 1e-6)[..., None]
        out = np.dstack([rgb, np.clip(a, 0, 1) * 255]).round().clip(0, 255).astype(np.uint8)
        Image.fromarray(out, 'RGBA').resize((OUT, OUT), Image.LANCZOS).save(ICONS / f'{id_}.webp', quality=88, method=6)
        ids.append(id_)

    lines = [
        '// Generated by tools/moon-lab/bake-icons.py (`npm run moons:icons`). Do not edit by hand.',
        "import type { ImageSourcePropType } from 'react-native';",
        '',
        '/** The night icon, for a moon not yet yours (tinted grey where it shows). */',
        "export const NIGHT_ICON: ImageSourcePropType = require('@/assets/moons/icons/night.png');",
        '',
        '/** Each moon\'s icon: the night icon, its disc that moon and its clouds that moon\'s lightest colour. */',
        'export const MOON_ICONS: Record<string, ImageSourcePropType> = {',
        *[f"  '{i}': require('@/assets/moons/icons/{i}.webp')," for i in ids],
        '};',
        '',
    ]
    OUT_TS.write_text('\n'.join(lines))
    print(f'{len(ids)} icons')


if __name__ == '__main__':
    main()
