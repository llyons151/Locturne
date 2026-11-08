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
  return plankIn(elbow, width, height);
}

/**
 * The wake lab's pretend scenes (You → Developer → Push-up preview), so every state of the
 * camera screen can be seen in a browser or on a phone without doing push-ups:
 * - `pushups`: good reps, as `demoPose`. `shallow`: dips that stop short. `quick`: reps too fast.
 * - `hold`: a plank, no reps. `standing`: curls standing up. `nobody`: an empty room.
 * - `tour`: all of them in a row, then good reps to the end.
 */
export type DemoScene =
  | 'pushups'
  | 'shallow'
  | 'quick'
  | 'hold'
  | 'standing'
  | 'nobody'
  | 'tour'
  // Dance, front-on (wake/dance.ts): a bounce with the arms going, standing still, arms only,
  // sitting on the bed's edge, and all of them in a row ending in a good dance.
  | 'dance'
  | 'danceStill'
  | 'danceArms'
  | 'danceSitting'
  | 'danceTour';

/** One bounce, down and up, in ms. */
export const DEMO_BOUNCE_MS = 600;

/**
 * A pretend body front-on to the phone, for dance: `bounce` 0–1 drops the hips and bends the
 * knees out (the feet stay put), `arms` 0–1 swings the forearms from down by the sides to up
 * overhead. `sitting` folds the thighs toward the camera, the knees level with the hips.
 */
export function frontPose(
  width: number,
  height: number,
  { bounce = 0, arms = 0, sitting = false }: { bounce?: number; arms?: number; sitting?: boolean } = {},
  c = 0.9,
): PoseFrame['joints'] {
  const u = Math.min(width, height * 0.62);
  const cx = width / 2;
  const torso = u * 0.42;
  const top = height * 0.2;
  const drop = bounce * torso * 0.16 + (sitting ? torso * 0.75 : 0);
  const sy = top + torso * 0.25 + drop;
  const hy = sy + torso;
  const ankleY = top + torso * 2.55;
  const kneeY = sitting ? hy + torso * 0.08 : hy + (ankleY - hy) * 0.5 + bounce * torso * 0.04;
  const at = (x: number, y: number, sure = c): JointPoint => ({ x, y, c: sure });
  const joints: Partial<Record<Joint, JointPoint>> = { nose: at(cx, sy - torso * 0.3) };
  for (const [side, dir] of [['left', -1], ['right', 1]] as const) {
    const sx = cx + dir * torso * 0.4;
    joints[`${side}Shoulder`] = at(sx, sy);
    // Upper arm out to the side; the forearm swings from hanging down to straight up.
    const ex = sx + dir * torso * 0.25;
    const ey = sy + torso * 0.35 - arms * torso * 0.3;
    joints[`${side}Elbow`] = at(ex, ey);
    const swingRad = arms * Math.PI;
    joints[`${side}Wrist`] = at(ex + dir * torso * 0.12 * Math.sin(swingRad), ey + torso * 0.38 * Math.cos(swingRad));
    joints[`${side}Hip`] = at(cx + dir * torso * 0.22, hy);
    joints[`${side}Knee`] = at(cx + dir * torso * (0.24 + bounce * 0.12), kneeY);
    joints[`${side}Ankle`] = at(cx + dir * torso * 0.24, sitting ? kneeY + torso * 0.6 : ankleY);
  }
  return joints;
}

/** 0 → 1 → 0 every `period` ms. */
const wave = (ms: number, period: number) => 0.5 - 0.5 * Math.cos(((ms % period) / period) * 2 * Math.PI);

/** The dance scenes' joints `ms` in. */
function danceScene(scene: 'dance' | 'danceStill' | 'danceArms' | 'danceSitting', ms: number, width: number, height: number) {
  switch (scene) {
    case 'dance':
      return frontPose(width, height, { bounce: wave(ms, DEMO_BOUNCE_MS), arms: wave(ms, DEMO_BOUNCE_MS * 2) });
    case 'danceStill':
      // A body breathing: barely moving.
      return frontPose(width, height, { bounce: 0.02 * wave(ms, 3_000) });
    case 'danceArms':
      return frontPose(width, height, { arms: wave(ms, DEMO_BOUNCE_MS * 1.5) });
    case 'danceSitting':
      return frontPose(width, height, { sitting: true, arms: wave(ms, DEMO_BOUNCE_MS * 1.5) });
  }
}

/** The dance tour: each scene and how long it plays; the last plays on. */
const DANCE_TOUR: [Exclude<DemoScene, 'tour' | 'danceTour'>, number][] = [
  ['nobody', 2_000],
  ['danceSitting', 3_000],
  ['danceStill', 3_000],
  ['danceArms', 3_000],
  ['dance', 4_000],
  ['danceStill', 2_500],
  ['dance', Infinity],
];

/** The elbow swinging from `top` to `bottom` and back every `period` ms. */
const swing = (ms: number, period: number, top: number, bottom: number) =>
  top - (top - bottom) * (0.5 - 0.5 * Math.cos(((ms % period) / period) * 2 * Math.PI));

/**
 * A plank in a `width` × `height` view. Upright the body is sized to the width; on a sideways
 * (wide) screen, to the height, centred, with the floor lower, as a real body two steps away is.
 */
function plankIn(elbowDeg: number, width: number, height: number) {
  const wide = width > height;
  const u = wide ? Math.min(width, height * 1.15) : width;
  const left = (width - u) / 2;
  const floor = height * (wide ? 0.72 : 0.58);
  return plankPose(elbowDeg, {
    upper: u * 0.2,
    fore: u * 0.19,
    wrist: { x: left + u * 0.3, y: floor },
    ankle: { x: left + u * 0.92, y: floor - u * 0.03 },
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
  if (scene === 'tour' || scene === 'danceTour') {
    let from = 0;
    for (const [part, length] of scene === 'tour' ? TOUR : DANCE_TOUR) {
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
    default:
      return danceScene(scene, t, width, height);
  }
}

/** A push-up scene's dance twin, so the wake lab's one scene picker works for both. Dance scenes are kept. */
export function danceSceneFor(scene: DemoScene): DemoScene {
  const twin: Partial<Record<DemoScene, DemoScene>> = {
    pushups: 'dance',
    quick: 'dance',
    hold: 'danceStill',
    shallow: 'danceArms',
    standing: 'danceArms',
    tour: 'danceTour',
  };
  return twin[scene] ?? scene;
}

/** The empty beat before a scene's body appears. */
export const SCENE_LEAD_MS = 1_500;
