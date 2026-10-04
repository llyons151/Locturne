#!/usr/bin/env python3
"""Fallback scanner when itunes /search is 403/429: scrape apps.apple.com search pages for ids, then /lookup."""
import sys, urllib.request, urllib.parse, re, json, time, collections, argparse, os
ap = argparse.ArgumentParser(); ap.add_argument('terms', nargs='+'); ap.add_argument('--must'); ap.add_argument('--namemust'); ap.add_argument('--exclude'); ap.add_argument('--show', type=int, default=20)
a = ap.parse_args()
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
charts = {}
for r in json.load(open(os.path.join(here, 'charts.json'))):
    if r['feed'] == 'grossing': charts.setdefault(str(r['id']), []).append(f"{r['genre']} #{r['rank']}")
ids = []
for t in a.terms:
    try:
        s = urllib.request.urlopen(urllib.request.Request('https://apps.apple.com/us/iphone/search?term=' + urllib.parse.quote(t), headers={'User-Agent': 'Mozilla/5.0 (Macintosh)'}), timeout=30).read().decode()
    except Exception as e:
        print('ERR', t, e); continue
    for i in re.findall(r'/id(\d{6,})', s):
        if i not in ids: ids.append(i)
    time.sleep(6)
rs = []
for k in range(0, len(ids), 100):
    for i in range(5):
        try:
            rs += json.load(urllib.request.urlopen('https://itunes.apple.com/lookup?country=us&id=' + ','.join(ids[k:k + 100]), timeout=30))['results']; break
        except Exception:
            time.sleep(20)
f = lambda p, s: re.search(p, s, re.I) if p else True
rs = [r for r in rs if f(a.must, r['trackName'] + ' ' + r.get('description', '')) and f(a.namemust, r['trackName']) and not (a.exclude and re.search(a.exclude, r['trackName'], re.I))]
rs.sort(key=lambda r: -(r.get('userRatingCount') or 0))
y = collections.Counter(r['releaseDate'][:4] for r in rs)
print('terms', a.terms, '| raw ids', len(ids), '| matching', len(rs), '| by year', dict(sorted(y.items())), '| 2025+:', sum(v for k, v in y.items() if k >= '2025'), '2026:', y.get('2026', 0))
for r in rs[:a.show]:
    print(f"  {r.get('userRatingCount',0):>7} {r.get('averageUserRating',0):.2f} rel {r['releaseDate'][:10]} upd {r['currentVersionReleaseDate'][:10]} ${r.get('price',0)} {r['trackName'][:45]} | {r['sellerName'][:22]} | {', '.join(charts.get(str(r['trackId']), [])) or '-'}")
