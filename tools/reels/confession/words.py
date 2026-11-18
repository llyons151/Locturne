#!/usr/bin/env python3
"""Cut a hook clip and time its words, for a Confession reel.

  python3 -I confession/words.py <video or URL> <from s> <to s> <name>

Writes public/confession/hooks/<name>.mp4 (the cut, re-timed to start at 0) and
src/confession/hooks/<name>.json: [{"w": "WORD", "s": 0.12, "e": 0.40}, ...], whisper's word
timestamps. Fix any misheard words in the json by hand, then reference it from a reel spec.
"""
import json, os, subprocess, sys, tempfile

src, a, b, name = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_mp4 = os.path.join(root, 'public/confession/hooks', name + '.mp4')
out_json = os.path.join(root, 'src/confession/hooks', name + '.json')
os.makedirs(os.path.dirname(out_mp4), exist_ok=True)
os.makedirs(os.path.dirname(out_json), exist_ok=True)

with tempfile.TemporaryDirectory() as tmp:
    if src.startswith('http'):
        subprocess.run(['yt-dlp', '-q', '--no-warnings', '-f', 'mp4/best', '-o', os.path.join(tmp, 'src.%(ext)s'), src], check=True)
        src = next(os.path.join(tmp, f) for f in os.listdir(tmp) if f.startswith('src.'))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-to', str(b), '-i', src,
                    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-r', '30', '-c:a', 'aac', '-b:a', '192k', out_mp4], check=True)
    wav = os.path.join(tmp, 'a.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out_mp4, '-ar', '16000', '-ac', '1', wav], check=True)
    subprocess.run(['whisper', wav, '--model', 'medium', '--language', 'en', '--word_timestamps', 'True',
                    '--output_format', 'json', '--output_dir', tmp], check=True, capture_output=True)
    seg = json.load(open(os.path.join(tmp, 'a.json')))['segments']

words = [{'w': w['word'].strip().upper(), 's': round(w['start'], 2), 'e': round(w['end'], 2)} for s in seg for w in s.get('words', [])]
json.dump(words, open(out_json, 'w'), indent=0)
print(f'{len(words)} words -> {out_json}')
print(' '.join(w['w'] for w in words))
