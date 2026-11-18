"""Photo sourcing for the slideshows: search openly licensed photos, auto-score them for slideshow use, and promote
picks into photos/ with credits. Part of the loop (docs/SLIDESHOW_LOOP.md, "Photo sourcing").

  python3 tools/slides/source.py need <slug> "query one|query two" [--night|--day] [--n 30]
      searches, downloads to photos/_cand/<slug>/, scores, writes a labelled contact sheet (sheet.png) to judge by eye
  python3 tools/slides/source.py pick <slug> <candidate-file> <new-name>
      copies the pick to photos/<new-name>.jpg (cropped to 9:16 around the centre if wider) and adds its credit
  python3 tools/slides/source.py needs
      lists open photo needs from photo_needs.json
  python3 tools/slides/source.py browse <slug> <list-file>
      list lines "<page-id> <photo-xxxx> <Photographer_Name>" pulled from an Unsplash search page in the browser:
      downloads 400px previews and writes photos/_cand/<slug>/sheet.png, numbered to match the list
  python3 tools/slides/source.py take <slug> <n> <new-name>      (adds candidate tNN from the browse list)
  python3 tools/slides/source.py add <new-name> <image-url> <creator> <license> <source-page>
      for a photo picked by eye in the browser (Unsplash/Pexels pages, via Claude in Chrome): downloads, crops to 9:16
      if wider, saves photos/<new-name>.jpg and records the credit

Sources (licence filter: CC0, public domain, CC BY only; no share-alike, no non-commercial):
  - Openverse (no key). Weak relevance, so queries should be concrete nouns ("alarm clock dark", not "tired").
  - Pexels if PEXELS_KEY is set, Unsplash if UNSPLASH_KEY is set. Both licences allow social use without
    attribution, and their candid/moody pools are much better. Keys are free (pexels.com/api, unsplash.com/developers).

What "viral potential" means here, from the saved references (docs/reports/Why slideshows go viral 2026-11-12.md):
the winners look like a phone snapshot, not stock. Dim, ordinary rooms, one readable subject, empty dark space where
the caption sits. So the auto score rewards: enough pixels for 1080x1920, low-ish brightness for night needs, a
dark band in TikTok's safe zone (12-80% height) where white text passes 4.5:1, and penalises over-saturated "stock"
colour. The final call is always made by looking at the sheet.
"""
import json, os, sys, urllib.parse, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, 'photos')
CAND = os.path.join(PHOTOS, '_cand')
UA = {'User-Agent': 'slides-studio/1.0'}
OK_LICENSES = {'cc0', 'pdm', 'by', 'pexels', 'unsplash'}

def get_json(url, headers=None):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **(headers or {})}), timeout=40))

def search(q, n):
    out = []
    try:
        url = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode(
            {'q': q, 'page_size': min(n, 20), 'license': 'cc0,pdm,by', 'mature': 'false'})
        try: d = get_json(url)
        except Exception: d = get_json(url)            # Openverse 504s often; one retry
        for r in d['results']:
            out.append({'url': r['url'], 'title': r.get('title'), 'creator': r.get('creator'), 'license': r['license'],
                        'source': r['foreign_landing_url'], 'w': r.get('width') or 0, 'h': r.get('height') or 0, 'via': 'openverse'})
    except Exception as e: print('  openverse', q, 'failed:', e)
    if os.environ.get('PEXELS_KEY'):
        try:
            d = get_json('https://api.pexels.com/v1/search?' + urllib.parse.urlencode({'query': q, 'per_page': min(n, 30), 'orientation': 'portrait'}),
                         {'Authorization': os.environ['PEXELS_KEY']})
            for p in d['photos']:
                out.append({'url': p['src']['large2x'], 'title': p.get('alt'), 'creator': p['photographer'], 'license': 'pexels',
                            'source': p['url'], 'w': p['width'], 'h': p['height'], 'via': 'pexels'})
        except Exception as e: print('  pexels', q, 'failed:', e)
    if os.environ.get('UNSPLASH_KEY'):
        try:
            d = get_json('https://api.unsplash.com/search/photos?' + urllib.parse.urlencode({'query': q, 'per_page': min(n, 30), 'orientation': 'portrait'}),
                         {'Authorization': 'Client-ID ' + os.environ['UNSPLASH_KEY']})
            for p in d['results']:
                out.append({'url': p['urls']['regular'], 'title': p.get('alt_description'), 'creator': p['user']['name'], 'license': 'unsplash',
                            'source': p['links']['html'], 'w': p['width'], 'h': p['height'], 'via': 'unsplash'})
        except Exception as e: print('  unsplash', q, 'failed:', e)
    return out

