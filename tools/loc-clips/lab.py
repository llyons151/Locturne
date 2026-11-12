#!/usr/bin/env python3
"""
The Loc clip lab (`npm run loc-clips`, http://localhost:5182): plays a clip's frames with his eyes
drawn live, with sliders for the eyes and the cut (start, end, speed, whether the frames where he
leaves the top of the video are skipped). Save writes clips.json; Bake runs bake.py, which writes the
WebPs the app plays. Local only.
"""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bake  # noqa: E402

PORT = 5182
job = {'running': False, 'log': []}


def clips():
    with open(bake.CLIPS) as f:
        return json.load(f)


def run_bake(name):
    job.update(running=True, log=[])
    try:
        # All of them: they share the one face.
        bake.bake_all(say=job['log'].append)
    except Exception as e:  # shown in the page
        job['log'].append(f'failed: {e}')
    job['running'] = False


class Lab(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, body, kind='application/json', code=200):
        if not isinstance(body, bytes):
            body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/':
            with open(os.path.join(HERE, 'lab.html'), 'rb') as f:
                return self.send(f.read(), 'text/html; charset=utf-8')
        if path == '/api/clips':
            return self.send({'clips': clips(), 'defaults': bake.EYES, 'fps': bake.FPS})
        if path.startswith('/api/frames/'):
            name = path.split('/')[3]
            if name not in clips():
                return self.send({'error': 'no such clip'}, code=404)
            return self.send(bake.prepare(name, bake.load(name)))
        if path.startswith('/f/'):
            _, _, name, file = path.split('/')
            full = os.path.join(bake.cache_dir(name), os.path.basename(file))
            if name in clips() and os.path.exists(full):
                with open(full, 'rb') as f:
                    return self.send(f.read(), 'image/png')
            return self.send({'error': 'no frame'}, code=404)
        if path == '/api/bake':
            return self.send(job)
        self.send({'error': 'not found'}, code=404)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        if self.path == '/api/save':
            all_clips = clips()
            all_clips[body['name']] = body['clip']
            with open(bake.CLIPS, 'w') as f:
                json.dump(all_clips, f, indent=2)
                f.write('\n')
            return self.send({'ok': True})
        if self.path == '/api/bake':
            if job['running']:
                return self.send({'error': 'already baking'}, code=409)
            threading.Thread(target=run_bake, args=(body['name'],), daemon=True).start()
            return self.send({'ok': True})
        self.send({'error': 'not found'}, code=404)


if __name__ == '__main__':
    print(f'Loc clip lab: http://localhost:{PORT}')
    ThreadingHTTPServer(('127.0.0.1', PORT), Lab).serve_forever()
