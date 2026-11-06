// Drives: segments where code, not keyframes, moves the body. Gaits plant each foot on the floor
// and solve the legs with IK, so feet never slide at natural speed; push-ups plant hands and feet.
import { POSES, SIZE, ik2, toLocal, type Pose, type V3 } from './rig';

export type Drive = (t: number, t0: number, t1: number, a: [number, number, number], b: [number, number, number]) => {
  pos: [number, number, number];
  ry: number;
  rz: number;
  pose: Pose;
};

const LEG = SIZE.thigh + SIZE.shin;
const FOOT_Y = SIZE.limbR + 0.004;

type GaitSpec = { stride: number; speed: number; stance: number; lift: number; hipY: number; bob: number; lean: number; arms: number; elbow: number };
export const WALK: GaitSpec = { stride: 0.62, speed: 1.55, stance: 0.5, lift: 0.1, hipY: 0.895, bob: 0.04, lean: -3, arms: 24, elbow: 14 };
export const SLUMP_WALK: GaitSpec = { ...WALK, stride: 0.5, speed: 1.2, lean: -15, arms: 10, elbow: 8, lift: 0.06 };
export const RUN: GaitSpec = { stride: 1.05, speed: 4.2, stance: 0.34, lift: 0.3, hipY: 0.86, bob: 0.06, lean: -15, arms: 42, elbow: 88 };

// one foot's offset from the hips (forward, up) at gait distance d
function foot(g: GaitSpec, d: number, offset: number) {
  const cyc = 2 * g.stride;
  const u = (((d + offset) % cyc) + cyc) % cyc / cyc;
  const reach = g.stance * g.stride; // ahead of the hips at contact
  if (u < g.stance) {
    // planted: slides back relative to the hips exactly as fast as the body moves
    return { x: reach - u * cyc, y: 0, planted: true, u };
  }
  const k = (u - g.stance) / (1 - g.stance);
  const e = k * k * (3 - 2 * k);
  return { x: -reach + e * (2 * reach), y: g.lift * Math.sin(Math.PI * k), planted: false, u };
}

export function gait(g: GaitSpec, slumped = false): Drive {
  return (t, t0, t1, a, b) => {
    const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    const pos: [number, number, number] = [a[0] + (b[0] - a[0]) * k, 0, a[2] + (b[2] - a[2]) * k];
    // gait distance runs at the natural speed; any extra travel is the cartoon "time skip" the
    // original hides under motion blur
    const d = g.speed * (t - t0);
    const L = foot(g, d, 0);
    const R = foot(g, d, g.stride);
    const flight = g.stance < 0.5 ? Math.max(0, Math.sin(((d / g.stride) % 1) * Math.PI)) : 0;
    const hipY = g.hipY - g.bob * (0.5 + 0.5 * Math.cos((2 * Math.PI * d) / g.stride)) + flight * g.bob * 0.6;
    pos[1] = hipY;
    const leg = (f: { x: number; y: number }) => ik2(SIZE.thigh, SIZE.shin, f.x, FOOT_Y + f.y - hipY, -1);
    const [lh, lk] = leg(L);
    const [rh, rk] = leg(R);
    const sw = (f: { x: number }) => f.x / (g.stance * g.stride);
    const pose: Pose = {
      ...POSES.stand,
      spine: [0, 0, g.lean],
      neck: [0, 0, slumped ? -16 : -g.lean * 0.6],
      lHip: [0, 0, lh],
      lKnee: [0, 0, lk],
      rHip: [0, 0, rh],
      rKnee: [0, 0, rk],
      lSh: [6, 0, -g.arms * sw(L)],
      rSh: [6, 0, -g.arms * sw(R)],
      lEl: [0, 0, g.elbow],
      rEl: [0, 0, g.elbow],
    };
    return { pos, ry: 0, rz: 0, pose };
  };
}

// contact times (seconds) of every footfall in a gait segment, for footstep sounds
export function footfalls(g: GaitSpec, t0: number, t1: number) {
  const out: number[] = [];
  const cyc = 2 * g.stride;
  for (const off of [0, g.stride]) {
    for (let n = 0; ; n++) {
      const d = n * cyc - off;
      if (d < 0) continue;
      const t = t0 + d / g.speed;
      if (t > t1) break;
      out.push(t);
    }
  }
  return out.sort((x, y) => x - y);
}

// push-ups: feet are a pivot on the floor, the body is a rigid plank rocking about them, and the
// hands stay planted while the arms bend
export const PUSHUP_FEET: [number, number] = [1.82, FOOT_Y];
export const PUSHUP_HANDS: [number, number] = [3.07, FOOT_Y];
export const PUSHUP_RATE = 2.6;
export const pushupDepthAt = (t: number) => (1 - Math.cos(t * Math.PI * 2 * PUSHUP_RATE)) / 2;

export function plankAt(depth: number) {
  const alpha = ((25 - 13 * depth) * Math.PI) / 180;
  const hip: [number, number] = [PUSHUP_FEET[0] + LEG * Math.cos(alpha), PUSHUP_FEET[1] + LEG * Math.sin(alpha)];
  const rz = -(90 - (alpha * 180) / Math.PI);
  const hand = toLocal(hip, 0, rz, PUSHUP_HANDS[0], PUSHUP_HANDS[1]);
  const sh = SIZE.torso - 0.04;
  const [s1, e1] = ik2(SIZE.upperArm, SIZE.foreArm + 0.02, hand[0], hand[1] - sh, 1);
  const arm: V3 = [0, 0, s1];
  const el: V3 = [0, 0, e1];
  const pose: Pose = { ...POSES.plankUp, lSh: arm, rSh: arm, lEl: el, rEl: el, neck: [0, 0, 8 + 8 * depth] };
  return { pos: [hip[0], hip[1], 0] as [number, number, number], rz, pose };
}

export const pushupDrive: Drive = (t, t0) => {
  const p = plankAt(pushupDepthAt(t - t0));
  return { pos: p.pos, ry: 0, rz: p.rz, pose: p.pose };
};
