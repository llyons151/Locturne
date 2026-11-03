# 3D phone renders

Real 3D iPhone 17 Pro rendered in Blender (Cycles, GPU), transparent background, any angle, 4K (2160×3840).

**Model credit (required, CC Attribution 4.0):** "iPhone 17 Pro" by Ranguel,
https://sketchfab.com/3d-models/iphone-17-pro-4541aa8a28324b33a2baaf81d263aaec, a fan-made model, not Apple's.
Studio lighting: "Studio Small 09" from Poly Haven (CC0).

Not in git (big / third-party): `source/`, `textures/`, `grid/`, `out/`, `studio.hdr`. Unzip the Sketchfab download
here to restore. Blender 4.5 LTS lives at `~/.local/share/blender/blender-4.5.15-linux-x64/blender`.

## Every angle, any screenshot (fast)

`grid/` holds every angle rendered once with a black screen, plus a screen mask and the screen's corners
(`grid.json`). `compose.py` drops any screenshot on in under a second, trimmed to the phone:

    ./compose.py list
    ./compose.py yawm030_pitchp15 ../shots/08-home.png out/home.png
    ./compose.py yawp045_pitch000 ../shots/01-shield.png out/shield.png --roll 12

Angles: yaw −75…75 and pitch −30…30 in 15° steps, plus back views (yaw 150…210). `m` = minus, `p` = plus.
- **yaw**: turns the phone around its vertical axis (+ = you see more of its left edge)
- **pitch**: leans it (+ = top tips away from you)
- **roll**: spin in the picture plane, free at compose time with `--roll`

Back views (yaw 150–210) have no screen, so they are used as they are.

## One exact angle (slow, about 1–2 min at 4K)

    B=~/.local/share/blender/blender-4.5.15-linux-x64/blender
    $B -b --python render.py -- --shot ../shots/08-home.png --yaw 22 --pitch -8 --out out/x.png
    $B -b --python render.py -- --grid --samples 32 --outdir grid        # (re)build the grid; skips finished angles

Options: `--size` (long side, default 3840), `--samples` (default 64), `--glare` (screen sheen, default 0.05),
`--off` (screen off).

## What was fixed on the model
- the screen UVs are mirrored, so the screenshot is flipped back
- the cover glass was a 78% black tint (screen looked dim), now clear; the screenshot is pure emission, so colours
  come out exactly as captured (Standard view transform)
- the Dynamic Island was see-through (selfie camera showed), now a solid black pill
- studio-window reflections on the screen looked messy, replaced by a soft overhead sheen that follows the angle

## In the store-shots tool

Two switches in the header (saved to `panels.json → strip`, so thumbnails, previews and Export follow them):
- **Phones**: `flat` (the plain centred phone on every panel) or `3D` (`strip.layouts["3d"]`: a real 3D phone per
  panel, crossing the seams 1–2, 4–5 and 9–10). Phones sit on the whole set laid side by side (x = centre in strip
  px, panel n starts at (n-1)×1320; y = centre; height px; roll; angle; shot). A phone with `"panel": n` replaces
  that panel's flat phone. Add more layouts under `strip.layouts` and they appear in the switch.
- **Glass**: `original` (`grid/`) or `softer` (`grid-soft/`: re-rendered with `--glare 0.012 --sheen-boost 1.5
  --back-exposure -0.7 --subset soft`, so phones leaning away keep dark screens and back views are less blown out;
  the other angles link to `grid/`).

`panel.html?i=0&layout=flat&glass=soft` overrides both for one view. The server composes each phone on request
(`/api/phone`, cached in /tmp).
