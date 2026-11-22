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
  | 'danceTour'
  // Pull-ups, facing the camera (wake/pullups.ts): good reps, a dead hang, half reps, air
  // pull-downs standing (the hands move, not the body), squatting under the bar (the feet stay
  // on the floor), and all of them in a row ending in good reps.
  | 'pullups'
  | 'pullHang'
  | 'pullHalf'
  | 'pullAir'
  | 'pullSquat'
  | 'pullTour'
  // The bench press, side-on (wake/bench.ts): good reps, holding the bar locked out, half reps
  // that never reach the chest, pressing air lying in bed (the legs flat), and the tour.
  | 'bench'
  | 'benchHold'
  | 'benchHalf'
  | 'benchBed'
  | 'benchTour';

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
  if (scene === 'tour' || scene === 'danceTour' || scene === 'pullTour' || scene === 'benchTour') {
    let from = 0;
    const tour = scene === 'tour' ? TOUR : scene === 'danceTour' ? DANCE_TOUR : scene === 'pullTour' ? PULL_TOUR : BENCH_TOUR;
    for (const [part, length] of tour) {
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
    case 'dance':
    case 'danceStill':
    case 'danceArms':
    case 'danceSitting':
      return danceScene(scene, t, width, height);
    default:
      return travelScene(scene, t, width, height);
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

/** One demo pull-up, up and down, in ms; one bench press. */
export const DEMO_PULL_MS = 2_400;
export const DEMO_BENCH_MS = 2_000;

/** The elbow between `shoulder` and `wrist`, bent out to the side (`out` is -1 left, 1 right). */
function elbowOut(shoulder: Point, wrist: Point, upper: number, fore: number, out: number): Point {
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const d = Math.max(1e-6, Math.min(upper + fore - 1e-6, Math.hypot(dx, dy)));
  const a = (upper * upper - fore * fore + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const px = -dy / d, py = dx / d;
  const sign = px * out >= 0 ? 1 : -1;
  return { x: shoulder.x + (a * dx) / d + sign * h * px, y: shoulder.y + (a * dy) / d + sign * h * py };
}

/**
 * Hanging from a bar facing the camera, in a `width` × `height` view, `pull` 0 (dead hang) to 1
 * (chin over the bar). The hands stay on the bar and the body rises under them, legs and all.
 * `handsDown` moves the hands down instead, the body still (air pull-downs standing up);
 * `feetDown` keeps the feet on the floor, the knees bending (squatting under a bar).
 */
export function hangPose(
  width: number,
  height: number,
  pull: number,
  { handsDown = false, feetDown = false, grip = 1 }: { handsDown?: boolean; feetDown?: boolean; grip?: number } = {},
  c = 0.9,
): PoseFrame['joints'] {
  // Sized and placed as the phone sees you from a few steps, tilted up: the bar a third down, the feet above the ledge.
  const u = Math.min(width * 0.75, height * 0.4);
  const cx = width / 2;
  const torso = u * 0.36;
  const upper = torso * 0.62;
  const fore = torso * 0.56;
  const barY = height * 0.3;
  const shoulderHalf = torso * 0.42;
  const gripHalf = shoulderHalf * (1 + 0.5 * grip);
  // How far below the hands the shoulders hang: arms all but straight, to the chin at the bar.
  const hangDrop = Math.sqrt(Math.max(0, (upper + fore) ** 2 * 0.985 - (gripHalf - shoulderHalf) ** 2));
  const topDrop = (upper + fore) * 0.22;
  const p = Math.min(1, Math.max(0, pull));
  const drop = hangDrop - (hangDrop - topDrop) * p;
  // Air pull-downs: the body stays at the hang's height, and the hands come down toward it.
  const sy = handsDown ? barY + hangDrop : barY + drop;
  const handY = handsDown ? sy - drop : barY;
  const hy = sy + torso;
  const legLen = torso * 1.6;
  const floorAnkle = barY + hangDrop + torso + legLen;
  const at = (x: number, y: number, sure = c): JointPoint => ({ x, y, c: sure });
  const joints: Partial<Record<Joint, JointPoint>> = { nose: at(cx, sy - torso * 0.3) };
  for (const [side, dir] of [['left', -1], ['right', 1]] as const) {
    const shoulder = { x: cx + dir * shoulderHalf, y: sy };
    const wrist = { x: cx + dir * gripHalf, y: handY };
    const elbow = elbowOut(shoulder, wrist, upper, fore, dir);
    joints[`${side}Shoulder`] = at(shoulder.x, shoulder.y);
    joints[`${side}Elbow`] = at(elbow.x, elbow.y);
    joints[`${side}Wrist`] = at(wrist.x, wrist.y);
    joints[`${side}Hip`] = at(cx + dir * torso * 0.24, hy);
    if (feetDown) {
      // The feet planted where a hang's would be; the knees take up the difference, out to the side.
      const kneeY = hy + (floorAnkle - hy) / 2;
      const spare = Math.max(0, legLen - (floorAnkle - hy));
      joints[`${side}Knee`] = at(cx + dir * (torso * 0.24 + spare * 0.6), kneeY);
      joints[`${side}Ankle`] = at(cx + dir * torso * 0.22, floorAnkle);
    } else {
      joints[`${side}Knee`] = at(cx + dir * torso * 0.22, hy + legLen * 0.5);
      joints[`${side}Ankle`] = at(cx + dir * torso * 0.2, hy + legLen);
    }
  }
  return joints;
}

/**
 * Lying on a bench side-on to the phone (the phone on its side, so `width` is the long way),
 * `down` 0 (arms locked out, the bar over the shoulders) to 1 (the bar on the chest). The head is
 * to the left; the feet are on the floor past the bench's end. `bed` lies flat instead, the legs
 * out straight, the feet as high as the hips (pressing air in bed).
 */
export function benchPose(width: number, height: number, down: number, { bed = false }: { bed?: boolean } = {}, c = 0.9): PoseFrame['joints'] {
  const torso = Math.min(width * 0.2, height * 0.27);
  const upper = torso * 0.6;
  const fore = torso * 0.55;
  const thigh = torso * 0.85;
  const shin = torso * 0.8;
  const d = Math.min(1, Math.max(0, down));
  const cx = width / 2;
  // The body clear of the bubble and the ledge.
  const lieY = height * 0.44;
  const shoulder = { x: cx - torso * 0.7, y: lieY };
  const hip = { x: shoulder.x + torso, y: lieY + torso * 0.04 };
  // The bar comes down to the chest, a little toward the hips, from straight over the shoulders.
  const reach = (upper + fore) * (0.995 - 0.72 * d);
  const wrist = { x: shoulder.x + torso * (0.05 + 0.25 * d), y: shoulder.y - reach };
  // The elbow: where the two bones meet, on the side toward the floor (it drops below the bench at the bottom).
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const dist = Math.max(1e-6, Math.min(upper + fore - 1e-6, Math.hypot(dx, dy)));
  const along = (upper * upper - fore * fore + dist * dist) / (2 * dist);
  const off = Math.sqrt(Math.max(0, upper * upper - along * along));
  const ex = shoulder.x + (along * dx) / dist, ey = shoulder.y + (along * dy) / dist;
  const elbow = [{ x: ex - (off * dy) / dist, y: ey + (off * dx) / dist }, { x: ex + (off * dy) / dist, y: ey - (off * dx) / dist }].sort((p, q) => q.y - p.y)[0];
  const knee = bed ? { x: hip.x + thigh, y: hip.y } : { x: hip.x + thigh * 0.85, y: hip.y + thigh * 0.5 };
  const ankle = bed ? { x: knee.x + shin, y: knee.y } : { x: knee.x + shin * 0.15, y: knee.y + shin * 0.98 };
  const at = (p: { x: number; y: number }, sure = c): JointPoint => ({ x: p.x, y: p.y, c: sure });
  const joints: Partial<Record<Joint, JointPoint>> = { nose: at({ x: shoulder.x - torso * 0.3, y: shoulder.y - torso * 0.12 }) };
  for (const s of ['left', 'right'] as const) {
    // The far side is the camera's guess.
    const sure = s === 'left' ? c : c * 0.7;
    joints[`${s}Shoulder`] = at(shoulder, sure);
    joints[`${s}Elbow`] = at(elbow, sure);
    joints[`${s}Wrist`] = at(wrist, sure);
    joints[`${s}Hip`] = at(hip, sure);
    joints[`${s}Knee`] = at(knee, sure);
    joints[`${s}Ankle`] = at(ankle, sure);
  }
  return joints;
}

/** One press, 0 (locked out) to 1 (the chest), with a beat at the lockout as a lifter takes. */
const pressWave = (ms: number) => Math.max(0, (wave(ms, DEMO_BENCH_MS) - 0.15) / 0.85);

/** The pull-up and bench press scenes' joints `ms` in. */
function travelScene(scene: DemoScene, ms: number, width: number, height: number): PoseFrame['joints'] {
  switch (scene) {
    case 'pullups':
      return hangPose(width, height, wave(ms, DEMO_PULL_MS));
    case 'pullHang':
      return hangPose(width, height, 0.03 * wave(ms, 3_000));
    case 'pullHalf':
      return hangPose(width, height, 0.5 * wave(ms, DEMO_PULL_MS));
    case 'pullAir':
      return hangPose(width, height, wave(ms, DEMO_PULL_MS), { handsDown: true });
    case 'pullSquat':
      return hangPose(width, height, wave(ms, DEMO_PULL_MS), { feetDown: true });
    case 'bench':
      return benchPose(width, height, pressWave(ms));
    case 'benchHold':
      return benchPose(width, height, 0.04 * wave(ms, 3_000));
    case 'benchHalf':
      return benchPose(width, height, 0.45 * pressWave(ms));
    case 'benchBed':
      return benchPose(width, height, pressWave(ms), { bed: true });
    default:
      return {};
  }
}

const PULL_TOUR: [DemoScene, number][] = [
  ['nobody', 2_000],
  ['pullAir', 2 * DEMO_PULL_MS],
  ['pullHang', 2_500],
  ['pullups', 2 * DEMO_PULL_MS],
  ['pullHalf', 2 * DEMO_PULL_MS],
  ['pullSquat', 2 * DEMO_PULL_MS],
  ['pullups', Infinity],
];

const BENCH_TOUR: [DemoScene, number][] = [
  ['nobody', 2_000],
  ['benchBed', 2 * DEMO_BENCH_MS],
  ['benchHold', 2_500],
  ['bench', 2 * DEMO_BENCH_MS],
  ['benchHalf', 2 * DEMO_BENCH_MS],
  ['bench', Infinity],
];

/** A push-up scene's pull-up or bench press twin, so the wake lab's one scene picker works for every exercise. */
export function sceneFor(exercise: 'pushups' | 'dance' | 'pullups' | 'bench', scene: DemoScene): DemoScene {
  if (exercise === 'dance') return danceSceneFor(scene);
  if (exercise === 'pushups') return scene;
  const twins: Record<'pullups' | 'bench', Partial<Record<DemoScene, DemoScene>>> = {
    pullups: { pushups: 'pullups', quick: 'pullups', hold: 'pullHang', shallow: 'pullHalf', standing: 'pullAir', tour: 'pullTour' },
    bench: { pushups: 'bench', quick: 'bench', hold: 'benchHold', shallow: 'benchHalf', standing: 'benchBed', tour: 'benchTour' },
  };
  return twins[exercise][scene] ?? scene;
}

/** The empty beat before a scene's body appears. */
export const SCENE_LEAD_MS = 1_500;
