"""Print a timeline of a BVH clip (hip height, hands vs head, travel) to pick windows."""
import sys
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from retarget import parse, fk
joints, data, dt = parse(sys.argv[1])
step = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
P0 = fk(joints, data[0])
for k in range(0, len(data), max(1, int(step / dt))):
    P = fk(joints, data[k])
    hand = max(P['LeftHand'][1], P['RightHand'][1]) - P['Head'][1]
    d = P['Hips'] - P0['Hips']
    print(f"{k*dt:6.2f}s hipY {P['Hips'][1]:6.1f} handsOverHead {hand:6.1f} travel {np.hypot(d[0], d[2]):6.1f}")
