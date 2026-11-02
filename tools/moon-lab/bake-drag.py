#!/usr/bin/env python3
"""
Bakes each moon's payoff drag: the soft light the moon leaves under it as it rises on the
morning payoff (user, 2026-11-02, tuned in the "Payoff Moon Drag" artifact). One image per moon,
from the moon's own picture, so every moon drags in its own colours, drawn under the moon by
NightSky (components/night-sky.tsx) and faded in by the payoff (features/wake/payoff-screen.tsx).

It rebuilds the artifact's three layers exactly, screen-blended as there:
  - the spread: a wide copy of the moon, heavily blurred, faded out by a circle;
  - the halo: a copy a little bigger than the moon, lightly blurred, filling its edge;
  - the drag (Melt): one copy stretched down, blurred, faded out by an ellipse.
The light is stored as colour + alpha (alpha = its brightest channel), so drawn normally over a dark
sky it adds light much as screen does, with no blend mode needed on iPhone or the web.

Run: python3 tools/moon-lab/bake-drag.py   (writes assets/moons/<id>-drag.webp and
src/features/moons/moon-drag.ts). Change the settings below and run it again to retune.
"""
import json
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]

# The artifact's dials (user, 2026-11-02).
SETTINGS = {"style": "melt", "len": 407, "blur": 72, "str": 39, "spread": 82, "pos": 115}

# The artifact's geometry, in points on a 393-wide iPhone: a 181pt disc in a 272pt frosted box.
DISC_R = 90.5
BOX = 272.0
TRAIL_PAD = 150.0
AURA_PAD = 260.0
# The canvas, round the moon's centre: as far as any layer reaches.
LEFT = TOP = BOX / 2 + AURA_PAD  # 396: the spread's circle
BOTTOM = SETTINGS["pos"] - BOX / 2 - TRAIL_PAD + BOX + SETTINGS["len"] + 2 * TRAIL_PAD  # the drag's foot
W, H = int(2 * LEFT), int(TOP + BOTTOM)
CX, CY = LEFT, TOP
OUT_SCALE = 0.5  # it's all blur: half the points is plenty


def load(path: Path) -> np.ndarray:
    """The moon's picture as premultiplied RGBA floats, sized to the 272pt box."""
    im = Image.open(path).convert("RGBA").resize((int(BOX), int(BOX)), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255
    a[..., :3] *= a[..., 3:4]
    return a


def place(img: np.ndarray, sx: float, sy: float, ox: float, oy: float, at_x: float, at_y: float) -> np.ndarray:
    """`img` (a BOX square) scaled by sx, sy about its point (ox, oy), that point put at (at_x, at_y)."""
    h, w = img.shape[:2]
    nw, nh = max(1, round(w * sx)), max(1, round(h * sy))
    chans = [Image.fromarray(img[..., c]).resize((nw, nh), Image.BILINEAR) for c in range(4)]
    scaled = np.stack([np.asarray(c, dtype=np.float32) for c in chans], -1)
    out = np.zeros((H, W, 4), np.float32)
    x0, y0 = round(at_x - ox * sx), round(at_y - oy * sy)
    xs, ys = max(0, x0), max(0, y0)
    xe, ye = min(W, x0 + nw), min(H, y0 + nh)
    if xe > xs and ye > ys:
        out[ys:ye, xs:xe] = scaled[ys - y0 : ye - y0, xs - x0 : xe - x0]
    return out


def blur(img: np.ndarray, sigma: float) -> np.ndarray:
    """CSS blur(): a Gaussian with this standard deviation, per premultiplied channel, transparent past the edges."""
    n = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-n, n + 1) / sigma) ** 2)
    k /= k.sum()

    def along(a: np.ndarray, axis: int) -> np.ndarray:
        size = a.shape[axis] + 2 * n
        fa = np.fft.rfft(a, size, axis=axis)
        shape = [1] * a.ndim
        shape[axis] = -1
        fk = np.fft.rfft(k, size).reshape(shape)
        full = np.fft.irfft(fa * fk, size, axis=axis)
        return np.take(full, np.arange(n, n + a.shape[axis]), axis=axis)

    return along(along(img, 0), 1).astype(np.float32)


