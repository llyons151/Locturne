/**
 * Squats (user 2026-11-03, a sixth way to get up): the push-up camera's machine (pushups.ts) with
 * a standing body's rules. The phone leans on its side on the floor a few steps away, side-on, as
 * for push-ups, and the front camera watches; nothing is recorded, saved or sent.
 *
 * A rep is the knee (hip, knee, ankle) bending past `downDeg` and straightening past `upDeg`
 * again, the hips dropping at least `minDrop` of the thigh's length on the way, only while
 * standing: torso nearer upright than lying, feet under the knees. That rules out the cheats
 * from bed: knees pumped lying on your back (torso flat), sitting up with the legs out (shins
 * flat), and waving at the camera (no legs at all). The drop rules out the camera's jitter, as
 * the shoulders' does for push-ups.
 *
 * Not tuned on real clips yet, unlike push-ups (docs/PUSHUP_TESTS.md): the numbers are from the
 * geometry of a side-on squat. A thigh at parallel bends the knee to about 90°; a fair squat
 * reads 80–110° and drops the hips 0.4–0.8 thighs. The wake lab's readout shows them live, and
 * they're JS, so they can be changed by update.
 */

import { angleAt, type Hint, type JointPoint, type PoseFrame } from './pushups.ts';

export const SQUATS = {
  /** The default target; the routine's `squatGoal` sets the real one. */
  reps: 20,
  /** A joint below this confidence isn't there (as push-ups). */
  minConfidence: 0.2,
  /** The knee at or under this, in degrees, is the bottom of a rep. */
  downDeg: 115,
  /** At or over this, standing again: the top. Few lock the knee right out. */
  upDeg: 150,
  /** A dip past this that never reaches `downDeg` is a half squat, said so. */
  shallowDeg: 135,
  /** The hips have to drop this share of the thigh's length below the top for a rep. */
  minDrop: 0.3,
  /** A drop this deep is a rep with the knee only past `shallowDeg` (Vision misreads the knee). */
  deepDrop: 0.55,
  /** The top's hip height is forgotten after this long without a new high. */
  topMemoryMs: 2_500,
  /** Frames at the bottom a rep needs: a one-frame spike isn't a squat. */
  downFrames: 2,
  /** The shortest time between two reps' tops: squats are slower than push-ups. */
  minRepMs: 800,
  /** Out of view or not standing this long and he says so. The reps done stay. */
  lostMs: 1_200,
  /** A bottom seen when the body was lost still counts if standing comes back within this long. */
  regainMs: 3_000,
  /** Nobody standing in view this long and the camera stops. */
  timeoutMs: 10 * 60_000,
  /** The torso's lean from upright, in degrees, at most, to count as standing (a deep squat leans 30–50°). */
  maxLeanDeg: 60,
  /** The ankle must be this share of the shin's length below the knee: shins upright, not stretched out flat. */
  shinDrop: 0.5,
  /** A thigh shorter or longer than this many torsos is the camera guessing, not a body. */
  thighToTorso: [0.4, 2.5],
} as const;

type Leg = { shoulder: JointPoint; hip: JointPoint; knee: JointPoint; ankle: JointPoint };

/** The leg and torso on the side the camera sees best, or null if neither is all there. */
export function bestLeg(joints: PoseFrame['joints']): Leg | null {
  let best: Leg | null = null;
  let score: number = SQUATS.minConfidence;
  for (const side of ['left', 'right'] as const) {
    const shoulder = joints[`${side}Shoulder`];
    const hip = joints[`${side}Hip`];
    const knee = joints[`${side}Knee`];
    const ankle = joints[`${side}Ankle`];
    if (!shoulder || !hip || !knee || !ankle) continue;
    const least = Math.min(shoulder.c, hip.c, knee.c, ankle.c);
    if (least >= score) {
      score = least;
      best = { shoulder, hip, knee, ankle };
    }
  }
  return best;
}

const DEG = 180 / Math.PI;

/** Torso nearer upright than lying, and the feet under the knees. */
export function isStanding({ shoulder, hip, knee, ankle }: Leg): boolean {
  if (shoulder.y >= hip.y) return false;
  const lean = Math.atan2(Math.abs(shoulder.x - hip.x), hip.y - shoulder.y) * DEG;
  if (lean > SQUATS.maxLeanDeg) return false;
  const shin = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
  return shin > 0 && ankle.y - knee.y >= shin * SQUATS.shinDrop;
}

/**
 * What the frame shows, for the shared machine: the knee's angle, the hips' height and the
 * thigh's length (the yardstick for the drop), or why there's nothing to count.
 */
export function readSquatFrame(joints: PoseFrame['joints']): { angle: number; y: number; scale: number } | { hint: Hint } {
  const leg = bestLeg(joints);
  if (!leg) return { hint: 'noBody' };
  if (!isStanding(leg)) return { hint: 'notStanding' };
  const { shoulder, hip, knee, ankle } = leg;
  const thigh = Math.hypot(knee.x - hip.x, knee.y - hip.y);
  const torso = Math.hypot(hip.x - shoulder.x, hip.y - shoulder.y);
  const [least, most] = SQUATS.thighToTorso;
  if (!(torso > 0) || thigh < torso * least || thigh > torso * most) return { hint: 'noBody' };
  return { angle: angleAt(hip, knee, ankle), y: hip.y, scale: thigh };
}
