import type { Joint, JointPoint, PoseFrame } from './pushups.ts';

/** One demo push-up, down and up, in ms. */
export const DEMO_REP_MS = 1_800;

const DEG = Math.PI / 180;

/** Where an elbow of `upper` from `shoulder` and `fore` from `wrist` sits, bent back toward the feet (+x). */
function elbowBetween(shoulder: Point, wrist: Point, upper: number, fore: number): Point {
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const d = Math.min(upper + fore - 1e-6, Math.hypot(dx, dy));
  const a = (upper * upper - fore * fore + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const mx = shoulder.x + (a * dx) / d, my = shoulder.y + (a * dy) / d;
  // The perpendicular pointing toward the feet.
  const px = -dy / d, py = dx / d;
  const sign = px >= 0 ? 1 : -1;
  return { x: mx + sign * h * px, y: my + sign * h * py };
}

type Point = { x: number; y: number };

/**
 * A plank side-on at one moment of a push-up, in a view with the floor at `floor`: hands fixed,
 * the elbow at `elbowDeg`, and the shoulders as high as the arm reaches, moving forward over
 * the hands as they come down, as a real body does (the shoulders drop most of an arm's length).
 */
export function plankPose(
  elbowDeg: number,
  { upper, fore, wrist, ankle }: { upper: number; fore: number; wrist: Point; ankle: Point },
  c = 0.9,
): PoseFrame['joints'] {
  const reach = Math.sqrt(upper * upper + fore * fore - 2 * upper * fore * Math.cos(elbowDeg * DEG));
  // Straight arms stand over the hands; bent, the shoulders sit forward of them and low.
  const bend = Math.min(1, Math.max(0, (175 - elbowDeg) / 120));
  const forward = reach * 0.8 * bend;
  const shoulder = { x: wrist.x - forward, y: wrist.y - Math.sqrt(Math.max(0, reach * reach - forward * forward)) };
  const elbowAt = elbowBetween(shoulder, wrist, upper, fore);
  const along = (t: number) => ({ x: shoulder.x + (ankle.x - shoulder.x) * t, y: shoulder.y + (ankle.y - shoulder.y) * t });
  const nose = { x: shoulder.x - (upper + fore) * 0.24, y: shoulder.y - (upper + fore) * 0.05 };
  const at = (p: Point, sure = c): JointPoint => ({ x: p.x, y: p.y, c: sure });
  const joints: Partial<Record<Joint, JointPoint>> = { nose: at(nose) };
  for (const side of ['left', 'right'] as const) {
    // The far side a touch less sure, as the camera is.
    const sure = side === 'left' ? c : c * 0.7;
    joints[`${side}Shoulder`] = at(shoulder, sure);
    joints[`${side}Elbow`] = at(elbowAt, sure);
    joints[`${side}Wrist`] = at(wrist, sure);
    joints[`${side}Hip`] = at(along(0.5), sure);
    joints[`${side}Knee`] = at(along(0.76), sure);
    joints[`${side}Ankle`] = at(ankle, sure);
  }
  return joints;
}

/**
 * A pretend body doing push-ups side-on, for the web preview without a webcam (`?demo=1`) and
 * for the tests: the same joints the camera reports, in a `width` × `height` view, `ms` into
 * the set. The elbow swings 165° → 60° → 165° every `DEMO_REP_MS`.
 */
export function demoPose(ms: number, width: number, height: number): PoseFrame['joints'] {
  const phase = (ms % DEMO_REP_MS) / DEMO_REP_MS;
  const elbow = 165 - 105 * (0.5 - 0.5 * Math.cos(phase * 2 * Math.PI));
  const floor = height * 0.58;
  return plankPose(elbow, {
    upper: width * 0.2,
    fore: width * 0.19,
    wrist: { x: width * 0.3, y: floor },
    ankle: { x: width * 0.92, y: floor - width * 0.03 },
  });
}

/**
 * The wake lab's pretend scenes (You → Developer → Push-up preview), so every state of the
 * camera screen can be seen in a browser or on a phone without doing push-ups:
 * - `pushups`: good reps, as `demoPose`. `shallow`: dips that stop short. `quick`: reps too fast.
 * - `hold`: a plank, no reps. `standing`: curls standing up. `nobody`: an empty room.
 * - `tour`: all of them in a row, then good reps to the end.
 */
export type DemoScene = 'pushups' | 'shallow' | 'quick' | 'hold' | 'standing' | 'nobody' | 'tour';

/** The elbow swinging from `top` to `bottom` and back every `period` ms. */
const swing = (ms: number, period: number, top: number, bottom: number) =>
  top - (top - bottom) * (0.5 - 0.5 * Math.cos(((ms % period) / period) * 2 * Math.PI));

function plankIn(elbowDeg: number, width: number, height: number) {
  const floor = height * 0.58;
  return plankPose(elbowDeg, {
    upper: width * 0.2,
    fore: width * 0.19,
    wrist: { x: width * 0.3, y: floor },
    ankle: { x: width * 0.92, y: floor - width * 0.03 },
  });
}

const lowered = (joints: PoseFrame['joints'], dy: number) =>
  Object.fromEntries(Object.entries(joints).map(([name, p]) => [name, { ...p, y: p.y + dy }])) as PoseFrame['joints'];

/** Standing side-on, curling: the arms do a push-up's angles, but the torso is upright. */
function standingPose(ms: number, width: number, height: number): PoseFrame['joints'] {
  const x = width * 0.5;
  const upper = height * 0.1;
  const fore = height * 0.09;
  const shoulder = { x, y: height * 0.4 };
  const elbow = { x: x + width * 0.02, y: shoulder.y + upper };
  // Hanging straight down at 180°, curled up toward the shoulder at 40°.
  const bent = (180 - swing(ms, DEMO_REP_MS, 175, 45)) * DEG;
  const wrist = { x: elbow.x + fore * Math.sin(bent), y: elbow.y + fore * Math.cos(bent) };
  const at = (p: Point, c: number): JointPoint => ({ x: p.x, y: p.y, c });
  const joints: Partial<Record<Joint, JointPoint>> = { nose: at({ x: x + width * 0.06, y: height * 0.33 }, 0.9) };
  for (const side of ['left', 'right'] as const) {
    const c = side === 'left' ? 0.9 : 0.6;
    joints[`${side}Shoulder`] = at(shoulder, c);
    joints[`${side}Elbow`] = at(elbow, c);
    joints[`${side}Wrist`] = at(wrist, c);
    joints[`${side}Hip`] = at({ x, y: height * 0.6 }, c);
    joints[`${side}Knee`] = at({ x, y: height * 0.72 }, c);
    joints[`${side}Ankle`] = at({ x, y: height * 0.85 }, c);
  }
  return joints;
}

/** The tour, in order: each scene and how long it plays. The last one plays on to the end of the set. */
const TOUR: [Exclude<DemoScene, 'tour'>, number][] = [
  ['nobody', 2_500],
  ['standing', 4_000],
  ['pushups', 2 * DEMO_REP_MS],
  ['shallow', 2 * DEMO_REP_MS],
  ['quick', 1_500],
  ['nobody', 2_500],
  ['hold', 2_500],
  ['pushups', Infinity],
];

/** `scene`'s joints `ms` into it, in a `width` × `height` view. Every scene but `nobody` starts with a beat of empty room, like stepping back. */
export function scenePose(scene: DemoScene, ms: number, width: number, height: number): PoseFrame['joints'] {
  if (scene === 'tour') {
    let from = 0;
    for (const [part, length] of TOUR) {
      if (ms < from + length) return scenePose(part, ms - from + (part === 'nobody' ? 0 : SCENE_LEAD_MS), width, height);
      from += length;
    }
    return {};
  }
  if (scene === 'nobody' || ms < SCENE_LEAD_MS) return {};
  const t = ms - SCENE_LEAD_MS;
  switch (scene) {
    case 'pushups':
      return demoPose(t, width, height);
    case 'shallow': {
      // Half way down: the elbows stop at 122°, and the whole body sinks a little with them.
      const elbow = swing(t, DEMO_REP_MS, 165, 122);
      return lowered(plankIn(elbow, width, height), (165 - elbow) * width * 0.0012);
    }
    case 'quick':
      return plankIn(swing(t, 480, 165, 60), width, height);
    case 'hold':
      return plankIn(162 + 2 * Math.sin(t / 400), width, height);
    case 'standing':
      return standingPose(t, width, height);
  }
}

/** The empty beat before a scene's body appears. */
export const SCENE_LEAD_MS = 1_500;
