/**
 * Dance (2026-11-07, in place of Go downstairs; spec in docs/DANCE_METHOD.md): the phone stands
 * a few steps away facing you, the front camera watches, and you dance for N seconds **straight**
 * (user: "do stuff for like ten seconds straight"). Stop for longer than `breakMs`, or walk out of
 * the picture, and the clock goes back to zero. Nothing is recorded: frames are read and dropped.
 *
 * It runs on the push-up machine's session (wake/pushups.ts) so the camera screen, the clock, the
 * timeout and the payoff are shared: `reps` holds the whole seconds danced in this run. What
 * differs is the frame reader, here, because dancing has no joint angle going down and up.
 *
 * Each frame:
 * 1. Standing, all of you: a shoulder, a hip, a knee and an ankle seen; the torso upright; the
 *    hips well above the knees and the knees above the ankles, measured in torsos. Lying in bed
 *    or sitting on its edge fails here (sitting front-on, the thigh points at the camera and the
 *    knee comes up level with the hip).
 * 2. Speed: each arm and leg joint's move since the last frame, *relative to the hips* (a shaken
 *    phone moves the whole body together; dancing moves the limbs against the hips), in torsos a
 *    second, so it reads the same 2 or 5 steps away. The median of the arms and of the legs, so
 *    one misread joint can't make a frame.
 * 3. Smoothed over about `smoothMs`, then: moving when the bigger of the two is at least `move`
 *    and the legs at least `legMove`. Arms waving on their own don't count: the bounce is the
 *    proof (and the joke).
 *
 * Pure: times in ms, joints in any one pixel space with y down, like the push-up rules.
 * Starting numbers, untuned on real clips: tune on the phone in the wake lab's readout (the
 * jitter floor of someone standing still first; `move` about 3× that).
 */
import type { Hint, Joint, JointPoint, PoseFrame, PushupsSession } from './pushups.ts';

export const DANCE = {
  /** The default goal, in seconds straight; the routine's `danceGoal` sets the real one. */
  reps: 10,
  minConfidence: 0.2,
  /** Smoothed speed, in torsos a second, that counts as dancing (the bigger of arms and legs). */
  move: 0.6,
  /** The legs' own smoothed speed it also needs, in torsos a second. */
  legMove: 0.3,
  /** About how long the smoothing remembers. */
  smoothMs: 600,
  /** A frame gap longer than this credits only this much (a stalled camera can't dance for you). */
  maxGapMs: 250,
  /** Still (or out of the picture) this long and the run is broken: back to zero. */
  breakMs: 1_500,
  /** Out of view this long and he says so. */
  lostMs: 1_200,
  /** No one standing in view this long and the camera stops. */
  timeoutMs: 10 * 60_000,
  /** Torso tilt from upright, at most, in degrees. */
  maxTiltDeg: 35,
  /** The knees at least this many torsos below the hips, and the ankles below the knees. */
  hipOverKnee: 0.45,
  kneeOverAnkle: 0.35,
} as const;

/** Dance's own part of a session: the last frame read, the smoothed speeds, and the run so far. */
export type DanceState = {
  prev: { at: number; joints: PoseFrame['joints'] } | null;
  /** Smoothed: the bigger of the arms' and legs' median speed, in torsos a second. */
  energy: number;
  /** Smoothed: the legs' median speed. */
  leg: number;
  /** Time spent moving in this run. `reps` is its whole seconds. */
  runMs: number;
  /** When it was last moving (or the run began), for `breakMs`. Null before it first moves. */
  movingAt: number | null;
};

export const newDance = (): DanceState => ({ prev: null, energy: 0, leg: 0, runMs: 0, movingAt: null });

const DEG = 180 / Math.PI;
const ARMS: Joint[] = ['leftWrist', 'rightWrist', 'leftElbow', 'rightElbow'];
const LEGS: Joint[] = ['leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'];

const seen = (p: JointPoint | undefined): p is JointPoint => !!p && p.c >= DANCE.minConfidence;

/** The middle of a left/right pair, or the one seen, or null. */
function mid(joints: PoseFrame['joints'], name: 'Shoulder' | 'Hip' | 'Knee' | 'Ankle'): { x: number; y: number } | null {
  const l = joints[`left${name}`];
  const r = joints[`right${name}`];
  if (seen(l) && seen(r)) return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
  if (seen(l)) return l;
  if (seen(r)) return r;
  return null;
}