def radial(cx: float, cy: float, rx: float, ry: float, stops: list[tuple[float, float]]) -> np.ndarray:
    """A CSS radial-gradient mask (alpha only): an ellipse at (cx, cy), stops as (offset, alpha)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2)
    offs, alphas = zip(*stops)
    return np.interp(d, offs, alphas).astype(np.float32)


def box_mask(x0: float, y0: float, x1: float, y1: float) -> np.ndarray:
    m = np.zeros((H, W), np.float32)
    m[max(0, int(y0)) : min(H, int(y1)), max(0, int(x0)) : min(W, int(x1))] = 1
    return m


def drag(moon: np.ndarray) -> np.ndarray:
    s = SETTINGS
    sp = s["spread"] / 100
    half = BOX / 2
    layers = []
    # The spread: the moon scaled from its middle, blurred, in a circle 792pt across.
    k = 1.5 + 1.3 * sp
    # In the artifact the blur is drawn before the copy is scaled, so it grows with it.
    aura = blur(place(moon, k, k, half, half, CX, CY), (30 + 40 * sp) * k)
    aura *= radial(CX, CY, LEFT, LEFT, [(0, 1), (0.2, 1), (0.5, 0.6), (0.75, 0.2), (1, 0)])[..., None]
    layers.append(aura * 0.75 * sp)
    # The halo: 1.22 times the moon, blurred 14.
    layers.append(blur(place(moon, 1.22, 1.22, half, half, CX, CY), 14 * 1.22) * 0.75)
    # The drag (Melt): stretched down from 30% of the way into the box, `pos` lower, blurred, then the ellipse.
    if s["style"] == "melt":
        sx, sy = 1.1 + s["len"] / 900, 1 + s["len"] / 200
        oy = 0.3 * BOX
        trail = place(moon, sx, sy, half, oy, CX, CY - half + oy + s["pos"]) * 0.9
    else:
        raise SystemExit("only the Melt drag is baked")
    trail = blur(trail, s["blur"])
    tcy = CY + s["pos"]
    rx = half + TRAIL_PAD * 0.75 + s["len"] * 0.12
    ry = half + s["len"] + TRAIL_PAD * 0.5
    mask = radial(CX, tcy, rx, ry, [(0, 1), (0.38, 0.7), (0.68, 0.25), (1, 0)])
    # The artifact's trail box clips its mask.
    top = tcy - half - TRAIL_PAD
    mask *= box_mask(CX - half - TRAIL_PAD, top, CX + half + TRAIL_PAD, top + BOX + s["len"] + 2 * TRAIL_PAD)
    layers.append(trail * mask[..., None] * (s["str"] / 100))
    # Screen, as the artifact: light over black, each layer's colour premultiplied.
    light = np.zeros((H, W, 3), np.float32)
    for layer in layers:
        light = 1 - (1 - light) * (1 - np.clip(layer[..., :3], 0, 1))
    return light


def save(light: np.ndarray, out: Path) -> None:
    # Colour + alpha: alpha is the light's brightest channel, the colour what's left once it's taken out.
    a = light.max(-1, keepdims=True)
    rgb = np.where(a > 1e-4, light / np.maximum(a, 1e-4), 0)
    rgba = np.concatenate([rgb, a], -1)
    im = Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    im = im.resize((round(W * OUT_SCALE), round(H * OUT_SCALE)), Image.LANCZOS)
    im.save(out, "WEBP", quality=82, method=6)


def moon_ids() -> list[str]:
    data = (ROOT / "src/features/moons/moon-data.ts").read_text()
    return re.findall(r'^  \{ "id": "([^"]+)"', data, re.M)


def main() -> None:
    sources = {"moonlight": ROOT / "assets/onboarding/moon-frosted.png"}
    for mid in moon_ids():
        path = ROOT / f"assets/moons/{mid}-moon.webp"
        if path.exists():
            sources[mid] = path
    for mid, path in sources.items():
        save(drag(load(path)), ROOT / f"assets/moons/{mid}-drag.webp")
        print("baked", mid)
    r = DISC_R
    lines = [
        "// Generated by tools/moon-lab/bake-drag.py (the payoff's moon drag). Do not edit by hand.",
        "",
        "/** Each moon's drag: the light it leaves under it on the morning payoff. */",
        "export const MOON_DRAG: Record<string, number> = {",
        *[f"  {json.dumps(mid)}: require('@/assets/moons/{mid}-drag.webp')," for mid in sources],
        "};",
        "",
        "/** The drag image's size and where the moon's centre sits in it, in moon radii. */",
        f"export const DRAG_BOX = {{ width: {W / r:.4f}, height: {H / r:.4f}, cx: {CX / r:.4f}, cy: {CY / r:.4f} }};",
        "",
        f"/** The settings it was baked with (the artifact's dials). */",
        f"export const DRAG_SETTINGS = {json.dumps(SETTINGS)};",
        "",
    ]
    (ROOT / "src/features/moons/moon-drag.ts").write_text("\n".join(lines))
    print(f"canvas {W}x{H}pt, {len(sources)} moons")


if __name__ == "__main__":
    main()
