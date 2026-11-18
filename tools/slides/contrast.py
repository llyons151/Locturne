"""Caption contrast check. For each slide with text drawn straight on a photo, render it twice in headless Chrome
(normal and ?nocaps=1), take the pixels that changed as the text mask, and compare the text's brightness with the
BRIGHT end of the photo underneath it (90th percentile), because one bright patch is what makes a line unreadable.
Ratio is WCAG-style (L1+0.05)/(L2+0.05); we require >= 3.5 (WCAG large text is 3, but we measure the bright worst case and 3.0-3.4 still read weak at feed speed). Run with the studio up (npm run slides):
  python3 tools/slides/contrast.py [--suggest] [deck-name-part ...]      (no args = every deck)
--suggest: for a failing slide, slide the glyph mask up and down the photo and print the nearest caption y (in % of
the slide, or of the half for split layouts) where it would pass at 4:1."""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = os.environ.get('PORT', '5183')
CHROME = os.environ.get('CHROME', 'google-chrome-stable')
MIN = 3.5
TMP = tempfile.mkdtemp(prefix='contrast-')

def shoot(url, out, w, h):
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    f'--window-size={w},{h}', '--virtual-time-budget=4000', f'--screenshot={out}', url],
                   capture_output=True, timeout=60)
    return np.asarray(Image.open(out).convert('RGB')).astype(np.float32) / 255

def lum(rgb):
    c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    return c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722

PHOTO_LAYOUTS = {'pic', 'full', 'letterbox', 'split', 'photo', 'screen', 'meme'}   # text drawn on a photo

def check(name, deck, i):
    if deck['slides'][i].get('layout') not in PHOTO_LAYOUTS: return None   # notes layouts: black text on white
    caps = deck['slides'][i].get('caps', [])
    if caps and all(c.get('style') == 'box' for c in caps): return None   # box captions bring their own white panel
    w, h = deck.get('size', [1080, 1350])
    base = f'http://localhost:{PORT}/slide.html?deck={name}&i={i}'
    if os.environ.get('SIZE'):                       # SIZE=1080x1350 checks the Instagram 4:5 render instead
        w, h = map(int, os.environ['SIZE'].split('x')); base += f'&size={w}x{h}'
    b = shoot(base + '&nocaps=1', f'{TMP}/b.png', w, h)
    # Glyph mask from flat grey renders (with vs without text): on a photo, light text over a light patch barely
    # changes any pixels, so a photo diff would catch only the shadow. Grey makes every glyph show.
    fa, fb = shoot(base + '&flat=1', f'{TMP}/fa.png', w, h), shoot(base + '&flat=1&nocaps=1', f'{TMP}/fb.png', w, h)
    core = np.abs(fa - fb).max(axis=2) > 0.3
    if core.sum() < 200: return None         # no on-photo text on this slide
    text = np.median(lum(fa[core]))          # the text's own colour, read off the grey render
    bg = lum(b[core])                        # what the photo is under those glyphs
    lo, hi = np.percentile(bg, 10), np.percentile(bg, 90)
    worst = hi if text > 0.5 else lo         # light text fails on bright patches, dark text on dark ones
    ratio = (max(text, worst) + 0.05) / (min(text, worst) + 0.05)
    if SUGGEST and ratio < MIN: suggest(deck, i, core, lum(b), text, h)
    # Caption over the photo's subject (moon, lamp, light source): bright pixels inside the caption's box. Contrast
    # can still pass because only part of the glyphs sits on it, but the words and the subject fight (iteration 26).
    if text > 0.5:
        ys, xs = np.nonzero(core)
        box = lum(b)[max(0, ys.min() - 12):ys.max() + 12, max(0, xs.min() - 12):xs.max() + 12]
        hot = float((box > max(0.12, 4 * float(np.median(box)))).mean())   # validated: moon under text 10.7%, clear 0%
        if hot > 0.02: SUBJECT.append((name, i + 1, round(hot * 100, 1)))
    return round(float(ratio), 2)

def suggest(deck, i, core, L, text, h):
    ys, xs = np.nonzero(core)
    top, bot, cy = ys.min(), ys.max(), (ys.min() + ys.max()) / 2
    lo, hi = (0, h)
    if deck['slides'][i]['layout'] == 'split': lo, hi = (0, h // 2) if cy < h / 2 else (h // 2, h)
    # TikTok's own UI covers roughly the top 10% (tabs) and bottom 20% (name, caption, sound): stay in 12–80%.
    lo, hi_scan = max(lo, int(0.12 * h)), min(hi, int(0.80 * h))
    mask = core[top:bot + 1]                          # glyph shape, moved as one block
    best = None
    for t in range(lo, hi_scan - (bot - top), 6):
        bg = L[t:t + bot - top + 1][mask]
        w = np.percentile(bg, 90) if text > 0.5 else np.percentile(bg, 10)
        r = (max(text, w) + 0.05) / (min(text, w) + 0.05)
        if r >= 4 and (best is None or abs(t - top) < abs(best[0] - top)): best = (t, r)
    if best:
        base = (0, h) if deck['slides'][i]['layout'] != 'split' else ((0, h // 2) if cy < h / 2 else (h // 2, h))
        y = (best[0] + (bot - top) / 2 - base[0]) / (base[1] - base[0]) * 100
        print(f'      suggest y={y:.0f} (ratio {best[1]:.1f})')
    else: print('      no y passes: use dark text, the outline style, or another photo')

SUGGEST = '--suggest' in sys.argv
SUBJECT = []

def main():
    want = [a for a in sys.argv[1:] if not a.startswith('--')]
    bad = 0
    for f in sorted(os.listdir(os.path.join(HERE, 'decks'))):
        name = f[:-5]
        if not f.endswith('.json') or (want and not any(x in name for x in want)): continue
        deck = json.load(open(os.path.join(HERE, 'decks', f)))
        for i in range(len(deck['slides'])):
            r = check(name, deck, i)
            if r is None: continue
            flag = 'FAIL' if r < MIN else 'ok  '
            bad += r < MIN
            if r < MIN or want: print(f'{flag} {r:5.2f}  {name} slide {i + 1}')
    # A review list, not a fail: busy bokeh or stars behind text can be fine; a moon or lamp behind a word isn't.
    for n, k, pct in SUBJECT: print(f'LOOK  caption crosses a bright subject ({pct}% of its box): {n} slide {k}')
    print(f'{bad} slide(s) under {MIN}:1, {len(SUBJECT)} caption(s) over a bright subject')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
