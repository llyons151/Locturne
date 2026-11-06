"""Export the CMU clips the reels use into src/mocap/*.json (60 fps, rig angles).

CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), BVH conversion by Bruce Hahne,
mirrored at github.com/meshula/cmu-mocap. Free to use for any purpose.
"""
import json
import sys
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from retarget import retarget

SRC = sys.argv[1]  # folder with the .bvh files
OUT = sys.argv[2]
CLIPS = {
    # name: (file, start s, end s, loop, detrend height)
    'run': ('09_01', 0.15, 1.24, False, False),
    'runStart': ('16_55', 0.0, 1.5, False, False),
    'walk': ('07_01', 0.5, 2.6, True, True),
    'zombie': ('20_08', 0.1, 1.9, True, True),
    'stretch': ('56_07', 2.6, 6.4, False, False),
    'standUp': ('13_01', 7.2, 8.9, False, False),
}

def vec(f):
    return np.array([a for v in f['pose'].values() for a in v])

for name, (fid, a, b, loop, detrend) in CLIPS.items():
    res = retarget(f'{SRC}/{fid}.bvh', a, b)
    fr = res['frames']
    if loop:
        # trim so the last frame flows into the first: best pose match after at least 0.8 s
        v0 = vec(fr[0])
        best = min(range(48, len(fr)), key=lambda k: np.abs(vec(fr[k]) - v0).mean())
        fr = fr[:best]
    if detrend:
        ys = np.array([f['y'] for f in fr])
        line = np.linspace(ys[0], ys[-1], len(ys)) if not loop else np.polyval(np.polyfit(np.arange(len(ys)), ys, 1), np.arange(len(ys)))
        base = 0.895 if name == 'walk' else 0.86
        for f, y, l in zip(fr, ys, line):
            f['y'] = float(base + (y - l))
    # facing: keep yaw relative and gentle
    for f in fr:
        f['ry'] = round(f['ry'], 2)
        f['x'] = round(f['x'], 4)
        f['y'] = round(f['y'], 4)
        f['z'] = round(f['z'], 4)
    json.dump({'fps': 60, 'loop': loop, 'source': f'CMU {fid}', 'frames': fr}, open(f'{OUT}/{name}.json', 'w'), separators=(',', ':'))
    print(f"{name:9s} {fid} {len(fr)/60:5.2f}s travel {fr[-1]['x']:5.2f} hipY {min(f['y'] for f in fr):.2f}-{max(f['y'] for f in fr):.2f}")
