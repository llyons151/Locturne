#!/usr/bin/env python3
"""Scout TikTok for Confession hook clips, through the Rivals account's saved login (read-only).

Run with VideoStudio's venv (it has Playwright):
  PY=~/Documents/Projects/Tools/VideoStudio/.venv/bin/python
  $PY confession/scout.py search "my screen time" "up until 4am scrolling"   # TikTok video search
  $PY confession/scout.py user nexxfcr someotherfarm                          # an account's posts
  $PY confession/scout.py rank --top 25                                       # download, transcribe, score
  $PY confession/scout.py find "autoscroll" "problem"                         # transcripts containing all words

Staying out of trouble (the user's ask, 2026-11-12):
- It searches from a COPY of the Rivals login (cookies + storage only), never the posting profile itself,
  so a scout run can't log the posting account out or clash with a post in progress.
- Read-only: it opens search and profile pages and scrolls. It never likes, follows, comments, saves,
  or opens a video page in the account (downloads go through yt-dlp, logged out).
- Human pace: 3-6 s between scrolls, 15-30 s between searches, at most 12 searches per run.
- Visible Chrome on Hyprland workspace 5, like the posting windows (TikTok misbehaves headless).
Data lands in docs/reel-refs/scout/ (gitignored: other people's handles and clips).
"""
from __future__ import annotations

import json, math, random, re, shutil, subprocess, sys, time
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[3]  # the Locturne repo
OUT = ROOT / 'docs/reel-refs/scout'
DB = OUT / 'items.json'
SRC_PROFILE = Path.home() / '.local/share/videostudio/tiktokpost/dailygamehub3'
SCOUT_PROFILE = Path.home() / '.local/share/locturne-scout/profile'
MAX_SEARCHES = 12
WINDOW_CLASS = 'vspost'
WHISPER_MODEL = Path.home() / '.local/share/reelkit/whisper.cpp/models/ggml-small.en.bin'

# what a confession sounds like
CUES = [
    r'screen ?time', r'\b\d+\s*(hours?|hrs?)\b', r'\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen)\s+hours?\b',
    r'\b[1-5]\s*(am|a\.m\.)\b', r'\b(one|two|three|four|five)\s*(am|a\.m\.|in the morning)\b', r'all night', r'until (the )?(morning|sun)',
    r'scroll', r'tik ?tok', r'reels?\b', r'brain ?rot', r'addict', r'(a|my) problem', r'doom', r'(can\'?t|cannot) (stop|sleep)',
    r'phone', r'in bed', r'wasted?', r'(woke|wake) up', r'sleep', r'one more (video|episode)', r'autoscroll',
]
CUE_RE = [re.compile(c, re.I) for c in CUES]


def load() -> dict:
    return json.loads(DB.read_text()) if DB.exists() else {}


