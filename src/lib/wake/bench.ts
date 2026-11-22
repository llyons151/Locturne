/**
 * Bench press (2026-11-21, user: "build a bench press mode out fully, it should track u benching
 * and wake up to that"; it took squats' place in the grid the same day). The phone lies on its
 * side on the floor beside the bench, a few steps away, so it sees you side-on, feet too. (From
 * the foot end the torso points at the lens and reads as sitting up: side-on only.) Nothing is
 * recorded.
 *
 * What's measured is how high the wrists (the bar) are above the shoulders, against the same
 * height at lockout (`top`): `r` is 1 with the arms locked and about 0.3 with the bar on the
 * chest. Up in the picture is up in the room (the phone stands on the floor), so it doesn't
 * matter which way you lie, and against your own lockout it doesn't matter how far away you are.
 * The lockout is relearned at every one, so shuffling the phone mid-set is fine.
 *
 * A rep (wake/travel.ts): locked out (`r` ≥ `topR`, elbows straight where readable) for two
 * frames, down to the chest (`r` ≤ `downR`, or the elbow bent past `downElbowDeg` with the bar
 * at least `elbowR` down) for two frames, then locked out again, where it counts.
 *
 * The cheats and look-alikes:
 * - Pressing air in bed, or lying on the floor: the legs lie flat, the feet up at the hips. On a
 *   bench the feet are on the floor, well below the hips (`minFeetDrop`); the rep doesn't count
 *   (`bed`). That's why the feet have to be in the picture.
 * - Standing or sitting presses (overhead, shoulder press): the torso is upright, not lying.
 * - Push-ups: lying, but the arms point down at the floor, never up: never locked out.
 * - Half reps, lockout bounces: the bar has to reach the chest (`shallow`) and lock out again
 *   (`rest`) each time.
 * - Unracking and holding, walking the bar back to the rack: locked out the whole time.
 *
 * Tuned on 46 real clips (2026-11-21, docs/PULLUP_TESTS.md "Bench press"): every bed, floor,
 * standing, seated, push-up, half-rep and holding clip reads 0. Side-on with the whole body in
 * view, reps count; right up against the plates, the plate hides the arm at the chest and reps
 * are missed, so the setup asks for a few steps back. A dumbbell fly counts (the pose model reads
 * its elbows as bent): it's still a morning on a bench. JS, so retunable by update.
 */
import type { PoseFrame } from './pushups.ts';
import { distance, midOf, tiltFromUpright, type Cheat, type Pt, type Reading, type TravelRules } from './travel.ts';

export const BENCH = {
  /** The default goal; the routine's `benchGoal` sets the real one. */
  reps: 10,
  minConfidence: 0.2,
  restFrames: 2,
  workFrames: 2,
  /** Locked out: the wrists at least this share of the lockout height above the shoulders… */
  topR: 0.88,
  /** …with the elbows (where readable) at least this straight. */
  topElbowDeg: 145,
  /** The first lockout, before there's one to measure against: the wrists this share of the arm's length above the shoulders… */
  firstTopReach: 0.7,
  /** At the chest: the wrists at most this share of the lockout height above the shoulders (the bar on the chest is about 0.3). */
  downR: 0.45,
  /** Or an elbow at most this bent, with the bar down at least to `elbowR`. */
  downElbowDeg: 90,
  elbowR: 0.5,
  /**
   * At the chest the elbow is bent at least this far: on clean reps it reads 45–90° there. A
   * wrist read low with the elbow at 115–140° was the camera, on a clip of the bar held up (real clips).
   */
  maxDownElbowDeg: 115,
  /** The arms at lockout lean at most this far from straight up, in degrees: you press against gravity. */
  maxArmLeanDeg: 40,
  /** The torso lies at least this far from upright, in degrees (an incline bench is about 45–60°). */
  minLieDeg: 45,
  /**
   * On a bench the ankles are at least this many torsos below the hips, smoothed (`feetEase`); in
   * bed or on the floor they're about level. Real clips (2026-11-21): benches 0.40–1.19 (median
   * per clip), floor presses, legs-flat presses and lying on a mat 0.08–0.25. Frame to frame a real
   * bench reads anywhere from 0 to 0.6, so one frame says nothing.
   */
  minFeetDrop: 0.33,
  feetEase: 0.1,
  /** The lockout height's smoothing on each lockout frame: down slowly, up faster. */
  topEase: 0.2,
  topGrow: 0.5,
  /** A lockout frame is at least this share of the lockout height learned so far. */
  topNear: 0.92,
  /** An arm (shoulder–elbow–wrist bones) against the torso outside this is the camera guessing. Folded at the chest, side-on, it looks short. */
  armToTorso: [0.35, 2.6],
  /** A turn back up from past this depth without reaching the chest is a half rep, said so (less is the bar wobbling at the top). */
  shallowDepth: 0.55,
  reArmDepth: 0.5,
  /** Touch-and-go reps take about a second. */
  minRepMs: 600,
  lostMs: 1_200,
  /** A bottom seen before the body was lost still counts if the lockout comes back within this long. */
  regainMs: 3_000,
  /** Lockout to chest: a slow, controlled lowering is three or four seconds. */
  maxGoingMs: 6_000,
  timeoutMs: 10 * 60_000,
} as const;

