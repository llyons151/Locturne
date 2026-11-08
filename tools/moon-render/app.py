"""App-size images of the test renders, for the dev switch (Developer → Moon render test), 2026-11-07.

  python3 tools/moon-render/app.py

For eclipse/crescent/harvest × realistic/soft/porcelain: out/<id>[-style].png → assets/moons/render-test/
<id>-<style>.webp, laid out like the app's moon images (1440 px, the disc 2/3 of the width, FROST_PAD 1.5),
and <id>-<style>-frost.webp, the same seen through the sky's frosted glass: blurred as much as the
current moons' edge (sigma ≈ 1.35% of the disc), in premultiplied alpha so no dark fringe.
"""

from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
DEST = HERE.parents[1] / 'assets' / 'moons' / 'render-test'
DEST.mkdir(parents=True, exist_ok=True)
SIZE, DISC = 1440, 960
SIGMA = DISC * 0.0135


def blur(x, sigma):
    """Gaussian blur in the frequency domain; the canvas edge is transparent, so wrap-around is harmless."""
    fy = np.fft.fftfreq(x.shape[0])[:, None]
    fx = np.fft.rfftfreq(x.shape[1])[None, :]
    k = np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))[..., None]
    return np.fft.irfft2(np.fft.rfft2(x, axes=(0, 1)) * k, s=x.shape[:2], axes=(0, 1))


for mid in ('eclipse', 'crescent', 'harvest'):
    for style in ('real', 'soft', 'porcelain'):
        src = HERE / 'out' / (f'{mid}.png' if style == 'real' else f'{mid}-{style}.png')
        side = round(DISC / 0.8)  # the render's disc is 0.8 of its width
        im = Image.open(src).convert('RGBA').resize((side, side), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(im, ((SIZE - side) // 2, (SIZE - side) // 2))
        canvas.save(DEST / f'{mid}-{style}.webp', quality=92, method=6)
        a = np.asarray(canvas, dtype=np.float64) / 255
        pre = np.concatenate([a[..., :3] * a[..., 3:], a[..., 3:]], -1)
        b = np.clip(blur(pre, SIGMA), 0, 1)
        al = b[..., 3:]
        rgb = np.where(al > 1e-4, b[..., :3] / np.maximum(al, 1e-4), 0)
        out = np.clip(np.concatenate([rgb, al], -1) * 255 + 0.5, 0, 255).astype(np.uint8)
        Image.fromarray(out, 'RGBA').save(DEST / f'{mid}-{style}-frost.webp', quality=92, method=6)
        print('wrote', mid, style)
