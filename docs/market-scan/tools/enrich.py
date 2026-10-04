# Add rating counts, avg rating, last update, description snippet via iTunes lookup.
import json, urllib.request, time
rows=json.load(open('charts.json'))
ids=sorted({r['id'] for r in rows}); meta={}
for i in range(0,len(ids),150):
  url='https://itunes.apple.com/lookup?country=us&id='+','.join(ids[i:i+150])
  for a in range(3):
    try: d=json.load(urllib.request.urlopen(url,timeout=40)); break
    except Exception: time.sleep(3); d={'results':[]}
  for r in d['results']:
    meta[str(r['trackId'])]=dict(ratings=r.get('userRatingCount',0),stars=round(r.get('averageUserRating',0),2),
      updated=r.get('currentVersionReleaseDate','')[:10],desc=r.get('description','')[:300].replace('\n',' '),
      primary=r.get('primaryGenreName'))
  time.sleep(0.5)
for r in rows: r.update(meta.get(r['id'],{}))
json.dump(rows,open('charts.json','w')); print(len(meta),'enriched')
