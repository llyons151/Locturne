#!/usr/bin/env python3
"""Make AI reaction-hook takes in a batch, QC every one, and lay them out to pick from.

usage:
  python3 tools/reels/hookgen.py <still.png> <prompt.txt> [--models minimax-h3:2,kling-3-pro:2] [--name car2]

- Animates the still through Locturne Studio's hook lab (fal; costs money, printed before it starts).
- Every take is checked by hookqc.py (zoom, subject scale, glitch frames) and gets full and face contact sheets.
- Writes out/hooks/<name>/index.html: passing takes first, each with its video, sheets and numbers.
Rules for stills and prompts: docs/HOOK_CLIP_SYSTEM.md.
"""
import json, shutil, subprocess, sys, time
from pathlib import Path

STUDIO = Path.home() / 'Documents/Projects/Tools/LocturneStudio'
QC_PY = Path.home() / '.local/share/hookqc-venv/bin/python'
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(STUDIO))
from studio import faces, core  # noqa: E402

DONE = ('ready', 'failed', 'unknown', 'paused')


def main(argv):
    args = list(argv)
    opt = lambda k, d: (args.pop(args.index(k) + 1), args.remove(k))[0] if k in args else d
    models = opt('--models', 'minimax-h3:2,kling-3-pro:2')
    name = opt('--name', None)
    still, prompt_file = Path(args[0]), Path(args[1])
    name = name or still.stem
    prompt = prompt_file.read_text().strip()
    plan = [(m, int(n)) for m, n in (x.split(':') for x in models.split(','))]
    cost = sum(core.VIDEO_MODELS[m]['per_second'] * core.VIDEO_MODELS[m]['min'] * n for m, n in plan)
    print(f'{sum(n for _, n in plan)} takes, about ${cost:.2f} on fal: ' + ', '.join(f'{m} x{n} ({core.VIDEO_MODELS[m]["min"]} s)' for m, n in plan), flush=True)

    faces.init()
    st = faces.add_image(still.read_bytes(), f'hookgen-{name}-{still.name}')
    face = max(st['faces'], key=lambda f: f['created'])
    before = {t['id'] for t in faces.state()['takes']}
    for m, n in plan:
        for _ in range(n):
            faces.animate({'face_id': face['id'], 'prompt': prompt, 'model': m}); time.sleep(1.5)
    for _ in range(180):
        takes = [t for t in faces.state()['takes'] if t['id'] not in before]
        if takes and all(t['state'] in DONE for t in takes): break
        time.sleep(10)

    out = HERE / 'out' / 'hooks' / name
    out.mkdir(parents=True, exist_ok=True)
    shutil.copy(still, out / ('still' + still.suffix))
    (out / 'prompt.txt').write_text(prompt + '\n')
    rows = []
    for i, t in enumerate(sorted(takes, key=lambda t: t['model'])):
        if t['state'] != 'ready':
            rows.append({'file': None, 'model': t['model'], 'state': t['state'], 'error': t.get('error')}); continue
        f = out / f"{t['model']}-{i + 1}.mp4"
        shutil.copy(faces.clip_path(t['id']), f)
        subprocess.run([str(QC_PY), str(HERE / 'hookqc.py'), str(f)], check=True)
        qc = json.loads((out / f'{f.stem}.qc.json').read_text())
        rows.append({'file': f.name, 'model': t['model'], 'take': t['id'], 'state': 'ready', 'qc': qc})
    rows.sort(key=lambda r: (r.get('qc', {}).get('auto_verdict') != 'pass', r['model']))
    (out / 'takes.json').write_text(json.dumps(rows, indent=2))
    write_page(out, name, prompt, rows, still.suffix)
    print(out / 'index.html')


def write_page(out, name, prompt, rows, still_ext='.png'):
    cards = []
    for r in rows:
        if not r['file']:
            cards.append(f"<div class=card><b>{r['model']}</b> {r['state']}: {r.get('error') or ''}</div>"); continue
        q = r['qc']; ok = q['auto_verdict'] == 'pass'
        cards.append(f"""<div class="card {'pass' if ok else 'fail'}"><video src="{r['file']}" controls loop muted playsinline></video>
<p><b>{r['model']}</b> · {'PASS' if ok else 'FAIL'} · zoom {q['max_zoom_pct']}% · subject {q['max_subject_scale_pct']}% · glitches {q['glitch_seconds'] or 'none'}</p>
<p class=fails>{'; '.join(q['fails'])}</p><p>Still check by eye: {', '.join(q['still_to_check_by_eye'])}</p>
<img src="{Path(q['face_sheet']).name}"><img src="{Path(q['sheet']).name}"></div>""")
    (out / 'index.html').write_text(f"""<!doctype html><meta charset=utf-8><title>Hook takes · {name}</title>
<style>body{{background:#111;color:#ddd;font:14px system-ui;margin:20px}}.wrap{{display:flex;flex-wrap:wrap;gap:20px}}
.card{{background:#1b1b1b;border-radius:12px;padding:12px;width:560px}}.pass{{outline:2px solid #3a7}}.fail{{outline:2px solid #a33;opacity:.75}}
video{{height:520px;border-radius:10px;display:block}}img{{width:100%;margin-top:8px;border-radius:6px}}.fails{{color:#e77}}
pre{{white-space:pre-wrap;color:#999;max-width:1100px}}</style>
<h2>{name}</h2><div class=wrap><div class=card><img src="still{still_ext}" style="width:300px"><pre>{prompt}</pre></div>{''.join(cards)}</div>""")


if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(sys.argv[1:])
