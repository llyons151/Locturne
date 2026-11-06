// Keyframed tracks: a figure's place, facing and pose over time. A pose can be a fixed Pose or a
// cycle (a function of time). A key can also carry a drive (a gait, push-ups): the segment that
// ends on it is then computed by code, blended in and out over BLEND seconds.
import type { Drive } from './gait';
import { lerpPose, type Pose } from './rig';

export type PoseSrc = Pose | ((t: number) => Pose);
export type Ease = 'linear' | 'inOut' | 'out' | 'back' | 'snap';
export type Key = {
  t: number;
  pos: [number, number, number];
  ry?: number;
  rz?: number;
  pose: PoseSrc;
  ease?: Ease;
  drive?: Drive;
};

const evalPose = (p: PoseSrc, t: number) => (typeof p === 'function' ? p(t) : p);
const c1 = 1.70158;
const c2 = c1 * 1.525;
export const easeFn: Record<Ease, (k: number) => number> = {
  linear: (k) => k,
  inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
  out: (k) => 1 - (1 - k) ** 3,
  // anticipation: dips back before going, overshoots and settles
  back: (k) => (k < 0.5 ? ((2 * k) ** 2 * ((c2 + 1) * 2 * k - c2)) / 2 : ((2 * k - 2) ** 2 * ((c2 + 1) * (k * 2 - 2) + c2) + 2) / 2),
  // fast in, overshoot, settle
  snap: (k) => 1 + (c1 + 1) * (k - 1) ** 3 + c1 * (k - 1) ** 2,
};

export type Sample = { pos: [number, number, number]; ry: number; rz: number; pose: Pose };
const BLEND = 0.12;

function mix(A: Sample, B: Sample, k: number): Sample {
  return {
    pos: [0, 1, 2].map((j) => A.pos[j] + (B.pos[j] - A.pos[j]) * k) as [number, number, number],
    ry: A.ry + (B.ry - A.ry) * k,
    rz: A.rz + (B.rz - A.rz) * k,
    pose: lerpPose(A.pose, B.pose, k),
  };
}
const at = (k: Key, t: number): Sample => ({ pos: k.pos, ry: k.ry ?? 0, rz: k.rz ?? 0, pose: evalPose(k.pose, t) });

export function sample(keys: Key[], t: number): Sample {
  if (t <= keys[0].t) return at(keys[0], t);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= b.t) continue;
    if (b.drive) {
      let s = b.drive(t, a.t, b.t, a.pos, b.pos);
      s = { ...s, ry: b.ry ?? s.ry };
      const kin = (t - a.t) / BLEND;
      if (kin < 1 && !a.drive) s = mix(at(a, t), s, easeFn.inOut(kin));
      const kout = (b.t - t) / BLEND;
      const next = keys[i + 2];
      if (kout < 1 && !(next && next.drive)) s = mix(at(b, t), s, easeFn.inOut(kout));
      return s;
    }
    // a drive blends out onto its end key, so plain segments always start from the key itself
    return mix(at(a, t), at(b, t), easeFn[b.ease ?? 'inOut']((t - a.t) / (b.t - a.t)));
  }
  return at(keys[keys.length - 1], t);
}

// piecewise value track for numbers (camera x, light levels, ...)
export function track(points: [number, number][], t: number, ease: Ease = 'inOut') {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [ta, va] = points[i];
    const [tb, vb] = points[i + 1];
    if (t < tb) return va + (vb - va) * easeFn[ease]((t - ta) / (tb - ta));
  }
  return points[points.length - 1][1];
}
