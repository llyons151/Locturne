#!/usr/bin/env python3
"""Niche saturation scanner (US App Store, iPhone).
Usage: python3 appscan.py --must 'regex' "keyword one" "keyword two" ...
  --must   regex that name+description must match to count as a real competitor (strongly recommended)
  --show N how many top competitors to list (default 15)
Prints: competitor count, rating-size buckets, launches by year, top competitors, whether any are on a top-grossing chart."""
import json, sys, re, urllib.request, urllib.parse, time, argparse, os
ap=argparse.ArgumentParser(); ap.add_argument('terms',nargs='+'); ap.add_argument('--must',default=None); ap.add_argument('--show',type=int,default=15); ap.add_argument('--exclude',default=None,help='regex on NAME to drop non-competitors'); ap.add_argument('--namemust',default=None,help='regex the app NAME must match'); ap.add_argument('--list',action='store_true',help='list every matching competitor compactly')
a=ap.parse_args()
here=os.path.dirname(os.path.abspath(__file__))
charts={}
try:
  for r in json.load(open(os.path.join(here,'charts.json'))):
    if r['feed']=='grossing': charts.setdefault(r['id'],[]).append(f"{r['genre']} #{r['rank']}")
except Exception: pass
apps={}
for t in a.terms:
  url='https://itunes.apple.com/search?'+urllib.parse.urlencode(dict(term=t,entity='software',country='us',limit=200))
  for i in range(3):
    try: d=json.load(urllib.request.urlopen(url,timeout=30)); break
    except Exception: time.sleep(3); d={'results':[]}
  for r in d['results']: apps[r['trackId']]=r
  time.sleep(0.4)
must=re.compile(a.must,re.I) if a.must else None
comp=[r for r in apps.values() if not must or must.search(r['trackName']+' '+r.get('description',''))]
ex=re.compile(a.exclude,re.I) if a.exclude else None
nm=re.compile(a.namemust,re.I) if a.namemust else None
comp=[r for r in comp if (not ex or not ex.search(r['trackName'])) and (not nm or nm.search(r['trackName']))]
comp.sort(key=lambda r:-(r.get('userRatingCount') or 0))
rc=lambda r:r.get('userRatingCount') or 0
b=lambda lo,hi:sum(1 for r in comp if lo<=rc(r)<hi)
yrs={}
for r in comp: y=r['releaseDate'][:4]; yrs[y]=yrs.get(y,0)+1
print(f"terms={a.terms} must={a.must}")
print(f"raw results={len(apps)}  matching competitors={len(comp)}")
print(f"ratings buckets: <20:{b(0,20)}  20-999:{b(20,1000)}  1k-9.9k:{b(1000,10000)}  10k-99k:{b(10000,100000)}  100k+:{b(100000,10**9)}")
print("launched by year:",dict(sorted(yrs.items())), f"| since 2025: {sum(1 for r in comp if r['releaseDate']>='2025')}  since 2026: {sum(1 for r in comp if r['releaseDate']>='2026')}")
print("top competitors (ratings, stars, released, last update, price, seller, top-grossing slots):")
for r in comp[:a.show]:
  print(f"  {rc(r):>8}  {r.get('averageUserRating',0):.2f}  {r['releaseDate'][:10]}  upd {r.get('currentVersionReleaseDate','')[:10]}  ${r.get('price',0)}  {r['trackName'][:45]} | {r.get('sellerName','')[:28]} | {', '.join(charts.get(str(r['trackId']),[])) or '-'}")
if a.list:
  print("ALL matching (ratings | released | name):")
  for r in comp: print(f"  {rc(r):>7} | {r['releaseDate'][:10]} | {r['trackName'][:60]}")
