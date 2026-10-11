/**
 * Push-ups (GAME_PLAN, "Wake-up methods"; camera version 2026-10-10): the phone stands on the
 * floor a couple of steps away, side-on, and the front camera watches. Apple's Vision body pose
 * (modules/pose-camera) finds the joints on the phone; these rules turn them into reps. Nothing
 * is recorded, saved or sent: frames are read on the phone and dropped.
 *
 * A rep is the elbow bending past `downDeg` and straightening past `upDeg` again, with the
 * shoulders dropping at least `minDrop` of the torso's length on the way, only while the body is
 * in a plank: torso near horizontal and hands below the shoulders. That rules out the cheats
 * from bed: curls standing or sitting (torso upright), arm pumps lying on your back (hands
 * above the shoulders), and waving at the camera (no torso at all). The drop rules out the
 * camera's own jitter: in a dark room the elbow can read 13° one frame and 179° the next while
 * the shoulder hasn't moved, which counted phantom reps on a plain plank hold.
 *
 * The numbers were tuned on 18 real clips run through MediaPipe (2026-10-10, docs/PUSHUP_TESTS.md):
 * real reps bottom out at 25–112° with a drop of 0.57–1.35 arms, in normal and darkened light;
 * dark-room jitter drops at most 0.33.
 *
 * Elbow angles are read in the picture, so they're only true side-on; facing the camera the
 * torso is foreshortened and the plank check fails, which is why Loc asks for side-on.
 *
 * Pure: times are ms, joints are in any one pixel space with y pointing down (the camera view's
 * points on iOS, the preview's pixels on web). The screen feeds it pose frames and clock ticks.
 */

export const PUSHUPS = {
  /** The default target; the routine's `pushupGoal` sets the real one. */
  reps: 10,
  /** A joint below this confidence isn't there. */
  minConfidence: 0.3,
  /** The elbow at or under this, in degrees, is the bottom of a rep. (Real reps read 25–112°.) */
  downDeg: 115,
  /** At or over this, the arms are straight again: the top. Some people never quite lock out. */
  upDeg: 140,
  /** A dip that bends past this but never reaches `downDeg` is a half rep, said so. */
  shallowDeg: 135,
  /** The shoulders have to drop this share of the torso's length (shoulder to hip) below the top for a rep. */
  minDrop: 0.4,
  /** The top's shoulder height is forgotten after this long without a new high, so an old reading can't stand in for it. */
  topMemoryMs: 2_000,
  /** Frames at the bottom (elbow at or under `downDeg`) a rep needs. Even quick reps spend three or four
   * at 15 a second there; the dark room's spikes last one. */
  downFrames: 2,
  /** An arm shorter or longer than this many torsos is the camera guessing, not a body: the frame is skipped. */
  armToTorso: [0.4, 3],
  /** The torso's tilt from horizontal, in degrees, at most, to count as a plank. */
  maxTorsoDeg: 45,
  /** Wrists may be this share of the arm's length above the shoulders and still be "below" (camera noise). */
  wristSlack: 0.15,
  /** The shortest time between two reps' tops. */
  minRepMs: 700,
  /** Out of view or out of a plank this long and he says so. The reps done stay. */
  lostMs: 1_200,
  /** No plank in view for this long (not since the start: a long set with rests is fine) and the camera stops. */
  timeoutMs: 10 * 60_000,
} as const;

