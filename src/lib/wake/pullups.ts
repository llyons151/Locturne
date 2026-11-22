/**
 * Pull-ups (user 2026-11-21, "the tracking should be very, very good"): the phone stands upright
 * on the floor a few steps from the bar, the front camera looks up at you, and you hang and pull.
 * Facing the camera, back to it or side-on all work: nothing here reads left from right.
 * Nothing is recorded: frames are read on the phone and dropped.
 *
 * What's measured, every frame, is how far the shoulders sit below the hands, in arm lengths
 * (`reach`): about 1 in a dead hang (less with a wide grip, whose arms slant), under about 0.45
 * with the chin over the bar. The arm's length is the shoulder–elbow–wrist bones added up, which
 * barely changes as the elbow bends, smoothed over frames so one bad reading can't move it.
 *
 * A rep (wake/travel.ts): a hang (`reach` within `hangSlack` of the deepest hang seen, and at
 * least `hangMin`), then the top (`reach` ≤ `topReach`, or the nose up at the hands) held for two
 * frames. It counts at the top, as a coach counts. The next needs the hang again: bouncing at
 * the top is a half rep, said so.
 *
 * The cheats, from bed and out of it, and what stops them:
 * - Arms pumping overhead lying down, or air pull-downs standing: the hands move, not the body.
 *   The top needs the shoulders to have *risen* `minRise` arms since the hang, the hands to have
 *   stayed within `maxBarDrift` of where they hung, and the shoulders and hips upright.
 * - Jumping up with the arms raised: the hands move with the body (the same check).
 * - Holding a bar or a door frame and squatting under it: the shoulders rise and the hands stay,
 *   but the feet don't leave the floor. When the knees or ankles are seen at both the hang and
 *   the top, they must rise at least `legRise` of what the shoulders did.
 * - Standing with the arms down, sitting, lying: the hands aren't above the head (`notHanging`).
 *
 * Starting numbers from the geometry of a hang and real clips (docs/PULLUP_TESTS.md); they're JS,
 * so they can be retuned by update. The wake lab's readout shows them live.
 */
import type { PoseFrame } from './pushups.ts';
import { distance, midOf, tiltFromUpright, type Cheat, type Pt, type Reading, type TravelRules } from './travel.ts';

export const PULLUPS = {
  /** The default goal; the routine's `pullupGoal` sets the real one. */
  reps: 5,
  minConfidence: 0.2,
  /** Frames in a row a hang needs, and the top. */
  restFrames: 2,
  workFrames: 2,
  /** A hang: `reach` at least this (an arm about two-thirds straight)… */
  hangMin: 0.68,
  /** …and within this of the deepest hang seen this set (a wide grip's dead hang reads ~0.85). */
  hangSlack: 0.17,
  /** The deepest hang a set starts out expecting, before it has seen one. */
  hangStart: 0.85,
  /** The top: shoulders this few arms below the hands, at most. */
  topReach: 0.45,
  /** …or the nose up within this many arms of the hands (chin at the bar). */
  noseSlack: 0.08,
  /** The shoulders must have risen this many arms since the hang… */
  minRise: 0.33,
  /**
   * …while the hands, where the camera is sure of them, moved no more than this many arms (they're
   * on the bar). Loose: at the top the wrists hide behind the head and the bar and read up to half
   * an arm off (real clips); air pull-downs move them a whole arm.
   */
  maxBarDrift: 0.55,
  /** Wrists this sure count for the drift check. */
  handSure: 0.5,
  /**
   * The feet planted: knees or ankles, seen at the hang and the top, moved less than this many
   * arms (any direction) while the shoulders rose. Squatting under a bar, the feet don't move; on
   * a real pull-up they go up with you, and on a kip they swing (real clips, 2026-11-21: a kip's
   * ankles can rise far less than its shoulders, so "rose as much" turned real reps away).
   */
  legStill: 0.15,
  /** Legs count as seen this surely (they matter for the feet check, so a guess mustn't). */
  legSure: 0.4,
  /** The shoulders over the hips, the torso at most this far from upright, in degrees (kipping swings ~30°). */
  maxLeanDeg: 50,
  /**
   * The hands above the shoulders by at least this many arms, or it isn't a hang (`notHanging`),
   * unless the shoulders are up at the bar: there the camera often puts the wrists below them
   * (real clips: down to −0.5), hidden behind the head. Arms down by the sides read about −1.
   */
  handsUp: -0.15,
  /** A turn back from past this depth without the top is a half rep, said so. */
  shallowDepth: 0.35,
  /** Back from the top under this depth and up again without a hang: a half rep. */
  reArmDepth: 0.55,
  /** The shortest time between two reps (a fast kip is ~1.2 s). */
  minRepMs: 800,
  /** The arm length's smoothing: this share of each new frame. */
  armEase: 0.25,
  /**
   * An arm against the torso (shoulders' middle to hips') outside this is the camera guessing:
   * skipped. Low: side-on at the top, the forearm is half hidden and reads short (0.5 of a torso
   * on real clips); the smoothed arm (`armEase`) keeps one short frame from moving the yardstick.
   */
  armToTorso: [0.4, 2.4],
  lostMs: 1_500,
  regainMs: 0,
  /** From the hang to the bar takes under 2 s even at a slow tempo (real clips: up to 1.7 s). */
  maxGoingMs: 3_000,
  /** No one hanging in view this long and the camera stops. */
  timeoutMs: 10 * 60_000,
} as const;

