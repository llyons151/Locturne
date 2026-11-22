#!/usr/bin/env python3
"""Hook clip QC: catch the jank in AI reaction clips before anyone watches them.

usage: ~/.local/share/hookqc-venv/bin/python tools/reels/hookqc.py <clip.mp4> [more.mp4 ...] [--out DIR]

For each clip it writes, into DIR (default: next to the clip):
  <name>.qc.json   zoom drift, glitch frames, verdict
  <name>.sheet.jpg the whole frame at 4 fps, timestamped
  <name>.face.jpg  the face area at 6 fps, bigger, for props through the face, teeth, talking

Checks (rules in docs/HOOK_CLIP_SYSTEM.md):
  zoom   best-fit scale of each frame against the first, measured on the background ring (top band and side
         strips, where the subject rarely is). Any |scale - 1| over ZOOM_LIMIT fails: no zoom, ever.
  glitch frame-to-frame change spikes far above the clip's own median (morphs, pops, melting props).
Clipping (a straw through a nose), extra fingers and talking can't be measured; they're what the face sheet is for.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image

ZOOM_LIMIT = 0.03        # 3% bigger or smaller than the first frame
LEAN_LIMIT = 0.06        # the face growing or shrinking 6% reads as a zoom too
GLITCH_FACTOR = 4.0      # a frame change this many times the median change is a pop
W, H = 216, 384          # analysis size (9:16)


def frames(path, fps, w=W, h=H):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vf',
                          f'fps={fps},scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},format=gray',
                          '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def background_mask(h, w):
    """Where the background is in a selfie hook: everything except the subject's block (middle, lower 65%)."""
    m = np.full((h, w), 255, np.uint8)
    m[int(h * 0.30):, int(w * 0.18):int(w * 0.82)] = 0
    return m


def subject_mask(h, w):
    """The head and shoulders block of a selfie hook."""
    m = np.zeros((h, w), np.uint8)
    m[int(h * 0.28):int(h * 0.62), int(w * 0.22):int(w * 0.78)] = 255
    return m


def zoom_track(path, fps=8, mask_fn=None):
    """Cumulative camera scale vs the first frame: background corners tracked frame to frame (optical flow),
    a RANSAC similarity fit per step, scales chained. Needs OpenCV (run with the hookqc venv)."""
    import cv2
    f = frames(path, fps, 432, 768).astype(np.uint8)
    mask = (mask_fn or background_mask)(768, 432)
    total, out = 1.0, [1.0]
    for a, b in zip(f[:-1], f[1:]):
        pts = cv2.goodFeaturesToTrack(a, 400, 0.01, 8, mask=mask)
        if pts is None or len(pts) < 12: out.append(round(total, 4)); continue
        nxt, st, _ = cv2.calcOpticalFlowPyrLK(a, b, pts, None, winSize=(21, 21), maxLevel=3)
        good = st.ravel() == 1
        if good.sum() < 12: out.append(round(total, 4)); continue
        M, inl = cv2.estimateAffinePartial2D(pts[good], nxt[good], method=cv2.RANSAC, ransacReprojThreshold=1.5)
        if M is not None and inl is not None and inl.sum() >= 10:
            total *= float(np.hypot(M[0, 0], M[1, 0]))
        out.append(round(total, 4))
    return out


def sheets(path, out, name):
    common = "drawtext=text='%{pts\\:flt}':x=6:y=6:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.7"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-vf',
                    f'fps=4,scale=200:-2,{common.replace("20", "14")},tile=10x2', '-frames:v', '1',
                    str(out / f'{name}.sheet.jpg')], check=True)
    # face area: the middle 60% across, 30%..70% down (where a selfie face sits), 6 fps, larger
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-vf',
                    f'fps=6,crop=iw*0.6:ih*0.4:iw*0.2:ih*0.3,scale=260:-2,{common.replace("20", "16")},tile=8x4',
                    '-frames:v', '1', str(out / f'{name}.face.jpg')], check=True)


def check(path, out=None):
    path = Path(path)
    out = Path(out) if out else path.parent
    out.mkdir(parents=True, exist_ok=True)
    name = path.stem
    scales = zoom_track(path)
    zoom = max(abs(s - 1) for s in scales)
    subject = zoom_track(path, mask_fn=subject_mask)
    lean = max(abs(s - 1) for s in subject)
    fall = frames(path, 30, 108, 192)
    d = np.abs(np.diff(fall, axis=0)).mean(axis=(1, 2))
    med = float(np.median(d)) or 1e-6
    glitches = [round((i + 1) / 30, 2) for i, v in enumerate(d) if v > GLITCH_FACTOR * med and v > 6]
    sheets(path, out, name)
    fails = []
    if zoom > ZOOM_LIMIT: fails.append(f'zoom {zoom * 100:.1f}% (limit {ZOOM_LIMIT * 100:.0f}%)')
    if lean > LEAN_LIMIT: fails.append(f'subject scale {lean * 100:.1f}% (leans in or out; limit {LEAN_LIMIT * 100:.0f}%)')
    if glitches: fails.append(f'glitch frames at {glitches} s')
    report = {'clip': str(path), 'scales_8fps': scales, 'subject_scales_8fps': subject, 'max_subject_scale_pct': round(lean * 100, 1), 'max_zoom_pct': round(zoom * 100, 1),
              'glitch_seconds': glitches, 'auto_verdict': 'fail' if fails else 'pass', 'fails': fails,
              'still_to_check_by_eye': ['props through the face or hands (straws, cups, hair)', 'extra or melting fingers',
                                        'mouth forming words', 'teeth/eyes changing shape', 'identity drift from the still'],
              'sheet': str(out / f'{name}.sheet.jpg'), 'face_sheet': str(out / f'{name}.face.jpg')}
    (out / f'{name}.qc.json').write_text(json.dumps(report, indent=2))
    return report


if __name__ == '__main__':
    args = sys.argv[1:]
    out = None
    if '--out' in args:
        i = args.index('--out'); out = args[i + 1]; del args[i:i + 2]
    if not args: sys.exit(__doc__)
    for a in args:
        r = check(a, out)
        print(f"{Path(a).name}: {r['auto_verdict'].upper()}  zoom {r['max_zoom_pct']}%  subject {r['max_subject_scale_pct']}%  glitches {r['glitch_seconds'] or 'none'}"
              + (f"  ({'; '.join(r['fails'])})" if r['fails'] else ''))
