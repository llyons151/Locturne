#!/usr/bin/env python3
"""Clip viewer fetch: pulls every video listed in a study's notes into docs/reel-refs/clip-study/.

Reads the "## Videos" section of each .md in docs/research_notes/Recorded clip formats/ (lines shaped
`URL | @handle | views | likes | upload_date | format | why`), downloads each with yt-dlp (mp4 + cover
image + stats), and writes items.json for the viewer. Re-running skips clips already on disk, so it
is safe to run again after adding links. Extra links go in docs/reel-refs/clip-study/extra.md in the
same line format. Run: `npm run clip-viewer:fetch` (or python3 tools/clip-viewer/fetch.py).
"""
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
NOTES = REPO / 'docs' / 'research_notes' / 'Recorded clip formats'
OUT = REPO / 'docs' / 'reel-refs' / 'clip-study'
CLIPS = OUT / 'clips'
URL_RE = re.compile(r'https?://\S+')


def slug(url):
    """Stable file id from a video URL: the platform's own id where it has one."""
    for pat in (r'/video/(\d+)', r'/reel/([\w-]+)', r'/p/([\w-]+)', r'[?&]v=([\w-]+)', r'youtu\.be/([\w-]+)',
                r'/shorts/([\w-]+)'):
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return re.sub(r'\W+', '_', url)[-60:]


def platform(url):
    for name in ('tiktok', 'instagram', 'youtube', 'youtu.be'):
        if name in url:
            return 'youtube' if name == 'youtu.be' else name
    return 'other'


def parse(md_path, angle):
    rows, inside = [], False
    for line in md_path.read_text().splitlines():
        if line.startswith('## '):
            inside = line.strip().lower() == '## videos'
            continue
        if not inside or '|' not in line:
            continue
        m = URL_RE.search(line)
        if not m:
            continue
        url = m.group(0).rstrip('|').rstrip('.,;)`')
        if '/video/' not in url and '/reel/' not in url and '/p/' not in url and 'watch?v=' not in url \
                and 'youtu.be/' not in url and '/shorts/' not in url:
            continue  # profile or discover page, not a clip
        parts = [p.strip().strip('`') for p in line.split('|')]
        parts += [''] * (7 - len(parts))
        rows.append({'url': url, 'handle': parts[1], 'views_noted': parts[2], 'likes_noted': parts[3],
                     'date_noted': parts[4], 'format': parts[5], 'why': ' | '.join(parts[6:]).strip(' |'),
                     'angle': angle})
    return rows


def playable(mp4):
    """TikTok mostly serves HEVC, which Chrome on Linux won't decode (sound, no picture): re-encode to H.264."""
    codec = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name',
                            '-of', 'csv=p=0', str(mp4)], capture_output=True, text=True).stdout.strip()
    if codec != 'hevc':
        return
    tmp = mp4.with_suffix('.h264.mp4')
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(mp4), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
                        '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', str(tmp)], capture_output=True)
    if r.returncode == 0:
        tmp.replace(mp4)
    else:
        tmp.unlink(missing_ok=True)


def fetch(row):
    cid = slug(row['url'])
    row['id'] = cid
    row['platform'] = platform(row['url'])
    meta_path = CLIPS / f'{cid}.json'
    if not meta_path.exists():
        cmd = ['yt-dlp', '--no-warnings', '--quiet', '--no-playlist', '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
               '--merge-output-format', 'mp4', '--write-info-json', '--write-thumbnail', '--convert-thumbnails', 'jpg',
               '-o', str(CLIPS / f'{cid}.%(ext)s'), row['url']]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        info = CLIPS / f'{cid}.info.json'
        if r.returncode != 0 or not info.exists():
            row['status'] = 'failed'
            row['error'] = (r.stderr or r.stdout).strip().splitlines()[-1:] or ['unknown']
            row['error'] = row['error'][0][:300]
            return row
        d = json.loads(info.read_text())
        keep = {k: d.get(k) for k in ('title', 'description', 'view_count', 'like_count', 'comment_count',
                                       'repost_count', 'upload_date', 'duration', 'uploader', 'channel',
                                       'webpage_url', 'width', 'height')}
        meta_path.write_text(json.dumps(keep, indent=1))
        info.unlink()
    meta = json.loads(meta_path.read_text())
    if (CLIPS / f'{cid}.mp4').exists():
        playable(CLIPS / f'{cid}.mp4')
    row.update({'status': 'ok', 'meta': meta,
                'video': f'clips/{cid}.mp4' if (CLIPS / f'{cid}.mp4').exists() else None,
                'cover': f'clips/{cid}.jpg' if (CLIPS / f'{cid}.jpg').exists() else None})
    return row


def main():
    CLIPS.mkdir(parents=True, exist_ok=True)
    rows = []
    for md in sorted(NOTES.glob('*.md')):
        rows += parse(md, md.stem)
    extra = OUT / 'extra.md'
    if extra.exists():
        rows += parse(extra, 'extra')
    seen, unique = set(), []
    for r in rows:
        key = slug(r['url'])
        if key in seen:
            # Same clip cited by two angles: keep one card, list both angles.
            first = next(u for u in unique if slug(u['url']) == key)
            if r['angle'] not in first['angle']:
                first['angle'] += f", {r['angle']}"
            continue
        seen.add(key)
        unique.append(r)
    print(f'{len(unique)} clips listed', file=sys.stderr)
    with ThreadPoolExecutor(4) as pool:
        done = list(pool.map(fetch, unique))
    ok = sum(r['status'] == 'ok' for r in done)
    for r in done:
        if r['status'] != 'ok':
            print(f"failed {r['url']}: {r.get('error')}", file=sys.stderr)
    (OUT / 'items.json').write_text(json.dumps(done, indent=1))
    print(f'{ok}/{len(done)} downloaded → {OUT / "items.json"}', file=sys.stderr)


if __name__ == '__main__':
    main()