export const JOINTS = [
  'nose',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const;

export type Joint = (typeof JOINTS)[number];

/** A joint where the camera saw it, with how sure it is (0–1). */
export type JointPoint = { x: number; y: number; c: number };

/** One frame's pose: whatever joints were found, maybe none. */
export type PoseFrame = { at: number; joints: Partial<Record<Joint, JointPoint>> };

export type PushupsStatus =
  /** No plank in view yet, or lost it. */
  | 'finding'
  | 'counting'
  | 'met'
  | 'timedOut';

/** Why he can't count right now: nobody in the picture, or somebody who isn't in a plank. */
export type Hint = 'noBody' | 'notPlank';

/** Why the last dip didn't count, so Loc can say so. */
export type Miss = 'shallow' | 'quick';

export type PushupsSession = {
  startedAt: number;
  /** Reps needed. */
  goal: number;
  /** Time out after this long with no plank in view (`PUSHUPS.timeoutMs`; the wake lab's preview sets less). */
  timeoutMs: number;
  now: number;
  reps: number;
  /** Bottom of a rep reached (for `downFrames` frames), waiting for the arms to straighten. */
  down: boolean;
  /** Frames at the bottom in this dip so far. */
  lowFrames: number;
  /** The deepest elbow angle since the arms were last straight, or null when not dipping. */
  dip: number | null;
  /** The elbow angle in the last plank frame, null with no plank in view. Unsmoothed: on the real
   * clips smoothing (and a median of three) lagged behind quick reps and lost more than it saved. */
  elbow: number | null;
  /** The shoulder's height in the picture at the last top (its highest there), or null before one. */
  topY: number | null;
  /** When `topY` was read. */
  topAt: number | null;
  /** The furthest the shoulders have dropped below `topY` since, as a share of the torso. */
  drop: number;
  /** When a plank was last seen. */
  seenAt: number | null;
  hint: Hint | null;
  lastRep: number | null;
  miss: Miss | null;
  metAt: number | null;
  status: PushupsStatus;
};

/** A bad stored goal (NaN) would never be met; fall back to the default. */
const wholeGoal = (goal: number) => (Number.isFinite(goal) ? Math.max(1, Math.round(goal)) : PUSHUPS.reps);

/**
 * A new session. `reps` carries a timed-out set's count into "Start again", so a long set
 * with a break in it doesn't start over from nothing.
 */
export function startPushups(
  now: number,
  goal: number = PUSHUPS.reps,
  { reps = 0, timeoutMs = PUSHUPS.timeoutMs }: { reps?: number; timeoutMs?: number } = {},
): PushupsSession {
  const whole = wholeGoal(goal);
  const done = Number.isFinite(reps) ? Math.max(0, Math.floor(reps)) : 0;
  const met = done >= whole;
  return {
    startedAt: now,
    goal: whole,
    timeoutMs,
    now,
    reps: done,
    down: false,
    lowFrames: 0,
    dip: null,
    elbow: null,
    topY: null,
    topAt: null,
    drop: 0,
    seenAt: null,
    hint: 'noBody',
    lastRep: null,
    miss: null,
    metAt: met ? now : null,
    status: met ? 'met' : 'finding',
  };
}

/**
 * The goal changed while the camera is up (the routine in force changed under it): keep the
 * reps done and measure them against the new goal, met if they already are. A finished set stays
 * finished.
 */
export function retarget(s: PushupsSession, goal: number, now: number): PushupsSession {
  const whole = wholeGoal(goal);
  if (whole === s.goal || s.status === 'met') return s;
  if (s.status === 'timedOut' || s.reps < whole) return { ...s, goal: whole };
  return { ...s, goal: whole, now: Math.max(s.now, now), status: 'met', metAt: Math.max(s.now, now) };
}

export const isOver = (s: PushupsSession) => s.status === 'met' || s.status === 'timedOut';

const DEG = 180 / Math.PI;

/** The angle at `b`, in degrees, between `a` and `c`. */
export function angleAt(a: JointPoint, b: JointPoint, c: JointPoint): number {
  const ab = Math.atan2(a.y - b.y, a.x - b.x);
  const cb = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(ab - cb) * DEG;
  if (d > 180) d = 360 - d;
  return d;
}

type Side = { shoulder: JointPoint; elbow: JointPoint; wrist: JointPoint; hip: JointPoint };

/** The arm and torso on the side the camera sees best, or null if neither is all there. */
export function bestSide(joints: PoseFrame['joints']): Side | null {
  let best: Side | null = null;
  let score: number = PUSHUPS.minConfidence;
  for (const side of ['left', 'right'] as const) {
    const shoulder = joints[`${side}Shoulder`];
    const elbow = joints[`${side}Elbow`];
    const wrist = joints[`${side}Wrist`];
    const hip = joints[`${side}Hip`];
    if (!shoulder || !elbow || !wrist || !hip) continue;
    const least = Math.min(shoulder.c, elbow.c, wrist.c, hip.c);
    if (least >= score) {
      score = least;
      best = { shoulder, elbow, wrist, hip };
    }
  }
  return best;
}

/** Torso near horizontal and hands under the shoulders. */
export function isPlank({ shoulder, elbow, wrist, hip }: Side): boolean {
  const tilt = Math.atan2(Math.abs(hip.y - shoulder.y), Math.abs(hip.x - shoulder.x)) * DEG;
  if (tilt > PUSHUPS.maxTorsoDeg) return false;
  const arm = Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y) + Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
  return wrist.y >= shoulder.y - arm * PUSHUPS.wristSlack;
}

/**
 * What the frame shows, for the rules: the elbow angle, the shoulder's height and the torso's
 * length (the yardstick for how far the shoulders drop) in a plank, or why there isn't one.
 *
 * The torso, not the arm: in a dark room the camera sometimes folds the arm up to a tenth of its
 * length, and a shoulder wobbling a few points then looked like a full drop. Those frames, with an
 * arm no body has (`armToTorso`), are skipped as unreadable.
 */
