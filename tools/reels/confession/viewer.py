#!/usr/bin/env python3
"""Plain viewer for finished Confession reels: a grid of phone-sized players, nothing to edit.

  python3 -I confession/viewer.py        # http://127.0.0.1:5182

Lists out/confession-*.mp4 fresh on every page load (newest first), so a re-render shows up on refresh.
"""
import html, http.server, os, socketserver, time
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'out'
PORT = 5182
SKIP = {'confession-autoscroll-study.mp4'}  # has Lockr's captions burned in


def page() -> bytes:
    files = sorted((f for f in OUT.glob('confession-*.mp4') if f.name not in SKIP), key=lambda f: -f.stat().st_mtime)
    cards = []
    for f in files:
        name = f.stem.replace('confession-', '').replace('-', ' ')
        when = time.strftime('%b %d %H:%M', time.localtime(f.stat().st_mtime))
        cards.append(f'<figure><video src="/v/{html.escape(f.name)}?t={int(f.stat().st_mtime)}" controls playsinline preload="metadata"></video>'
                     f'<figcaption><b>{html.escape(name)}</b><span>{when}</span></figcaption></figure>')
    return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confession reels</title><style>
:root{{color-scheme:dark}} body{{margin:0;background:#0b0b0d;color:#eee;font:15px system-ui,sans-serif}}
h1{{font-size:18px;font-weight:600;text-align:center;margin:20px 0 4px}} p{{text-align:center;color:#888;margin:0 0 18px}}
main{{display:flex;flex-wrap:wrap;gap:22px;justify-content:center;padding:0 16px 40px}}
figure{{margin:0;width:270px}} video{{width:270px;aspect-ratio:9/16;background:#000;border-radius:14px;display:block}}
figcaption{{display:flex;justify-content:space-between;margin-top:8px;text-transform:capitalize}} figcaption span{{color:#777;font-size:12px}}
</style></head><body><h1>Confession reels</h1><p>{len(files)} videos, newest first. Refresh after a re-render.</p>
<main>{"".join(cards)}</main></body></html>'''.encode()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(OUT), **k)

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            body = page()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path.startswith('/v/'):
            self.path = '/' + self.path[3:].split('?')[0]
        return super().do_GET()

    def log_message(self, *a):
        pass


socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', PORT), Handler) as s:
    print(f'http://127.0.0.1:{PORT}', flush=True)
    s.serve_forever()