def save(db: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    DB.write_text(json.dumps(db, indent=1))


def copy_login() -> None:
    """Cookies + storage only (the posting profile is 1.2 GB of cache)."""
    if SCOUT_PROFILE.exists():
        return
    SCOUT_PROFILE.mkdir(parents=True)
    SCOUT_PROFILE.parent.chmod(0o700)
    shutil.copy2(SRC_PROFILE / 'Local State', SCOUT_PROFILE / 'Local State')
    (SCOUT_PROFILE / 'Default').mkdir()
    for name in ['Cookies', 'Cookies-journal', 'Preferences', 'Local Storage', 'IndexedDB', 'Session Storage']:
        s = SRC_PROFILE / 'Default' / name
        if s.is_dir():
            shutil.copytree(s, SCOUT_PROFILE / 'Default' / name)
        elif s.exists():
            shutil.copy2(s, SCOUT_PROFILE / 'Default' / name)


def walk(payload):
    stack = [payload]
    while stack:
        x = stack.pop()
        if isinstance(x, dict):
            if 'id' in x and ('stats' in x or 'statsV2' in x) and 'author' in x:
                yield x
            else:
                stack.extend(x.values())
        elif isinstance(x, list):
            stack.extend(x)


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def parse(it: dict, source: str) -> dict:
    a = it.get('author') or {}
    st = it.get('statsV2') or it.get('stats') or {}
    handle = a.get('uniqueId') if isinstance(a, dict) else str(a)
    return {
        'id': str(it['id']), 'url': f"https://www.tiktok.com/@{handle}/video/{it['id']}", 'author': handle,
        'desc': it.get('desc') or '', 'created': num(it.get('createTime')), 'duration': num((it.get('video') or {}).get('duration')),
        'plays': num(st.get('playCount')), 'likes': num(st.get('diggCount')), 'comments': num(st.get('commentCount')),
        'shares': num(st.get('shareCount')), 'saves': num(st.get('collectCount')),
        'slideshow': bool(it.get('imagePost')), 'duet_ok': it.get('duetEnabled'), 'stitch_ok': it.get('stitchEnabled'),
        'sources': [source],
    }


def browse(urls: list[tuple[str, str]], scrolls: int) -> None:
    from playwright.sync_api import sync_playwright

    copy_login()
    try:  # posting windows live on workspace 5 (user's rule); best effort
        subprocess.run(['hyprctl', 'eval', f'hl.window_rule({{ name = "vspost-ws5", match = {{ class = "^({WINDOW_CLASS})$" }}, workspace = "5 silent" }})'], capture_output=True)
    except FileNotFoundError:
        pass
    db = load()
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(str(SCOUT_PROFILE), channel='chrome', headless=False, viewport={'width': 1280, 'height': 900},
                                                   args=[f'--class={WINDOW_CLASS}', '--password-store=basic'], ignore_default_args=['--enable-automation'])
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        label = {'v': ''}

        def on_response(resp):
            # search results or the profile's own posts only; /api/recommend/ is the For You feed, noise
            if '/api/' not in resp.url or '/recommend/' in resp.url or not any(k in resp.url for k in ('/search/', '/post/item_list')):
                return
            try:
                payload = resp.json()
            except Exception:
                return
            for it in walk(payload):
                item = parse(it, label['v'])
                old = db.get(item['id'])
                if old:
                    item['sources'] = sorted(set(old['sources'] + item['sources']))
                    item = {**old, **{k: v for k, v in item.items() if v not in (None, 0, '')}}
                db[item['id']] = item

        page.on('response', on_response)
        for i, (lab, url) in enumerate(urls):
            label['v'] = lab
            before = len(db)
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
            for _ in range(scrolls):
                page.wait_for_timeout(random.uniform(3000, 6000))
                page.mouse.wheel(0, random.randint(2500, 4500))
            body = page.inner_text('body')[:3000]
            print(f'{lab}: +{len(db) - before} (total {len(db)})', flush=True)
            if len(db) == before and ('Log in' in body or 'captcha' in body.lower() or 'Verify' in body):
                print('  stopped: login wall or verification on this page. Not retrying.', flush=True)
                break
            save(db)
            if i < len(urls) - 1:
                time.sleep(random.uniform(15, 30))
        ctx.close()
    save(db)


def score(x: dict) -> float:
    """Shares are the strongest signal (people sending it to friends); saves and comments next."""
    plays = max(x['plays'], 1)
    rate = 100 * x['shares'] / plays + 40 * x['saves'] / plays + 30 * x['comments'] / plays + 3 * x['likes'] / plays
    return round(math.log10(plays) * rate, 2)


def transcribe(x: dict) -> None:
    clips = OUT / 'clips'
    clips.mkdir(parents=True, exist_ok=True)
    mp4, js = clips / f"{x['id']}.mp4", clips / f"{x['id']}.json"
    if not mp4.exists():
        subprocess.run(['yt-dlp', '-q', '--no-warnings', '-f', 'mp4/best', '-o', str(mp4), x['url']], check=False)
    if not mp4.exists():
        return
    if not js.exists():
        wav = clips / f"{x['id']}.wav"
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp4), '-ar', '16000', '-ac', '1', str(wav)], check=False)
        # whisper.cpp: ~20x faster than python whisper on CPU
        base = clips / f"{x['id']}.cpp"
        subprocess.run(['whisper-cli', '-m', str(WHISPER_MODEL), '-f', str(wav), '-t', '12', '-oj', '-of', str(base), '-np'], capture_output=True)
        wav.unlink(missing_ok=True)
        try:
            raw = json.loads(Path(f'{base}.json').read_text())['transcription']
            segs = [{'start': s['offsets']['from'] / 1000, 'end': s['offsets']['to'] / 1000, 'text': s['text']} for s in raw]
        except (OSError, KeyError, ValueError):
            segs = []
        Path(f'{base}.json').unlink(missing_ok=True)
        js.write_text(json.dumps({'segments': segs}))
    segs = json.loads(js.read_text()).get('segments', [])
    x['transcript'] = ' '.join(s['text'].strip() for s in segs)
    # best window: consecutive segments within 12 s with the most confession cues
    best = (0, 0.0, 0.0, '')
    for i in range(len(segs)):
        for j in range(i, len(segs)):
            a, b = segs[i]['start'], segs[j]['end']
            if b - a > 12:
                break
            text = ' '.join(s['text'].strip() for s in segs[i:j + 1])
            hits = sum(bool(r.search(text)) for r in CUE_RE)
            if hits > best[0] or (hits == best[0] and hits and b - a < best[2] - best[1]):
                best = (hits, a, b, text)
    x['cues'], x['window'], x['line'] = best[0], [round(best[1], 1), round(best[2], 1)], best[3]
    x['stitchable'] = bool(best[0]) and best[2] - best[1] <= 5.0


