"""Rim glow for a rendered moon, and the web-size images for the compare page (2026-11-07 test).

  python3 tools/moon-render/glow.py eclipse [--strength 1.0]

The glow is made from the moon's own lit rim, not a stock halo: the render's light, blurred at
several widths and summed (a tight bright core and a long soft tail), kept mostly outside the disc,
so the colour shift along the rim (teal → magenta on the Eclipse) carries into the glow.
Writes to out/web/:
  <id>-4k.webp       the moon, 4096 px, transparent (disc = 0.8 of the width)
  <id>-1440.webp     the same at 1440 px
  <id>-glow.webp     glow on black, 2048 px with the disc 1024 px across (GLOW_PAD 2 like the app),
                     for additive (plus-lighter) blending
  <id>-glow-a.webp   the same glow as colour + straight alpha (screen baked in, as bake-drag.py does),
                     for an app that can't blend
Glow is a user-requested test only (2026-11-07); not in the app.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
mid = sys.argv[1]
strength = float(sys.argv[sys.argv.index('--strength') + 1]) if '--strength' in sys.argv else 1.0
web = HERE / 'out' / 'web'
web.mkdir(parents=True, exist_ok=True)

moon8 = Image.open(HERE / 'out' / f'{mid}.png').convert('RGBA')  # Pillow reads 16-bit RGBA PNG as 8-bit
moon8.save(web / f'{mid}-4k.webp', quality=95, method=6)
moon8.resize((1440, 1440), Image.LANCZOS).save(web / f'{mid}-1440.webp', quality=95, method=6)

# Glow canvas: 2048 px, disc 1024 px, centred. The render's disc is 0.8 of its width.
G, DISC = 2048, 1024
side = round(DISC / 0.8)
small = moon8.resize((side, side), Image.LANCZOS)
canvas = Image.new('RGBA', (G, G), (0, 0, 0, 0))
canvas.paste(small, ((G - side) // 2, (G - side) // 2))
a = np.asarray(canvas, dtype=np.float32) / 255
lin = np.where(a[..., :3] <= 0.04045, a[..., :3] / 12.92, ((a[..., :3] + 0.055) / 1.055) ** 2.4)
light = lin * a[..., 3:4]  # premultiplied light, linear


FY = np.fft.fftfreq(G)[:, None]
FX = np.fft.rfftfreq(G)[None, :]
F = np.fft.rfft2(light, axes=(0, 1))


def blur(sigma):
    """Gaussian blur in the frequency domain (the canvas edges are black, so wrap-around is harmless)."""
    k = np.exp(-2 * (np.pi * sigma) ** 2 * (FX ** 2 + FY ** 2))[..., None]
    return np.fft.irfft2(F * k, s=(G, G), axes=(0, 1)).astype(np.float32)


glow = sum(w * blur(s) for s, w in ((4, 0.55), (14, 0.45), (45, 0.35), (130, 0.22)))
glow *= strength * 1.6
# Mostly outside the disc: the moon's dark body hides what's behind it, a little spills over the edge.
yy, xx = np.mgrid[0:G, 0:G]
d = np.hypot(xx - G / 2 + 0.5, yy - G / 2 + 0.5) / (DISC / 2)
inside = np.clip((1.0 - d) / 0.035, 0, 1)[..., None]
glow *= 1 - 0.9 * inside
glow = np.maximum(glow, 0)  # the FFT leaves tiny negatives
glow = glow / (1 + glow)  # soft shoulder, no clipped highlights
srgb = np.where(glow <= 0.0031308, glow * 12.92, 1.055 * np.power(glow, 1 / 2.4) - 0.055)
rng = np.random.default_rng(7)
dith = (rng.random(srgb.shape, dtype=np.float32) - 0.5) / 255  # breaks 8-bit banding in the long tail
add8 = np.clip((srgb + dith) * 255 + 0.5, 0, 255).astype(np.uint8)
Image.fromarray(add8, 'RGB').save(web / f'{mid}-glow.webp', quality=96, method=6)

# Straight alpha with screen baked in: alpha = brightest channel, colour = glow / alpha.
al = srgb.max(-1, keepdims=True)
col = np.where(al > 1e-5, srgb / np.maximum(al, 1e-5), 0)
rgba = np.concatenate([col, al], -1)
rgba8 = np.clip((rgba + dith[..., :1]) * 255 + 0.5, 0, 255).astype(np.uint8)
Image.fromarray(rgba8, 'RGBA').save(web / f'{mid}-glow-a.webp', quality=96, method=6)
print('wrote', mid)
