"""Retarget a CMU BVH clip onto the reel's capsule stick figure.

Reads the BVH, runs forward kinematics to get every joint's world position per frame, then
expresses each limb's direction in its parent's frame as the rig's joint angles (degrees):
limbs rest pointing down; +z swings forward; x raises out to the side. The root is yaw-only,
so bending shows up in the spine angle. Output: JSON at 60 fps.

usage: python3 -I retarget.py clip.bvh out.json [start_s] [end_s]
"""
import json
import math
import sys

import numpy as np


def parse(path):
    toks = open(path).read().split()
    i = 0
    joints = []  # (name, parent, offset, channels)
    stack = []

    def take():
        nonlocal i
        i += 1
        return toks[i - 1]

    while True:
        t = take()
        if t in ('ROOT', 'JOINT'):
            name = take()
            joints.append({'name': name, 'parent': stack[-1] if stack else None, 'offset': None, 'ch': []})
            stack.append(len(joints) - 1)
        elif t == 'End':
            take()  # Site
            joints.append({'name': joints[stack[-1]]['name'] + '_end', 'parent': stack[-1], 'offset': None, 'ch': []})
            stack.append(len(joints) - 1)
        elif t == 'OFFSET':
            joints[stack[-1]]['offset'] = np.array([float(take()) for _ in range(3)])
        elif t == 'CHANNELS':
            n = int(take())
            joints[stack[-1]]['ch'] = [take() for _ in range(n)]
        elif t == '}':
            stack.pop()
        elif t == 'MOTION':
            break
    take()
    frames = int(take())
    take(); take()
    dt = float(take())
    ncols = sum(len(j['ch']) for j in joints)
    data = np.array(toks[i:i + frames * ncols], dtype=float).reshape(frames, ncols)
    return joints, data, dt


def rot(axis, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    if axis == 'X':
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == 'Y':
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def fk(joints, row):
    pos, R = {}, {}
    col = 0
    for idx, j in enumerate(joints):
        M = np.eye(3)
        p = np.zeros(3)
        for ch in j['ch']:
            v = row[col]
            col += 1
            if ch.endswith('position'):
                p['XYZ'.index(ch[0])] = v
            else:
                M = M @ rot(ch[0], v)
        if j['parent'] is None:
            pos[idx] = p + j['offset']
            R[idx] = M
        else:
            pp = j['parent']
            pos[idx] = pos[pp] + R[pp] @ j['offset']
            R[idx] = R[pp] @ M
    return {joints[k]['name']: v for k, v in pos.items()}


def unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def limb_angles(d):
    """direction d in parent frame -> (ax, az) with d = Rx(ax) Rz(az) (0,-1,0)"""
    d = unit(d)
    az = math.atan2(d[0], math.hypot(d[1], d[2]))
    ax = math.atan2(-d[2], -d[1]) if math.hypot(d[1], d[2]) > 1e-6 else 0.0
    return math.degrees(ax), math.degrees(az)


def limb_frame(ax, az):
    return rot('X', ax) @ rot('Z', az)


def retarget(path, t0=0.0, t1=None):
    joints, data, dt = parse(path)
    n = len(data)
    t1 = t1 if t1 is not None else n * dt
    up = np.array([0.0, 1.0, 0.0])
    P0 = fk(joints, data[0])
    their_leg = np.linalg.norm(P0['LeftUpLeg'] - P0['LeftLeg']) + np.linalg.norm(P0['LeftLeg'] - P0['LeftFoot'])
    scale = 0.86 / their_leg
    # the floor: the lowest a foot gets over the whole clip
    floor = min(min(fk(joints, data[k])[nm][1] for nm in ('LeftFoot', 'RightFoot')) for k in range(0, n, 4))
    out = []
    origin = None
    f0 = None
    yaw0 = None
    t = t0
    while t < t1 - 1e-9:
        k = min(n - 1, int(round(t / dt)))
        P = fk(joints, data[k])
        right = P['RightUpLeg'] - P['LeftUpLeg']
        right[1] = 0
        right = unit(right)
        fwd = unit(np.cross(up, right))
        yaw = math.degrees(math.atan2(-fwd[2], fwd[0]))
        if origin is None:
            origin, f0, yaw0 = P['Hips'].copy(), fwd.copy(), yaw
        r0 = unit(np.cross(f0, up))
        B = np.stack([fwd, up, right])  # world -> body (rows)
        loc = lambda v: B @ v
        # spine: hips -> neck
        neck_name = 'Neck' if 'Neck' in P else 'Neck1'
        tvec = loc(P[neck_name] - P['Hips'])
        sz = math.degrees(math.atan2(-tvec[0], tvec[1]))
        Rs = rot('Z', sz)
        sl = lambda v: Rs.T @ loc(v)
        hv = sl(P['Head'] - P[neck_name])
        nz = math.degrees(math.atan2(-hv[0], hv[1])) * 0.7
        pose = {'spine': [0, 0, sz], 'neck': [0, 0, nz]}
        for side, pre, mir in (('l', 'Left', 1), ('r', 'Right', -1)):
            ua = sl(P[pre + 'ForeArm'] - P[pre + 'Arm'])
            ax, az = limb_angles(ua)
            fa = limb_frame(ax, az).T @ sl(P[pre + 'Hand'] - P[pre + 'ForeArm'])
            ex, ez = limb_angles(fa)
            # the rig mirrors x for the right side (rot x * -side, side = +1 right, -1 left)
            pose[side + 'Sh'] = [ax * mir, 0, az]
            pose[side + 'El'] = [ex * mir, 0, ez]
            th = loc(P[pre + 'Leg'] - P[pre + 'UpLeg'])
            hx, hz = limb_angles(th)
            sh = limb_frame(hx, hz).T @ loc(P[pre + 'Foot'] - P[pre + 'Leg'])
            _, kz = limb_angles(sh)
            pose[side + 'Hip'] = [hx * mir * 0.6, 0, hz]
            pose[side + 'Knee'] = [0, 0, min(0.0, kz)]
        d = P['Hips'] - origin
        out.append({
            'x': float(np.dot(d, f0) * scale),
            'z': float(np.dot(d, r0) * scale),
            # the rig's root is the hip sockets, not CMU's Hips joint (which sits above them)
            'y': float(((P['LeftUpLeg'][1] + P['RightUpLeg'][1]) / 2 - floor) * scale + 0.052),
            'ry': float(((yaw - yaw0 + 180) % 360) - 180),
            'pose': {k: [round(float(a), 2) for a in v] for k, v in pose.items()},
        })
        t += 1 / 60
    # feet on the floor: shift so the lowest foot over the clip touches y = 0 at rest
    return {'fps': 60, 'frames': out, 'scale': scale}


if __name__ == '__main__':
    a = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
    b = float(sys.argv[4]) if len(sys.argv) > 4 else None
    res = retarget(sys.argv[1], a, b)
    json.dump(res, open(sys.argv[2], 'w'), separators=(',', ':'))
    fr = res['frames']
    print(len(fr), 'frames; hip y', round(min(f['y'] for f in fr), 3), '-', round(max(f['y'] for f in fr), 3), '; travel x', round(fr[-1]['x'], 2))