/** Standing up with all of you in the picture: the hips and torso length, or why not. */
export function readStanding(joints: PoseFrame['joints']): { hip: { x: number; y: number }; torso: number } | { hint: Hint } {
  const shoulder = mid(joints, 'Shoulder');
  const hip = mid(joints, 'Hip');
  if (!shoulder || !hip) return { hint: 'noBody' };
  const torso = Math.hypot(hip.x - shoulder.x, hip.y - shoulder.y);
  if (!(torso > 0)) return { hint: 'noBody' };
  const knee = mid(joints, 'Knee');
  const ankle = mid(joints, 'Ankle');
  // Upper body only (too close, or the legs out of the bottom of the picture).
  if (!knee || !ankle) return { hint: 'noBody' };
  const tilt = Math.atan2(Math.abs(hip.x - shoulder.x), hip.y - shoulder.y) * DEG;
  if (hip.y <= shoulder.y || tilt > DANCE.maxTiltDeg) return { hint: 'notStanding' };
  if (knee.y - hip.y < DANCE.hipOverKnee * torso || ankle.y - knee.y < DANCE.kneeOverAnkle * torso) return { hint: 'notStanding' };
  return { hip, torso };
}

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** The arms' and legs' median speed between two frames, relative to the hips, in torsos a second. */
export function limbSpeeds(
  prev: PoseFrame['joints'],
  next: PoseFrame['joints'],
  dtMs: number,
  torso: number,
): { arms: number; legs: number } | null {
  const a = mid(prev, 'Hip');
  const b = mid(next, 'Hip');
  if (!a || !b || !(dtMs > 0) || !(torso > 0)) return null;
  const shift = { x: b.x - a.x, y: b.y - a.y };
  const speeds = (names: Joint[]) =>
    names.flatMap((n) => {
      const p = prev[n];
      const q = next[n];
      if (!seen(p) || !seen(q)) return [];
      return [Math.hypot(q.x - p.x - shift.x, q.y - p.y - shift.y) / torso / (dtMs / 1000)];
    });
  return { arms: median(speeds(ARMS)), legs: median(speeds(LEGS)) };
}

/** Is the smoothed motion dancing? */
export const isDancing = (d: Pick<DanceState, 'energy' | 'leg'>) => d.energy >= DANCE.move && d.leg >= DANCE.legMove;

/** The run broke (still, or gone, too long): back to zero, said so if there was anything to lose. */
function breakRun(next: PushupsSession, dance: DanceState): DanceState {
  if (next.reps > 0 || dance.runMs > 0) {
    next.miss = 'broke';
    next.lastRep = null;
  }
  next.reps = 0;
  return { ...dance, runMs: 0, movingAt: null };
}

export function addDancePose(s: PushupsSession, frame: PoseFrame): PushupsSession {
  const at = frame.at;
  const next: PushupsSession = { ...s, now: Math.max(s.now, at) };
  let dance = s.dance ?? newDance();
  const read = readStanding(frame.joints);

  if ('hint' in read) {
    dance = { ...dance, prev: null, energy: 0, leg: 0 };
    if (next.seenAt === null || at - next.seenAt >= DANCE.lostMs) {
      next.status = 'finding';
      next.hint = read.hint;
    }
    next.dance = dance;
    return settle(next, at);
  }

  next.seenAt = at;
  next.status = 'counting';
  const prev = dance.prev;
  dance = { ...dance, prev: { at, joints: frame.joints } };
  const dt = prev ? at - prev.at : 0;
  const speeds = prev && dt > 0 ? limbSpeeds(prev.joints, frame.joints, dt, read.torso) : null;
  if (speeds) {
    const k = 1 - Math.exp(-dt / DANCE.smoothMs);
    dance.energy += (Math.max(speeds.arms, speeds.legs) - dance.energy) * k;
    dance.leg += (speeds.legs - dance.leg) * k;
  }
  if (speeds && isDancing(dance)) {
    dance.runMs += Math.min(dt, DANCE.maxGapMs);
    dance.movingAt = at;
    next.hint = null;
    const secs = Math.floor(dance.runMs / 1000);
    if (secs > next.reps) {
      next.reps = secs;
      next.lastRep = at;
      next.miss = null;
      if (next.reps >= next.goal) {
        next.status = 'met';
        next.metAt = at;
      }
    }
  } else {
    // Standing there: arms going but not the legs, or nothing at all.
    next.hint = dance.energy >= DANCE.move ? 'legs' : 'still';
  }
  // The "elbow" readout slot: how hard you're moving, for the meter and the lab.
  next.elbow = dance.energy;
  next.dance = dance;
  return settle(next, at);
}

/** A run stopped (or gone) longer than `breakMs` goes back to zero. */
function settle(next: PushupsSession, now: number): PushupsSession {
  const dance = next.dance ?? newDance();
  if (next.status === 'met' || dance.movingAt === null) return next;
  if (now - dance.movingAt > DANCE.breakMs) next.dance = breakRun(next, dance);
  return next;
}

/** The clock: a stalled camera loses you, a run left too long breaks, and the timeout. */
export function tickDance(s: PushupsSession, now: number): PushupsSession {
  const next: PushupsSession = { ...s, now: Math.max(s.now, now) };
  if (next.status === 'counting' && next.seenAt !== null && next.now - next.seenAt >= DANCE.lostMs) {
    next.status = 'finding';
    next.hint = 'noBody';
    next.dance = { ...(next.dance ?? newDance()), prev: null, energy: 0, leg: 0 };
  }
  settle(next, next.now);
  if (next.now - Math.max(next.startedAt, next.seenAt ?? next.startedAt) >= next.timeoutMs) next.status = 'timedOut';
  return next;
}