export function readFrame(joints: PoseFrame['joints']): { elbow: number; shoulderY: number; torso: number } | { hint: Hint } {
  const side = bestSide(joints);
  if (!side) return { hint: 'noBody' };
  if (!isPlank(side)) return { hint: 'notPlank' };
  const { shoulder, elbow, wrist, hip } = side;
  const arm = Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y) + Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y);
  const torso = Math.hypot(hip.x - shoulder.x, hip.y - shoulder.y);
  const [least, most] = PUSHUPS.armToTorso;
  if (!(torso > 0) || arm < torso * least || arm > torso * most) return { hint: 'noBody' };
  return { elbow: angleAt(shoulder, elbow, wrist), shoulderY: shoulder.y, torso };
}

export function addPose(s: PushupsSession, frame: PoseFrame): PushupsSession {
  if (isOver(s)) return s;
  const at = frame.at;
  const next = { ...s, now: Math.max(s.now, at) };
  const read = readFrame(frame.joints);

  if ('hint' in read) {
    // A frame or two can drop out mid-rep; only a while without one loses the plank.
    if (next.seenAt === null || at - next.seenAt >= PUSHUPS.lostMs) {
      next.status = 'finding';
      next.hint = read.hint;
      next.elbow = null;
      next.down = false;
      next.lowFrames = 0;
      next.dip = null;
      next.topY = null;
      next.topAt = null;
      next.drop = 0;
    }
    return next;
  }

  next.seenAt = at;
  next.hint = null;
  const elbow = read.elbow;
  next.elbow = elbow;

  if (next.status === 'finding') {
    // Counting starts at the top of a plank, not halfway down one.
    if (elbow < PUSHUPS.upDeg) return next;
    next.status = 'counting';
    next.down = false;
    next.lowFrames = 0;
    next.dip = null;
    next.topY = read.shoulderY;
    next.topAt = at;
    next.drop = 0;
    return next;
  }

  if (elbow < PUSHUPS.upDeg) {
    next.dip = next.dip === null ? elbow : Math.min(next.dip, elbow);
    if (elbow <= PUSHUPS.downDeg) {
      next.lowFrames += 1;
      if (next.lowFrames >= PUSHUPS.downFrames) next.down = true;
    }
    if (next.topY !== null) next.drop = Math.max(next.drop, (read.shoulderY - next.topY) / read.torso);
    return next;
  }

  // Straight again: the top. A rep if it went all the way down, body and all.
  const dip = next.dip;
  const dropped = next.drop;
  const wentDown = next.down;
  next.dip = null;
  next.down = false;
  next.lowFrames = 0;
  next.drop = 0;
  const counts = wentDown && dropped >= PUSHUPS.minDrop;
  // A dip measures from the highest the shoulders have been since the last rep. Only a rep moves
  // that down to here: a one-frame spike that "straightens" the arm mid-rep mustn't restart the
  // measure from halfway down.
  const fresh = next.topAt !== null && at - next.topAt <= PUSHUPS.topMemoryMs;
  if (counts || next.topY === null || !fresh || read.shoulderY <= next.topY) {
    next.topY = read.shoulderY;
    next.topAt = at;
  }
  if (counts) {
    if (next.lastRep !== null && at - next.lastRep < PUSHUPS.minRepMs) {
      next.miss = 'quick';
      return next;
    }
    next.reps += 1;
    next.lastRep = at;
    next.miss = null;
    if (next.reps >= next.goal) {
      next.status = 'met';
      next.metAt = at;
    }
    // A bend with the shoulders barely moving is the camera's jitter, not a half rep: no comment.
  } else if (dip !== null && dip <= PUSHUPS.shallowDeg && dropped >= PUSHUPS.minDrop / 2) next.miss = 'shallow';
  return next;
}

export function tick(s: PushupsSession, now: number): PushupsSession {
  if (isOver(s)) return s;
  const next = { ...s, now: Math.max(s.now, now) };
  if (next.status === 'counting' && next.seenAt !== null && next.now - next.seenAt >= PUSHUPS.lostMs) {
    // No frames at all (the camera stalled): the same as losing the plank.
    next.status = 'finding';
    next.hint = 'noBody';
    next.elbow = null;
    next.down = false;
    next.lowFrames = 0;
    next.dip = null;
    next.topY = null;
    next.topAt = null;
    next.drop = 0;
  }
  // Measured from the last plank seen, or the start before one.
  if (next.now - Math.max(next.startedAt, next.seenAt ?? next.startedAt) >= next.timeoutMs) next.status = 'timedOut';
  return next;
}

/** 0–1 of the reps needed. */
export const repProgress = (s: PushupsSession) => Math.min(1, s.reps / s.goal);

/** 0–1 of the way down the current rep, for the meter: 0 at the top, 1 at `downDeg`. */
export const depthOf = (s: PushupsSession) =>
  s.elbow === null ? 0 : Math.min(1, Math.max(0, (PUSHUPS.upDeg - s.elbow) / (PUSHUPS.upDeg - PUSHUPS.downDeg)));
