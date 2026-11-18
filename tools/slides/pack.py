"""Post packs: one ready-to-post folder per plan day and account, so posting is copy, add a sound, post.
  python3 tools/slides/pack.py [--ig] [day ...]        (studio must be running: it exports fresh PNGs)
--ig also writes an ig/ folder per post: every slide at 1080x1350 (Instagram crops 9:16 carousels to 4:5), the caption
with at most 5 hashtags (Instagram's cap since Dec 2025), and Instagram notes (add music for Reels-tab eligibility;
slide 2 may be shown first). Source: docs/reports/Instagram carousel cross-posting 2026-11-13.md
Writes out/packs/day-NN/<account>-<deck>/ with 01.png… in order, caption.txt, post.txt (sound, disclosure, checks)
and a day-NN/README.txt. Decks that still fail lint are packed into BLOCKED-<deck>/ with the reason, never silently."""
import json, os, shutil, subprocess, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
plan = json.load(open(os.path.join(HERE, 'plan.json')))
IG = '--ig' in sys.argv
want = {int(a) for a in sys.argv[1:] if a.isdigit()}
audit = {r['name']: r for r in json.loads(subprocess.run(['node', os.path.join(HERE, 'audit.mjs'), '--json'], capture_output=True, text=True).stdout)}
for d in plan['days']:
    if want and d['day'] not in want: continue
    day = os.path.join(HERE, 'out', 'packs', f"day-{d['day']:02d}")
    shutil.rmtree(day, ignore_errors=True); os.makedirs(day)
    lines = [f"Day {d['day']}: post one per account, same time slot as the rest of the week. Log numbers at 48 h in the studio's Posts panel.", '']
    for acc, label in plan['accounts'].items():
        name = d[acc]
        if not name.endswith(('WINNER',)) and not os.path.exists(os.path.join(HERE, 'decks', name + '.json')):
            lines.append(f'{label}: MISSING deck {name}'); continue
        if name.endswith('WINNER'):
            lines.append(f"{label}: repeat this account's best format so far (pick after reading `audit.mjs --results`)"); continue
        deck = json.load(open(os.path.join(HERE, 'decks', name + '.json')))
        fails = [f['text'] for f in audit.get(name, {}).get('fails', [])]
        folder = os.path.join(day, ('BLOCKED-' if fails else '') + f'{acc}-{name}')
        os.makedirs(folder)
        r = json.load(urllib.request.urlopen(urllib.request.Request(f'http://localhost:5183/api/export/{name}', method='POST'), timeout=600))
        for i, f in enumerate(r['files']): shutil.copy(os.path.join(HERE, f.lstrip('/')), os.path.join(folder, f'{i + 1:02d}.png'))
        open(os.path.join(folder, 'caption.txt'), 'w').write(deck.get('caption', '') + '\n')
        promo = deck.get('job') == 'promo' or deck.get('app') not in (None, 'none')
        post = [f"account: {label}", f"deck: {name} ({deck.get('format', '')})", f"sound: {deck.get('sound', 'pick a trending sound in the app')} (add it by hand in TikTok)",
                f"disclosure: {'turn ON the \"Your brand\" content toggle (shows the app)' if promo else 'not needed (no app shown)'}",
                'AI label: ' + ('turn ON (AI-made image in this post)' if any('AI' in c for c in deck.get('check', [])) else 'not needed'), '', 'check before posting:']
        post += [f'  - {c}' for c in deck.get('check', [])] or ['  - nothing extra']
        if fails: post += ['', 'BLOCKED, do not post until fixed:'] + [f'  - {t}' for t in fails]
        open(os.path.join(folder, 'post.txt'), 'w').write('\n'.join(post) + '\n')
        if IG:
            ig = os.path.join(folder, 'ig'); os.makedirs(ig)
            for i in range(len(deck['slides'])):
                subprocess.run([os.environ.get('CHROME', 'google-chrome-stable'), '--headless=new', '--disable-gpu', '--hide-scrollbars',
                    '--force-device-scale-factor=1', '--window-size=1080,1350', '--virtual-time-budget=4000', f'--screenshot={os.path.join(ig, f"{i + 1:02d}.png")}',
                    f'http://localhost:5183/slide.html?deck={name}&i={i}&size=1080x1350'], capture_output=True, timeout=60)
            words = deck.get('caption', '').split(); tags = [w for w in words if w.startswith('#')]
            open(os.path.join(ig, 'caption.txt'), 'w').write(' '.join([w for w in words if not w.startswith('#')] + tags[:5]) + '\n')
            open(os.path.join(ig, 'post.txt'), 'w').write('Instagram carousel (same slides, 4:5):\n  - add a song in the Instagram app (makes the carousel eligible for the Reels tab)\n'
                '  - Instagram may re-show this opening on slide 2, so slide 2 should make sense on its own\n  - post from your own account; no TikTok watermark (these PNGs are clean)\n')
        lines.append(f"{label}: {name}  ({len(r['files'])} slides){'  BLOCKED' if fails else ''}")
    open(os.path.join(day, 'README.txt'), 'w').write('\n'.join(lines) + '\n')
    print('\n'.join([f"== day {d['day']}"] + lines[2:]))