def lum(rgb):
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722

def cover_9x16(im):
    """Centre-crop to 9:16, the way the slide's full-bleed photo is drawn."""
    w, h = im.size
    if w / h > 9 / 16: nw = int(h * 9 / 16); return im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    nh = int(w * 16 / 9); return im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))

def score(path, night):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    crop = cover_9x16(im).resize((270, 480))
    a = np.asarray(crop).astype(np.float32)
    L = lum(a)
    # caption band: a 14%-tall, 78%-wide band in the safe zone where white text would pass (p90 brightness)
    best = 0.0; best_y = None
    for t in range(int(0.12 * 480), int(0.80 * 480) - 67, 8):
        band = L[t:t + 67, 30:240]
        r = 1.05 / (np.percentile(band, 90) + 0.05)
        if r > best: best, best_y = r, (t + 33) / 480 * 100
    mean = float(L.mean())
    hsv = np.asarray(crop.convert('HSV')).astype(np.float32)
    sat = float(hsv[..., 1].mean() / 255)
    s = 0.0
    s += 2 if min(w, h * 9 / 16) >= 1000 else (1 if min(w, h * 9 / 16) >= 700 else -2)    # enough pixels for 1080 wide
    s += 2 if best >= 4.5 else (1 if best >= 3.5 else -1)                                  # somewhere to put the caption
    if night: s += 2 if mean < 0.08 else (1 if mean < 0.18 else -1)                        # night needs: dim, phone-shot look
    else: s += 1 if 0.08 < mean < 0.45 else 0
    s += -1 if sat > 0.55 else 0                                                           # loud saturated colour reads as stock
    return {'score': float(round(s, 1)), 'w': w, 'h': h, 'mean': float(round(mean, 3)), 'sat': float(round(sat, 2)), 'caption_y': int(round(best_y or 0)), 'caption_ratio': float(round(best, 1))}

def need(slug, queries, night, n):
    d = os.path.join(CAND, slug); os.makedirs(d, exist_ok=True)
    meta_path = os.path.join(d, 'cand.json')
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
    seen = {m['url'] for m in meta.values()}
    for q in queries:
        for r in search(q, n):
            if r['url'] in seen or r['license'] not in OK_LICENSES or (r['w'] and r['w'] < 600): continue
            seen.add(r['url'])
            name = f'{len(meta) + 1:02d}.jpg'
            try:
                data = urllib.request.urlopen(urllib.request.Request(r['url'], headers=UA), timeout=40).read()
                if len(data) > 15_000_000: continue
                open(os.path.join(d, name), 'wb').write(data)
                Image.open(os.path.join(d, name)).verify()
            except Exception:
                if os.path.exists(os.path.join(d, name)): os.remove(os.path.join(d, name))
                continue
            r['query'] = q
            r.update(score(os.path.join(d, name), night))
            meta[name] = r
    json.dump(meta, open(meta_path, 'w'), indent=1)
    sheet(slug, meta)
    print(f'{slug}: {len(meta)} candidates → {os.path.join(d, "sheet.png")}')