export type BenchMem = {
  /** The wrists above the shoulders at lockout, smoothed, or null before one. */
  top: number | null;
  /** How far the feet are below the hips, in torsos, smoothed, or null before they're seen. */
  feet: number | null;
};

const newMem = (): BenchMem => ({ top: null, feet: null });

/** The angle at `b` between `a` and `c`, in degrees (as push-ups' `angleAt`; here so the two files don't import each other). */
function angleAt(a: Pt, b: Pt, c: Pt): number {
  let d = (Math.abs(Math.atan2(a.y - b.y, a.x - b.x) - Math.atan2(c.y - b.y, c.x - b.x)) * 180) / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
}

type Side = { shoulder: Pt; elbow: Pt; wrist: Pt; hip: Pt | null; sure: number };

/**
 * The arm on the side the camera sees best, read whole. Side-on, the far shoulder sits well above
 * the near one in the picture (the camera looks up from the floor), so averaging the two sides
 * mixes two arms (real clips, 2026-11-21).
 */
function bestSide(joints: PoseFrame['joints']): Side | null {
  let best: Side | null = null;
  const least = BENCH.minConfidence;
  for (const side of ['left', 'right'] as const) {
    const shoulder = joints[`${side}Shoulder`];
    const elbow = joints[`${side}Elbow`];
    const wrist = joints[`${side}Wrist`];
    const hip = joints[`${side}Hip`];
    if (!shoulder || !elbow || !wrist || shoulder.c < least || elbow.c < least || wrist.c < least) continue;
    const sure = shoulder.c + elbow.c + wrist.c;
    if (!best || sure > best.sure) best = { shoulder, elbow, wrist, hip: hip && hip.c >= least ? hip : null, sure };
  }
  return best;
}

export function readBench(joints: PoseFrame['joints'], mem: BenchMem, _phase: string, _at = 0): { reading: Reading; mem: BenchMem } {
  const B = BENCH;
  const arm0 = bestSide(joints);
  const hip = arm0?.hip ?? midOf(joints, 'Hip', B.minConfidence);
  if (!arm0 || !hip) return { reading: { hint: 'noBody' }, mem };
  const { shoulder, elbow, wrist } = arm0;
  const torso = distance(shoulder, hip);
  const arm = distance(shoulder, elbow) + distance(elbow, wrist);
  const [least, most] = B.armToTorso;
  if (!(torso > 0) || arm < torso * least || arm > torso * most) return { reading: { hint: 'noBody' }, mem };
  // Standing or sitting up (an overhead press, a shoulder press): not on the bench.
  if (tiltFromUpright(shoulder, hip) < B.minLieDeg) return { reading: { hint: 'notBench' }, mem };
  // Not the knees: on a bench they're about level with the hips (a bench is about a shin high), as in bed.
  const ankle = midOf(joints, 'Ankle', B.minConfidence);
  const hips = midOf(joints, 'Hip', B.minConfidence) ?? hip;
  // The feet out of the picture: say so, they're how he tells a bench from a bed.
  if (!ankle) return { reading: { hint: 'noFeet' }, mem };

  // Up in the picture is up in the room: how far the bar is above the shoulders.
  const reach = shoulder.y - wrist.y;
  const angle = angleAt(shoulder, elbow, wrist);
  const straight = angle >= B.topElbowDeg;
  const upright = reach > 0 && tiltFromUpright(wrist, shoulder) <= B.maxArmLeanDeg;
  // A lockout frame refreshes the yardstick: arms straight and pointing up, and near the lockout already learned.
  const locked = straight && upright && reach >= arm * B.firstTopReach && (mem.top === null || reach >= mem.top * B.topNear);
  const next: BenchMem = { ...mem };
  if (locked) next.top = mem.top === null ? reach : mem.top + (reach - mem.top) * (reach > mem.top ? B.topGrow : B.topEase);
  if (next.top === null) return { reading: { hint: 'notBench' }, mem: next };

  const r = reach / next.top;
  const depth = (1 - r) / (1 - B.downR);
  const atRest = r >= B.topR && straight && upright;
  // Both the bar and the elbow say so: a wrist misread low with the elbow nearly straight is the camera, not a rep.
  const atWork = angle <= B.maxDownElbowDeg && (r <= B.downR || (angle <= B.downElbowDeg && r <= B.elbowR));
  // In bed (or on the floor) the legs lie flat: the ankles about level with the hips, all the time.
  const feetDrop = (ankle.y - hips.y) / torso;
  // Clamped: a misread ankle up by the head mustn't drag the average for seconds.
  const drop = Math.min(1.5, Math.max(-0.5, feetDrop));
  next.feet = mem.feet === null ? drop : mem.feet + (drop - mem.feet) * B.feetEase;
  const cheat: Cheat | null = atWork && next.feet < B.minFeetDrop ? 'bed' : null;
  const info = `r ${r.toFixed(2)} (top ≥${B.topR}, chest ≤${B.downR})  elbow ${Math.round(angle)}°  feet ${feetDrop.toFixed(2)} (avg ${next.feet.toFixed(2)} ≥${B.minFeetDrop})`;
  return { reading: { depth, atRest, atWork, cheat, info }, mem: next };
}

export const BENCH_RULES: TravelRules<BenchMem> = {
  ...BENCH,
  countAt: 'rest',
  newMem,
  read: readBench,
};
