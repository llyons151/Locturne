/**
 * The machine for exercises where the body travels between a rest position and a work position,
 * measured against itself rather than by one joint's angle: pull-ups (hanging → chin over the
 * bar, wake/pullups.ts) and the bench press (locked out → bar on the chest, wake/bench.ts). Added
 * 2026-11-21, with squats, which went the same day.
 *
 * Each exercise's reader turns a frame into a `Reading`: how far from rest to work the body is
 * (`depth`, 0 at rest, 1 at the work position), whether it is fully at rest or fully at work, and
 * whether the anti-cheat checks pass at work (`cheat`: what gave it away). The reader keeps its
 * own memory (the yardstick, the rest position's snapshot) in `TravelState.mem`.
 *
 * A rep, here: seen at rest for `restFrames` frames (armed), then at work for `workFrames`
 * frames in a row with the checks passing. Pull-ups count it there, at the top (`countAt:
 * 'work'`); the bench press counts it back at rest (`countAt: 'rest'`), locked out again. Either way the
 * next rep needs rest first, so bouncing in the middle of the range never counts: that's a
 * `rest` miss ("all the way down" / "all the way up"). Turning back before work is `shallow`.
 *
 * Pure: times in ms, joints in any one pixel space with y down, like the push-up rules.
 */
import type { Hint, PoseFrame, PushupsSession } from './pushups.ts';

/** One frame, as an exercise's reader sees it. */
export type Reading =
  | { hint: Hint }
  | {
      /** 0 at rest, 1 at the work position; may go past either end. */
      depth: number;
      atRest: boolean;
      atWork: boolean;
      /** At work, why it doesn't count (the anti-cheat checks), or null when it's fair. */
      cheat: Cheat | null;
      /**
       * At work so clearly that one frame is enough (bench press: the bar right on the chest, the
       * elbow folded). A touch-and-go bottom lasts about a third of a second, one or two readings.
       */
      deep?: boolean;
      /** For the readout: the exercise's own numbers this frame. */
      info: string;
    };

/**
 * What gave a cheat away. `bar`: the hands moved, not the body. `feet`: the feet stayed on the
 * floor. `bed`: pressing lying flat, legs out (bench press: on a bench the feet are on the floor).
 * `noLegs`: the legs weren't seen (pull-ups: kneeling up in bed under a duvet looks like a rep).
 */
export type Cheat = 'bar' | 'feet' | 'bed' | 'noLegs';

export type TravelRules<M> = {
  reps: number;
  timeoutMs: number;
  lostMs: number;
  /** Frames in a row at rest that arm a rep, and at work that reach one. */
  restFrames: number;
  workFrames: number;
  /** The shortest time between two counted reps. */
  minRepMs: number;
  /** A turn back short of work past this depth is a half rep, said so. */
  shallowDepth: number;
  /** Back from work only this far (depth under it) and at work again, without rest between: a `rest` miss. */
  reArmDepth: number;
  /** When the rep counts: on reaching work (pull-ups) or back at rest after it (bench press). */
  countAt: 'work' | 'rest';
  /**
   * `countAt: 'rest'`: frames at rest, back from work, that count the rep (default `restFrames`).
   * Back up from the chest is the rep; a lifter who re-grips half locked out gives one or two.
   */
  backFrames?: number;
  /** A bottom (bench press) seen before the body was lost still counts if rest comes back within this long. */
  regainMs: number;
  /** On the way from rest to work longer than this, and it's not a rep in progress: rest is needed again. */
  maxGoingMs: number;
  newMem: () => M;
  read: (joints: PoseFrame['joints'], mem: M, phase: Phase, at: number) => { reading: Reading; mem: M };
};

/**
 * `none`: not yet at rest (just started, or lost). `rest`: at rest, armed. `going`: on the way,
 * not yet at work. `work`: reached it (a pull-up's rep is in; a bench press's waits for the lockout).
 */
export type Phase = 'none' | 'rest' | 'going' | 'work';

export type TravelState<M = unknown> = {
  phase: Phase;
  /** Frames in a row at rest, and at work with the checks passing, and at work failing them. */
  restRun: number;
  workRun: number;
  cheatRun: number;
  /** The deepest this attempt went, 0–1+. */
  best: number;
  /** In `work`: the depth fell under `reArmDepth` since, so another work without rest is a half rep. */
  dipped: boolean;
  /** Now, for the meter (0–1). */
  depth: number;
  /** The reader's last numbers, for the readout. */
  info: string;
  /** When the body was last lost in `work` (the bench press's regain), else null. */
  lostInWorkAt: number | null;
  /** This attempt was already called a cheat: no "half rep" on top of it. */
  cheated: boolean;
  /** When rest was last seen (the attempt under way started after it). */
  restAt: number | null;
  mem: M;
};

export const newTravel = <M>(R: TravelRules<M>): TravelState<M> => ({
  phase: 'none',
  restRun: 0,
  workRun: 0,
  cheatRun: 0,
  best: 0,
  dipped: false,
  depth: 0,
  info: '',
  lostInWorkAt: null,
  cheated: false,
  restAt: null,
  mem: R.newMem(),
});

/** Counts one, unless it's too soon after the last. */
function count(next: PushupsSession, at: number, R: TravelRules<unknown>): void {
  if (next.lastRep !== null && at - next.lastRep < R.minRepMs) {
    next.miss = 'quick';
    return;
  }
  next.reps += 1;
  next.lastRep = at;
  next.miss = null;
  if (next.reps >= next.goal) {
    next.status = 'met';
    next.metAt = at;
  }
}