def sheet(slug, meta):
    d = os.path.join(CAND, slug)
    items = sorted(meta.items(), key=lambda kv: -kv[1]['score'])[:40]
    cw, ch, cols = 216, 384, 8
    rows = max(1, (len(items) + cols - 1) // cols)
    W = Image.new('RGB', (cols * (cw + 6), rows * (ch + 30)), '#777')
    dr = ImageDraw.Draw(W)
    for k, (name, m) in enumerate(items):
        try: im = cover_9x16(Image.open(os.path.join(d, name)).convert('RGB')).resize((cw, ch))
        except Exception: continue
        x, y = (k % cols) * (cw + 6), (k // cols) * (ch + 30)
        W.paste(im, (x, y + 28))
        dr.text((x + 2, y + 2), f"{name}  score {m['score']:.0f}  {m['via']}  {m['license']}", fill='white')
        dr.text((x + 2, y + 14), f"{m['w']}x{m['h']}  caption y{m['caption_y']:.0f} {m['caption_ratio']:.1f}:1", fill='white')
    W.save(os.path.join(d, 'sheet.png'))

def pick(slug, file, new):
    d = os.path.join(CAND, slug)
    meta = json.load(open(os.path.join(d, 'cand.json')))[file]
    out = os.path.join(PHOTOS, new + '.jpg')
    if os.path.exists(out): sys.exit(f'{out} exists; pick another name')
    im = Image.open(os.path.join(d, file)).convert('RGB')
    im = cover_9x16(im) if im.width / im.height > 9 / 16 + 0.01 else im
    if im.width > 1440: im = im.resize((1440, round(im.height * 1440 / im.width)))
    im.save(out, quality=90)
    cp = os.path.join(PHOTOS, 'credits.json')
    credits = json.load(open(cp))
    credits[new + '.jpg'] = {'title': meta.get('title'), 'creator': meta.get('creator'), 'license': meta['license'], 'source': meta['source']}
    json.dump(credits, open(cp, 'w'), indent=1, ensure_ascii=False)
    print('added', out, meta['license'], meta.get('creator'))

def add(new, url, creator, license, source):
    if license not in OK_LICENSES: sys.exit(f'licence {license} not allowed')
    out = os.path.join(PHOTOS, new + '.jpg')
    if os.path.exists(out): sys.exit(f'{out} exists')
    tmp = out + '.part'
    open(tmp, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read())
    im = Image.open(tmp).convert('RGB'); os.remove(tmp)
    im = cover_9x16(im) if im.width / im.height > 9 / 16 + 0.01 else im
    if im.width > 1440: im = im.resize((1440, round(im.height * 1440 / im.width)))
    im.save(out, quality=90)
    cp = os.path.join(PHOTOS, 'credits.json'); credits = json.load(open(cp))
    credits[new + '.jpg'] = {'title': None, 'creator': creator, 'license': license, 'source': source}
    json.dump(credits, open(cp, 'w'), indent=1, ensure_ascii=False)
    print('added', out, im.size, license, creator)

def browse(slug, listfile):
    d = os.path.join(CAND, slug); os.makedirs(d, exist_ok=True)
    rows = [l.split() for l in open(listfile).read().splitlines() if l.strip()]
    json.dump(rows, open(os.path.join(d, 'list.json'), 'w'))
    cw, ch, cols = 200, 300, 8
    W = Image.new('RGB', (cols * (cw + 4), ((len(rows) + cols - 1) // cols) * (ch + 20)), '#777'); dr = ImageDraw.Draw(W)
    for k, r in enumerate(rows):
        path = os.path.join(d, f't{k + 1:02d}.jpg')
        try:
            if not os.path.exists(path):
                open(path, 'wb').write(urllib.request.urlopen(urllib.request.Request(
                    f'https://images.unsplash.com/{r[1]}?w=400&q=70&fm=jpg', headers=UA), timeout=30).read())
            im = Image.open(path).convert('RGB'); im = im.resize((cw, int(cw * im.height / im.width))).crop((0, 0, cw, ch))
        except Exception: continue
        x, y = (k % cols) * (cw + 4), (k // cols) * (ch + 20)
        W.paste(im, (x, y + 18)); dr.text((x + 3, y + 3), f't{k + 1:02d}  {r[2] if len(r) > 2 else ""}'[:34], fill='white')
    W.save(os.path.join(d, 'sheet.png')); print(os.path.join(d, 'sheet.png'))

def take(slug, n, new):
    """Add candidate t<n> from a browse list as photos/<new>.jpg, credited to its Unsplash photographer."""
    r = json.load(open(os.path.join(CAND, slug, 'list.json')))[int(n) - 1]
    add(new, f'https://images.unsplash.com/{r[1]}?w=1440&q=85&fm=jpg', (r[2] if len(r) > 2 else '').replace('_', ' '), 'unsplash',
        f'https://unsplash.com/photos/{r[0]}')

def needs():
    p = os.path.join(HERE, 'photo_needs.json')
    for n in json.load(open(p)) if os.path.exists(p) else []:
        if not n.get('done'): print(f"{n['slug']:22} {'night' if n.get('night') else 'day  '} for {', '.join(n['decks'])}: {n['want']}")

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['need']:
        n = int(a[a.index('--n') + 1]) if '--n' in a else 20
        need(a[1], a[2].split('|'), '--day' not in a, n)
    elif a[:1] == ['pick']: pick(a[1], a[2], a[3])
    elif a[:1] == ['needs']: needs()
    elif a[:1] == ['add']: add(*a[1:6])
    elif a[:1] == ['browse']: browse(a[1], a[2])
    elif a[:1] == ['take']: take(a[1], a[2], a[3])
    else: print(__doc__)
