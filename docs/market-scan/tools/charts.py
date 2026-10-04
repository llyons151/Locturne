# Pull US iOS top-grossing / top-free / top-paid charts (100 each) for every category.
import json, urllib.request, time
G={6000:'Business',6001:'Weather',6002:'Utilities',6003:'Travel',6004:'Sports',6005:'Social Networking',6006:'Reference',6007:'Productivity',6008:'Photo & Video',6009:'News',6010:'Navigation',6011:'Music',6012:'Lifestyle',6013:'Health & Fitness',6014:'Games',6015:'Finance',6016:'Entertainment',6017:'Education',6018:'Books',6020:'Medical',6023:'Food & Drink',6024:'Shopping',6026:'Developer Tools',6027:'Graphics & Design'}
rows=[]
for feed in ['topgrossingapplications','topfreeapplications','toppaidapplications']:
  for gid,gname in G.items():
    url=f'https://itunes.apple.com/us/rss/{feed}/limit=100/genre={gid}/json'
    for attempt in range(3):
      try:
        d=json.load(urllib.request.urlopen(url,timeout=30)); break
      except Exception as e: time.sleep(2); d=None
    if not d: print('fail',feed,gname); continue
    for rank,e in enumerate(d['feed'].get('entry',[]),1):
      rows.append(dict(feed=feed.replace('applications','').replace('top',''),genre=gname,rank=rank,name=e['im:name']['label'],
        seller=e['im:artist']['label'],id=e['id']['attributes']['im:id'],released=e['im:releaseDate']['label'][:10],
        price=e['im:price']['attributes']['amount']))
    time.sleep(0.3)
json.dump(rows,open('charts.json','w'))
print(len(rows))