export function addTravelPose<M>(s: PushupsSession, frame: PoseFrame, R: TravelRules<M>): PushupsSession {
  const at = frame.at;
  const next: PushupsSession = { ...s, now: Math.max(s.now, at) };
  const was = (s.travel as TravelState<M> | undefined) ?? newTravel(R);
  const { reading, mem } = R.read(frame.joints, was.mem, was.phase, at);
  const t: TravelState<M> = { ...was, mem };

  if ('hint' in reading) {
    t.restRun = 0;
    t.workRun = 0;
    t.cheatRun = 0;
    // A frame or two can drop out mid-rep; only a while without one loses the body.
    if (next.seenAt === null || at - next.seenAt >= R.lostMs) lose(next, t, reading.hint, at);
    next.travel = t;
    return next;
  }

  next.seenAt = at;
  next.hint = null;
  t.depth = Math.min(1, Math.max(0, reading.depth));
  t.info = reading.info;
  next.elbow = reading.depth;
  const fair = reading.atWork && reading.cheat === null;
  t.restRun = reading.atRest ? t.restRun + 1 : 0;
  if (reading.atRest) t.restAt = at;
  t.workRun = fair ? t.workRun + 1 : 0;
  t.cheatRun = reading.atWork && reading.cheat !== null ? t.cheatRun + 1 : 0;

  if (t.phase === 'none') {
    // Counting starts from rest, not halfway through a rep.
    next.status = 'counting';
    if (t.restRun >= R.restFrames) {
      // Bench press: lost at the chest, locked out again soon enough: that rep counts.
      if (R.countAt === 'rest' && t.lostInWorkAt !== null && at - t.lostInWorkAt <= R.regainMs) count(next, at, R as TravelRules<unknown>);
      t.lostInWorkAt = null;
      t.phase = 'rest';
      t.best = 0;
    }
    next.travel = t;
    return next;
  }

  if (t.phase === 'going' && t.restAt !== null && at - t.restAt > R.maxGoingMs) {
    // Too long on the way: they let go, stood about, or the camera lost the thread. Start again from rest.
    t.phase = 'none';
    t.best = 0;
    t.cheated = false;
    next.travel = t;
    return next;
  }
  if (t.phase === 'rest' || t.phase === 'going') {
    if (t.phase === 'rest' && !reading.atRest) t.phase = 'going';
    if (t.phase === 'going') t.best = Math.max(t.best, reading.depth);
    if (t.workRun >= R.workFrames || (fair && reading.deep)) {
      t.phase = 'work';
      t.dipped = false;
      if (R.countAt === 'work') count(next, at, R as TravelRules<unknown>);
    } else if (t.cheatRun >= R.workFrames) {
      next.miss = reading.cheat;
      t.cheated = true;
    } else if (t.phase === 'going' && t.restRun >= R.restFrames) {
      // Back at rest without getting there.
      if (t.best >= R.shallowDepth && !t.cheated) next.miss = 'shallow';
      t.phase = 'rest';
      t.best = 0;
      t.cheated = false;
    }
    next.travel = t;
    return next;
  }

  // At work: waiting for rest.
  if (t.restRun >= (R.backFrames ?? R.restFrames)) {
    if (R.countAt === 'rest') count(next, at, R as TravelRules<unknown>);
    t.phase = 'rest';
    t.best = 0;
    t.cheated = false;
  } else if (reading.depth < R.reArmDepth) t.dipped = true;
  else if (t.dipped && t.workRun >= R.workFrames) {
    // Down part way and up again: a half rep. Said once per bounce.
    next.miss = 'rest';
    t.dipped = false;
  }
  next.travel = t;
  return next;
}

/** The body is lost: back to `none`. A bench press's bottom already reached is remembered for `regainMs`. */
function lose(next: PushupsSession, t: TravelState<unknown>, hint: Hint, at: number): void {
  next.status = 'finding';
  next.hint = hint;
  next.elbow = null;
  if (t.phase === 'work') t.lostInWorkAt = at;
  t.phase = 'none';
  t.best = 0;
  t.depth = 0;
  t.dipped = false;
  t.cheated = false;
}

export function tickTravel<M>(s: PushupsSession, now: number, R: TravelRules<M>): PushupsSession {
  const next: PushupsSession = { ...s, now: Math.max(s.now, now) };
  if (next.status === 'counting' && next.seenAt !== null && next.now - next.seenAt >= R.lostMs) {
    // No frames at all (the camera stalled): the same as losing the body.
    const t = { ...((s.travel as TravelState<M> | undefined) ?? newTravel(R)) };
    lose(next, t as TravelState<unknown>, 'noBody', next.now);
    next.travel = t;
  }
  if (next.now - Math.max(next.startedAt, next.seenAt ?? next.startedAt) >= next.timeoutMs) next.status = 'timedOut';
  return next;
}

// Shared joint helpers for the readers.

export type Pt = { x: number; y: number };

export const seenAt = (p: { c: number } | undefined, least: number): boolean => !!p && p.c >= least;

/** The middle of a left/right pair seen at least `least` surely, or the one seen, or null. */
export function midOf(
  joints: PoseFrame['joints'],
  name: 'Shoulder' | 'Hip' | 'Knee' | 'Ankle' | 'Elbow' | 'Wrist',
  least: number,
): Pt | null {
  const l = joints[`left${name}`];
  const r = joints[`right${name}`];
  const okL = seenAt(l, least);
  const okR = seenAt(r, least);
  if (okL && okR) return { x: (l!.x + r!.x) / 2, y: (l!.y + r!.y) / 2 };
  if (okL) return { x: l!.x, y: l!.y };
  if (okR) return { x: r!.x, y: r!.y };
  return null;
}

export const distance = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Degrees from straight up of the line from `low` to `high` (0: `high` right above `low`). */
export const tiltFromUpright = (high: Pt, low: Pt) => (Math.atan2(Math.abs(high.x - low.x), low.y - high.y) * 180) / Math.PI;