/** The hang this rep started from, and the reader's running numbers. */
export type PullMem = {
  /** The smoothed arm length, in the picture's units, or null before one. */
  arm: number | null;
  /** The deepest hang seen this set, in arms. */
  deepest: number;
  /** At the hang: the shoulders' lowest, the hands' height there, and the legs' lowest (null: not seen). */
  hang: { shoulderY: number; handY: number; leg: Pt | null; legLen: number | null; at: number } | null;
  /** The last frame's shoulder height and time, for the rise's speed; the fastest rise this attempt, in arms a second. */
  prev: { y: number; at: number } | null;
  speed: number;
};

const newMem = (): PullMem => ({ arm: null, deepest: PULLUPS.hangStart, hang: null, prev: null, speed: 0 });

type ArmSeen = { shoulder: Pt; elbow: Pt; wrist: Pt & { c: number } };

/** The arms the camera sees whole. */
function armsOf(joints: PoseFrame['joints']): ArmSeen[] {
  const arms: ArmSeen[] = [];
  for (const side of ['left', 'right'] as const) {
    const shoulder = joints[`${side}Shoulder`];
    const elbow = joints[`${side}Elbow`];
    const wrist = joints[`${side}Wrist`];
    const least = PULLUPS.minConfidence;
    if (shoulder && elbow && wrist && shoulder.c >= least && elbow.c >= least && wrist.c >= least) arms.push({ shoulder, elbow, wrist });
  }
  return arms;
}