def rank(top: int, query: str = '') -> None:
    db = load()
    items = [x for x in db.values() if not x.get('slideshow') and x['plays'] >= 20000 and 0 < x.get('duration', 0) <= 180
             and any(s.startswith('search:') and query in s for s in x['sources'])]  # search results only, never feed noise
    for x in items:
        x['score'] = score(x)
    items.sort(key=lambda x: -x['score'])
    for k, x in enumerate(items[:top]):
        print(f'[{k + 1}/{min(top, len(items))}] {x["author"]}', flush=True)
        transcribe(x)
        db[x['id']] = x
    save(db)
    write_report(db)


def write_report(db: dict) -> None:
    """Every transcribed clip by score. Speech clips get their best line; no-speech clips (meme text + music,
    which are often the biggest) show the post caption instead, so read their on-screen text by eye."""
    for x in db.values():
        x['score'] = score(x)
    rows = sorted((x for x in db.values() if 'cues' in x), key=lambda x: -x['score'])
    farm = re.compile(r'@\w*(app|lockr|opal|brick|onesec|unrot)\b|\bapp\b', re.I)
    lines = ['# Scout: Confession hook candidates', '', f'{len(db)} posts seen, {len(rows)} transcribed, sorted by score',
             '(log views × weighted share/save/comment/like rate). Stitch = Stitch allowed AND the spoken line fits in 5 s.',
             'Kind: "speech" = a spoken confession line; "text" = little/no speech, the hook is on-screen text (check by eye).', '',
             '| # | Clip | Views | Shares | Score | Kind | Window | Stitch | Query | Line / caption |', '|---|---|---|---|---|---|---|---|---|---|']
    for k, x in enumerate(rows, 1):
        speech = x['cues'] > 0 and len(x.get('transcript', '')) > 25
        st = 'off' if x.get('stitch_ok') is False else ('yes' if x.get('stitchable') else ('5s cut' if speech else 'yes'))
        q = next((s[7:] for s in x['sources'] if s.startswith('search:')), '')
        text = (x['line'] if speech else x['desc'])[:140].replace('|', '/').replace('\n', ' ')
        lines.append(f"| {k} | [@{x['author']}]({x['url']}) | {x['plays']:,} | {x['shares']:,} | {x['score']} | {'speech' if speech else 'text'}"
                     f"{' FARM' if farm.search(x['desc']) else ''} | {x['window'][0]}–{x['window'][1]} s | {st} | {q} | {text} |")
    (OUT / 'SCOUT.md').write_text('\n'.join(lines) + '\n')
    print(f'report: {OUT / "SCOUT.md"}')


def find(words: list[str]) -> None:
    for x in load().values():
        t = (x.get('transcript') or '') + ' ' + x['desc']
        if all(w.lower() in t.lower() for w in words):
            print(x['plays'], x['url'], '|', (x.get('transcript') or x['desc'])[:200])


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'search':
        qs = [a for a in args if not a.startswith('--')][:MAX_SEARCHES]
        browse([(f'search:{q}', f'https://www.tiktok.com/search/video?q={quote(q)}') for q in qs], scrolls=6)
    elif cmd == 'user':
        browse([(f'user:{h.lstrip("@")}', f'https://www.tiktok.com/@{h.lstrip("@")}') for h in args[:MAX_SEARCHES]], scrolls=4)
    elif cmd == 'rank':
        rank(int(args[args.index('--top') + 1]) if '--top' in args else 25, args[args.index('--query') + 1] if '--query' in args else '')
    elif cmd == 'find':
        find(args)
    else:
        sys.exit(__doc__)
