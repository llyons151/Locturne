"""
The Sleep orb's four colours for a moon, taken from the moon's own baked art (user, 2026-11-07: "make sure the orbs
represent the moon colors as best as possible"). The orb is the theme's icon in the moon wheel, so it should read as
that moon at a glance.

C1..C3 are the moon disc's three main colours (k-means on its opaque pixels, ordered dark to light), so tinted moons
(Opal, Prism, Galaxy) keep their hues instead of averaging to grey. C0, the orb's deep water, is the moon's darkest
colour pulled down into its sky, so the orb still has depth and sits in the theme.
"""
import numpy as np
from PIL import Image


def _lum(c):
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def _kmeans(px, k=3, iters=24, seed=7):
    rng = np.random.default_rng(seed)
    # Start from luminance quantiles so the result is stable from bake to bake.
    order = np.argsort(_lum(px))
    centres = px[order[[int(len(px) * q) for q in (0.15, 0.5, 0.9)]]].astype(np.float64)
    for _ in range(iters):
        d = ((px[:, None, :] - centres[None, :, :]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            pts = px[lab == j]
            centres[j] = pts.mean(0) if len(pts) else px[rng.integers(len(px))]
    counts = np.bincount(lab, minlength=k)
    return centres, counts


def _saturate(c, k):
    """Pushes a colour away from its own grey: the shader's glass and highlights wash colour out a little."""
    g = _lum(c[None, :])[0]
    return np.clip(g + (c - g) * k, 0, 255)


def hexed(c):
    return '#%02X%02X%02X' % tuple(int(round(min(255, max(0, v)))) for v in c)


def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def orb_from_art(moon_path, sky, tint=None):
    """`moon_path`: the baked moon (RGBA, transparent round it). `sky`: the moon's sky stops, dark to light (hex).
    `tint`: a multi-colour wash over the moon (Prism's rainbow): its stops are blended in, or they average away to one hue."""
    a = np.asarray(Image.open(moon_path).convert('RGBA'), dtype=np.float64)
    if a.shape[0] > 360:
        a = np.asarray(Image.open(moon_path).convert('RGBA').resize((360, 360), Image.LANCZOS), dtype=np.float64)
    px = a[a[..., 3] > 230][:, :3]
    # Only the lit part of the disc: a phase moon's shadow side would otherwise turn its orb black.
    # Relative to the moon's own light, so a dark moon (New Moon, Ashen) still keeps its darkness.
    l = _lum(px)
    px = px[l >= np.percentile(l, 95) * 0.38]
    l = _lum(px)
    centres, _ = _kmeans(px)
    centres = centres[np.argsort(_lum(centres))]
    c1, c2 = centres[0], centres[1]
    # The brightest: the moon's own highlights (its top few per cent), a little toward white as the orb's glass catches the light.
    top = px[l >= np.percentile(l, 94)].mean(0)
    c3 = top + (255 - top) * 0.22
    c1, c2, c3 = (_saturate(c, 1.15) for c in (c1, c2, c3))
    stops = (tint or {}).get('stops') or []
    if len(stops) >= 3:
        # Three stops spread across the wash, ordered dark to light like the orb's colours.
        pick = sorted((rgb(stops[i]) for i in (0, len(stops) // 2, len(stops) - 1)), key=lambda c: _lum(c[None, :])[0])
        amt = tint.get('amount', 0.5)
        c1, c2, c3 = (c + (t - c) * amt for c, t in zip((c1, c2, c3), pick))
    # The deep water: the moon's darkest colour, well down, blended into the sky's dark middle.
    s = rgb(sky[1]) if len(sky) > 1 else rgb(sky[0])
    c0 = c1 * 0.28 * 0.6 + s * 0.4
    return [hexed(c0), hexed(c1), hexed(c2), hexed(c3)]