/** The lowest leg point seen surely: the ankles' middle, else the knees'. */
function legAt(joints: PoseFrame['joints']): Pt | null {
  return midOf(joints, 'Ankle', PULLUPS.legSure) ?? midOf(joints, 'Knee', PULLUPS.legSure);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * One frame, read: how far up (0 hanging, 1 at the top), whether it's a hang or the top, and at
 * the top, whether it's fair. Updates the smoothed arm, the deepest hang and the hang's snapshot.
 */
export function readPullup(joints: PoseFrame['joints'], mem: PullMem, phase: string, at = 0): { reading: Reading; mem: PullMem } {
  const P = PULLUPS;
  const arms = armsOf(joints);
  const hips = midOf(joints, 'Hip', P.minConfidence);
  if (!arms.length || !hips) return { reading: { hint: 'noBody' }, mem };
  // Each measure from the same arms, so a side seen only in part can't skew it.
  const shoulder = { x: mean(arms.map((a) => a.shoulder.x)), y: mean(arms.map((a) => a.shoulder.y)) };
  const handY = mean(arms.map((a) => a.wrist.y));
  const bones = mean(arms.map((a) => distance(a.shoulder, a.elbow) + distance(a.elbow, a.wrist)));
  const torso = distance(shoulder, hips);
  const [least, most] = P.armToTorso;
  if (!(torso > 0) || bones < torso * least || bones > torso * most) return { reading: { hint: 'noBody' }, mem };
  // Upright: lying down, the torso is flat; doubled over, it isn't a hang.
  if (hips.y <= shoulder.y || tiltFromUpright(shoulder, hips) > P.maxLeanDeg) return { reading: { hint: 'notHanging' }, mem };

  const arm = mem.arm === null ? bones : mem.arm + (bones - mem.arm) * P.armEase;
  const reach = (shoulder.y - handY) / arm;
  const upAtBar = !!mem.hang && (shoulder.y - mem.hang.handY) / arm <= P.topReach + 0.15;
  if (reach < P.handsUp && !upAtBar) return { reading: { hint: 'notHanging' }, mem: { ...mem, arm } };

  const next: PullMem = { ...mem, arm };
  const atRest = reach >= Math.max(P.hangMin, next.deepest - P.hangSlack);
  const legPt = legAt(joints);
  const legs = legPt?.y ?? null;
  if (atRest) {
    // The hang's snapshot: from the first hang frame after a rep, kept at its lowest.
    const fresh = !mem.hang || phase === 'work' || phase === 'none';
    const len = legs === null ? null : legs - hips.y;
    const h = fresh ? { shoulderY: shoulder.y, handY, leg: legPt, legLen: len, at } : mem.hang!;
    next.hang = {
      shoulderY: Math.max(h.shoulderY, shoulder.y),
      handY: fresh ? handY : (h.handY + handY) / 2,
      // The last place they were seen hanging: where planted feet would still be.
      leg: legPt ?? h.leg,
      legLen: len === null ? h.legLen : h.legLen === null ? len : Math.min(h.legLen, len),
      at,
    };
    next.speed = 0;
    // Glitches can read longer than a body: the deepest is only ever nudged up, never jumped.
    if (reach > next.deepest) next.deepest = Math.min(1.05, next.deepest + (reach - next.deepest) * 0.3);
  }

  // How fast the shoulders go up, in arms a second, smoothed over two frames: a jump is a burst.
  if (mem.prev && at > mem.prev.at) {
    const v = (mem.prev.y - shoulder.y) / arm / ((at - mem.prev.at) / 1000);
    if (!atRest) next.speed = Math.max(next.speed, v);
  }
  next.prev = { y: shoulder.y, at };
  const restReach = Math.max(P.hangMin, next.deepest - P.hangSlack);
  const hang = next.hang;
  // The top is measured against the bar: where the hands were at the hang. At the top the wrists
  // hide behind the head and the bar, and the camera reads them worst of all (real clips,
  // 2026-11-21); at the hang, arms straight, it reads them best.
  const bar = hang ? hang.handY : handY;
  const toBar = (shoulder.y - bar) / arm;
  const depth = (restReach - toBar) / (restReach - P.topReach);
  const nose = joints.nose;
  const noseUp = !!nose && nose.c >= P.legSure && nose.y <= bar + P.noseSlack * arm;
  const atWork = !atRest && (toBar <= P.topReach || noseUp);
  const handsSure = arms.every((a) => a.wrist.c >= P.handSure);

  let cheat: Cheat | null = null;
  if (atWork && hang) {
    const rise = (hang.shoulderY - shoulder.y) / arm;
    const drift = Math.abs(handY - hang.handY) / arm;
    if (rise < P.minRise || (handsSure && drift > P.maxBarDrift)) cheat = 'bar';
    else if (legPt && hang.leg && distance(legPt, hang.leg) < P.legStill * arm) cheat = 'feet';
  } else if (atWork) cheat = 'bar';

  const info = `reach ${reach.toFixed(2)} to bar ${toBar.toFixed(2)} (hang ≥${restReach.toFixed(2)}, top ≤${P.topReach}${noseUp ? ', nose up' : ''})${
    hang ? `  rise ${((hang.shoulderY - shoulder.y) / arm).toFixed(2)}  bar drift ${(Math.abs(handY - hang.handY) / arm).toFixed(2)}` : ''
  }${hang && legs !== null && hang.legLen !== null ? `  leg +${((legs - hips.y - hang.legLen) / arm).toFixed(2)}` : ''}  speed ${next.speed.toFixed(1)}  ${hang ? `${((at - hang.at) / 1000).toFixed(2)}s` : ''}`;
  return { reading: { depth, atRest, atWork, cheat, info }, mem: next };
}

export const PULLUP_RULES: TravelRules<PullMem> = {
  ...PULLUPS,
  countAt: 'work',
  newMem,
  read: readPullup,
};
