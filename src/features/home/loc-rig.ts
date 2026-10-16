/**
 * Loc, rigged: his traced silhouette on a skinned skeleton with physics, drawn with WebGL and
 * a 2D canvas. Ported from the browser study (docs/LOC_SILHOUETTE.md,
 * docs/design-references/loc-animation/loc-in-motion.html); runs inside the `loc-stage` DOM
 * component, so it's plain web code.
 *
 * How it moves (rounds 3 and 4 of the study):
 * - Channels (posture, tilt, ears, lids, pupils...) have a resting value per mood and spring
 *   between them. Short "habits" and the poke are keyframed on top.
 * - The silhouette is a mesh weighted to seven bones (paws, body, head, two ears, two cheek
 *   fluffs), so he bends where bones meet instead of hinging.
 * - Moves travel down the chain (body, then head, then ears), and the head, ears and fluff
 *   have spring physics, so they lag, overshoot and settle on their own.
 * - The face rides the head bone: round "button" eyes with big pupils (eye-study.html option 04)
 *   that squash, stretch and wobble like jelly. No sleep mask (user, October 10, 2026: "remove
 *   the sleep mask"): the lids carry every expression.
 */
import { buildHand, fidgeting, newHandSim, splat, stepHand, traceHand, wristAt, type HandPose, type HandSim } from './loc-hands';
import { LOC_HEIGHT, LOC_PATH } from './loc-path';
import { NAV_KNOCK, type BurrowPath } from './nav-knock-tune';
import { seeded, ultraNav, ultraRun } from './loc-ultra';
import { zoomLump } from './loc-zoomies';
import type { Rim } from './rim';

export type LocMood = 'asleep' | 'groggy' | 'awake' | 'smug' | 'betrayed';

type Vec = [number, number];
type Mat = [number, number, number, number, number, number];
export type Key = [number, number | 'S' | 'T', Ease?];
type Ease = keyof typeof E;
export type Bit = {
  ms: number;
  every?: [number, number];
  tracks: Partial<Record<Channel, Key[]>>;
  events?: [number, (r: LocRig) => void][];
  /**
   * Poses held this many times a second, like drawn animation on twos (12) instead of smooth
   * 60: the keys jump from pose to pose. Springs and physics still run smooth under them.
   */
  steps?: number;
  /**
   * A lump in the blanket while he's under it: height (0..1) and offset along the edge (share of
   * width). 'S' is where the lump was when the bit started.
   */
  lump?: {
    h: Key[];
    x: Key[];
    /** Width, times the usual: wider as he presses up under it, wider still as it falls flat. */
    w?: Key[];
    /** 0..1, a tremble while he strains against it. */
    shake?: Key[];
  };
  /** In a bit with a lump: from this far in he's through the covers, so a tap counts again. Left out, not till it ends. */
  outAt?: number;
};

// ---- Geometry, in the traced path's 818 x 552 box; the ledge is y = 552 ----
const LEDGE = LOC_HEIGHT;
const EYE_L: Vec = [352, 312];
const EYE_R: Vec = [538, 338];
const FACE = 8; // the head is drawn tilted; the face follows it
const BONE = {
  base: [430, 552] as Vec,
  neck: [440, 440] as Vec,
  headMass: [440, 250] as Vec,
  earL: { pivot: [255, 150] as Vec, tip: [215, 10] as Vec, a: [182, 194] as Vec, b: [328, 106] as Vec },
  earR: { pivot: [650, 228] as Vec, tip: [728, 124] as Vec, a: [598, 172] as Vec, b: [702, 284] as Vec },
  cheekL: [150, 400] as Vec,
  cheekR: [730, 400] as Vec,
};
const MESH = { x0: -24, x1: 842, y0: -64, y1: 1000, step: 20 };
/** The view box around him: room above the path for his ears to swing and for him to launch out. */
export const LOC_VIEW = { x: -40, y: -200, width: 898, height: 752 };

const INK = '#000000';
/**
 * The look of his face, in rig units. The Loc studio (/loc-studio) changes these live.
 * - `eyeWhite`: solid white eyes (user, October 10, 2026), not holes, with black pupils.
 * - `button`, `pupil`: button eyes (user's pick, October 10, 2026:
 *   docs/design-references/loc-animation/eye-study.html option 04, "with all the eye animations
 *   very dramatised"): round whites this big, with big pupils. Every move is exaggerated: blinks
 *   squash them flat and they bounce back open, glances overshoot and stretch the eyes along the
 *   way, and a shock balloons them.
 * - `blinkLag`: ms the right eye blinks after the left. 0 keeps them together.
 * Signature traits, being explored in the Loc studio (docs/LOC_ANIMATION_REVIEW.md). Off by default:
 * - `heavyLid`: the right lid always sits this much lower (0..0.3), except when he's shocked wide.
 * - `faceSteps`: the face (eyes, lids, pupils) holds poses this many times a second, like drawn
 *   animation on twos at 12, while his body moves smooth. 0 is smooth.
 * - `snapGaze`: the pupils snap to where he looks and lock, he blinks when his gaze shifts, the
 *   lids follow the pupils up and down, and blinks close fast and open slower.
 * - `hands`: clawed raccoon grips on the ledge (loc-hands.ts) instead of the round paws traced
 *   into his outline. Off: on a phone they looked bad and stayed on screen after he hid (user,
 *   October 14, 2026: "I want those reverted").
 */
export const LOC_TUNE = {
  eyeWhite: '#FFFFFF', button: 34, pupil: 20, blinkLag: 0,
  heavyLid: 0, faceSteps: 0, snapGaze: false, hands: false,
};

// ---- Channels and moods ----
export const LOC_BASE = {
  y: 0, tilt: 0, earL: 0, earR: 0, open: 0.8, openR: 0.8, slope: 2, squint: 0.12,
  breathe: 0.45, pupils: 1, pupilR: 11.5, stretch: 0, gx: 0, gy: 0, pupilJit: 0, sink: 0, paw: 0,
  /** The eyeballs' squash and stretch: + tall and thin, - short and wide. Kicked by `pop`. */
  goo: 0,
  /** Pupil size on top of `pupilR`: they swell when he's startled and shrink to dots when he glares. */
  swell: 1,
  /** The right pupil against the left: above 1 it's bigger, below smaller (the lopsided, unhinged look). */
  swellR: 1,
  /** The right eye's size against the left. */
  eyeR: 1,
  /** The top lids' edge: + sags in the middle (soft, sleepy), - arches (sharp, wary). Straight at 0. */
  curve: 0,
  /** The bottom lids push up in the middle, 0..1: a smiling squint. */
  smile: 0,
  /** Leaning in toward you, 0..1: he grows from the ledge as if his face comes closer. */
  lean: 0,
  /** His body slides along the ledge, rig units (- left). The hands stay where they grip. */
  slide: 0,
  // Hands (LOC_TUNE.hands, loc-hands.ts), left and right: see HandPose there.
  hLx: 102, hLy: 446, hLa: 180, hLs: 0.3, hLc: 0.85, hLz: 1, hLf: 0, hLb: 0, hLt: 0, hLw: 0,
  hRx: 716, hRy: 446, hRa: 180, hRs: 0.3, hRc: 0.85, hRz: 1, hRf: 0, hRb: 0, hRt: 0, hRw: 0,
};
const BASE = LOC_BASE;
export type LocChannel = keyof typeof BASE;
type Channel = LocChannel;
const KEYS = Object.keys(BASE) as Channel[];
/** Each mood's resting pose (`set`, on top of BASE), breathing rate and blinks. The Loc studio changes these live. */
export const LOC_MOODS: Record<LocMood, { set: Partial<Record<Channel, number>>; rate: number; blinks: false | 'slow' | 'normal' }> = {
  asleep: { set: { y: 46, tilt: 5, earL: -22, earR: 22, open: 0, openR: 0, breathe: 1, pupils: 0 }, rate: 0.19, blinks: false },
  groggy: { set: { y: 20, tilt: 7, earL: -10, earR: 13, open: 0.34, openR: 0.27, squint: 0.15, breathe: 0.7 }, rate: 0.24, blinks: 'slow' },
  awake: { set: {}, rate: 0.3, blinks: 'normal' },
  smug: { set: { y: -8, tilt: -6, earL: 7, earR: -7, open: 0.42, openR: 0.6, slope: -8, squint: 0.35 }, rate: 0.3, blinks: 'normal' },
  betrayed: { set: { y: -12, earL: -34, earR: 34, open: 1.2, openR: 1.2, slope: -12, pupilR: 8, breathe: 0.25, pupilJit: 0.35 }, rate: 0.5, blinks: false },
};
const MOODS = LOC_MOODS;
const TARGET = Object.fromEntries(Object.entries(MOODS).map(([k, m]) => [k, { ...BASE, ...m.set }])) as Record<LocMood, typeof BASE>;
/** After changing LOC_MOODS (the Loc studio): every rig's moods pick up the new poses. */
export function retuneLoc() {
  for (const mood of Object.keys(MOODS) as LocMood[]) {
    for (const k of KEYS) delete (TARGET[mood] as Partial<typeof BASE>)[k];
    Object.assign(TARGET[mood], BASE, MOODS[mood].set);
  }
}
// Stiffness and damping ratio: head firm, eyes fast, pupils fastest.
const SPRING: Record<Channel, [number, number]> = {
  y: [90, 0.9], tilt: [90, 0.85], earL: [150, 0.42], earR: [150, 0.42], open: [280, 1], openR: [280, 1], slope: [220, 1], squint: [220, 1],
  breathe: [40, 1], pupils: [160, 1], pupilR: [220, 1], stretch: [220, 0.4],
  gx: [700, 1], gy: [700, 1], pupilJit: [90, 1], sink: [60, 0.95], paw: [160, 0.6],
  // Loose on purpose: the eyes wobble like jelly after every kick.
  goo: [320, 0.2], swell: [240, 0.3],
  swellR: [240, 0.5], eyeR: [240, 0.5], curve: [220, 1], smile: [220, 1], lean: [70, 0.9], slide: [90, 0.9],
  hLx: [170, 0.7], hLy: [170, 0.7], hLa: [170, 0.7], hLs: [220, 0.8], hLc: [220, 0.8], hLz: [170, 0.7], hLf: [300, 1], hLb: [300, 1],
  hRx: [170, 0.7], hRy: [170, 0.7], hRa: [170, 0.7], hRs: [220, 0.8], hRc: [220, 0.8], hRz: [170, 0.7], hRf: [300, 1], hRb: [300, 1],
  hLt: [300, 0.8], hLw: [200, 1], hRt: [300, 0.8], hRw: [200, 1],
};
const E = {
  lin: (t: number) => t,
  in: (t: number) => t * t,
  out: (t: number) => 1 - (1 - t) * (1 - t),
  io: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  /** Gravity: slow off the mark, then faster and faster. */
  in3: (t: number) => t * t * t,
  back: (t: number) => { const c = 1.9, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

// Habits: short bits each mood plays now and then, only when nothing else is running.
const HABITS: Partial<Record<LocMood, Bit>> = {
  groggy: { every: [4.5, 2.5], ms: 2500, tracks: {
    y: [[0, 'S'], [1500, 36, 'in'], [1620, 14, 'back'], [2500, 'T', 'io']],
    tilt: [[0, 'S'], [1500, 12, 'in'], [1620, 5, 'back'], [2500, 'T', 'io']],
    open: [[0, 'S'], [1300, 0.02, 'io'], [1560, 0.02], [1640, 0.62, 'back'], [2500, 'T', 'io']],
    openR: [[0, 'S'], [1300, 0, 'io'], [1560, 0], [1660, 0.56, 'back'], [2500, 'T', 'io']],
    earL: [[0, 'S'], [1500, -20, 'in'], [1600, 4, 'back'], [2500, 'T', 'io']],
    earR: [[0, 'S'], [1500, 24, 'in'], [1600, -2, 'back'], [2500, 'T', 'io']],
    gx: [[0, 0], [1500, 0], [1600, -14, 'out'], [1900, 12, 'out'], [2200, 0, 'io']],
    gy: [[0, 2], [2500, 2]],
    swell: [[0, 'S'], [1560, 'S'], [1650, 1.5, 'back'], [2000, 1.5], [2500, 'T', 'io']],
  }, events: [[1560, (r) => { r.kick(0.05); r.pop(0.5); }]] },
  asleep: { every: [6, 4], ms: 1400, tracks: { stretch: [[0, 0], [260, 0.025, 'out'], [700, 0, 'io']] },
    events: [[300, (r) => r.flick('L', -10)], [650, (r) => r.flick('R', 8)]] },
  smug: { every: [5, 3], ms: 1800, tracks: {
    open: [[0, 'S'], [380, 0.06, 'io'], [700, 0.06], [1100, 'T', 'io']],
    openR: [[0, 'S'], [420, 0.08, 'io'], [720, 0.08], [1120, 'T', 'io']],
    tilt: [[0, 'S'], [600, -10, 'io'], [1500, 'T', 'io']],
    y: [[0, 'S'], [600, -12, 'io'], [1500, 'T', 'io']],
  }, events: [[900, (r) => r.flick('R', 12)], [1100, (r) => r.pop(0.2)]] },
  awake: { every: [7, 4], ms: 2400, tracks: {
    gx: [[0, 0], [160, -20, 'out'], [700, -20], [860, 18, 'out'], [1400, 18], [1560, 0, 'out'], [2400, 0]],
    gy: [[0, 0], [2400, 0]],
    tilt: [[0, 'S'], [500, -3, 'io'], [1200, 3, 'io'], [2000, 'T', 'io']],
    swell: [[0, 'S'], [860, 'S'], [960, 1.35, 'back'], [1400, 1.35], [1800, 'T', 'io']],
  }, events: [[900, (r) => { r.flick('R', 10); r.pop(0.3); }]] },
};

// Tap: a flinch with his eyes squeezed shut, then they spring open huge with the pupils swollen
// (a double take), then slam into a glare: pupils shrunk to trembling dots, lids slanted.
const POKE: Bit = { ms: 1900, tracks: {
  stretch: [[0, 0], [80, -0.1, 'out'], [260, 0.02, 'back'], [500, 0, 'io']],
  y: [[0, 'S'], [80, 14, 'out'], [260, 'S', 'back']],
  open: [[0, 'S'], [260, 'S'], [340, 1.3, 'back'], [620, 1.3], [740, 0.52, 'out'], [1500, 0.52], [1900, 'T', 'io']],
  openR: [[0, 'S'], [260, 'S'], [340, 1.3, 'back'], [620, 1.3], [740, 0.6, 'out'], [1500, 0.6], [1900, 'T', 'io']],
  swell: [[0, 'S'], [260, 'S'], [340, 1.7, 'back'], [620, 1.7], [740, 0.62, 'out'], [1500, 0.62], [1900, 'T', 'io']],
  squint: [[0, 'S'], [620, 'S'], [740, 0.36, 'out'], [1500, 0.36], [1900, 'T', 'io']],
  slope: [[0, 'S'], [620, 'S'], [740, 26, 'out'], [1500, 26], [1900, 'T', 'io']],
  pupilJit: [[0, 'S'], [740, 'S'], [800, 0.7, 'out'], [1400, 0.7], [1600, 'T', 'io']],
  pupils: [[0, 'S'], [100, 1]],
  earL: [[0, 'S'], [90, -30, 'out'], [600, -12, 'io'], [1900, 'T', 'io']],
  earR: [[0, 'S'], [90, 30, 'out'], [600, 12, 'io'], [1900, 'T', 'io']],
}, events: [[0, (r) => { r.squeezing = true; }], [260, (r) => { r.squeezing = false; r.pop(0.55); r.say('poke'); }], [720, (r) => r.pop(-0.4)]] };

/**
 * Reduce Motion: no launching, sinking or burrowing. He fades in and out where he sits
 * (`setPresent`), and a tap (or two) gets the same look without the flinch or the dive.
 */
const FADE_MS = 250;
const calm = (bit: Bit, cue: 'poke' | 'angry'): Bit => ({
  ms: bit.ms,
  tracks: Object.fromEntries(Object.entries(bit.tracks).filter(([key]) => !['stretch', 'y', 'sink', 'paw'].includes(key))),
  events: [[260, (r) => r.say(cue)]],
});
const POKE_CALM = calm(POKE, 'poke');
const BURROW_CALM = calm(POKE, 'angry');
const ARRIVE_CALM: Bit = { ms: FADE_MS + 100, tracks: {}, events: [[FADE_MS, (r) => r.say('hello')]] };
const LEAVE_CALM: Bit = { ms: FADE_MS, tracks: {}, events: [[0, (r) => r.say('hide')]] };

/** How far down he goes to be out of sight: his body, and his paws (which only need to clear the edge). */
const HIDDEN = { sink: 720, paw: 80 };

// He lives under the covers, the nav strip (docs/LOC_SILHOUETTE.md, round 6). Off the edge the
// lump runs to the right, toward the other tabs' buttons, and comes back in from there.
const OFFSTAGE = 0.62;

/** The width his burrow run is sized to: a phone's, stretched as the nav row stretches to its 520 pt cap. */
const ROW_SPAN = 580;

/** The same bit at another speed: every key and event `k` times as far in. */
const timed = (bit: Bit, k: number): Bit => {
  const keys = (track: Key[]) => track.map(([t, v, e]): Key => (e ? [t * k, v, e] : [t * k, v]));
  const tracks = Object.fromEntries(Object.entries(bit.tracks).map(([c, track]) => [c, keys(track)]));
  const lump = bit.lump && (Object.fromEntries(Object.entries(bit.lump).map(([c, track]) => [c, keys(track)])) as Bit['lump']);
  const outAt = bit.outAt === undefined ? undefined : bit.outAt * k;
  return { ...bit, ms: bit.ms * k, tracks, events: bit.events?.map(([t, fn]) => [t * k, fn]), lump, outAt };
};

// Coming back (all at 0.7 of the authored times: "still too slow", user, October 12, 2026):
// the lump scurries in along the edge and brakes where he lives, wriggles and
// crouches. Then the pop (user, October 12, 2026: it "does not feel natural", and he should push
// the floor up). The floor strains up as wide as he is, trembling, in two shoves with a little
// give between, so you see something under it pushing, then he gathers (a dip) and it breaks: he launches out (eyes
// squeezed, ears pinned: the aggressive move goes on the way up, user, October 10, 2026),
// decelerating into a hang at the top, then gravity brings him down into a squash with his paws
// slapping the edge, and the eyes pop open to check the room. The covers don't vanish: they
// slide down off him and wobble flat.
const POP = 1420;
const ARRIVE: Bit = timed({ ms: POP + 1580, tracks: {
  sink: [[0, HIDDEN.sink], [1180, HIDDEN.sink], [1260, 640, 'out'], [1310, 670, 'io'], [1370, 610, 'out'], [1395, 640, 'io'], [POP, 600, 'out'],
    [POP + 140, -75, 'out'], [POP + 190, -68, 'io'], [POP + 320, 12, 'in'], [POP + 450, -5, 'out'], [POP + 590, 0, 'io']],
  paw: [[0, HIDDEN.paw], [POP + 330, HIDDEN.paw], [POP + 380, -12, 'out'], [POP + 520, 0, 'io']],
  stretch: [[0, 0], [1180, 0], [1260, -0.06, 'out'], [1370, -0.1, 'in'], [POP, -0.12], [POP + 90, 0.2, 'out'], [POP + 200, 0.05, 'io'],
    [POP + 300, 0.08, 'in'], [POP + 360, -0.15, 'out'], [POP + 470, 0.04, 'io'], [POP + 640, 0, 'io']],
  open: [[0, 'T'], [POP + 360, 'T'], [POP + 480, 1.15, 'back'], [POP + 1030, 1.15], [POP + 1430, 'T', 'io']],
  openR: [[0, 'T'], [POP + 360, 'T'], [POP + 480, 1.15, 'back'], [POP + 1030, 1.15], [POP + 1430, 'T', 'io']],
  swell: [[0, 'T'], [POP + 360, 'T'], [POP + 480, 1.6, 'back'], [POP + 1030, 1.6], [POP + 1430, 'T', 'io']],
  gx: [[0, 0], [POP + 720, 0], [POP + 780, -22, 'out'], [POP + 960, -22], [POP + 1020, 22, 'out'], [POP + 1200, 22], [POP + 1260, 0, 'out'], [POP + 1580, 0]],
  gy: [[0, 0], [POP + 1580, 0]],
  earL: [[0, 16], [1180, 16], [1260, 26, 'out'], [POP, 26], [POP + 120, 10, 'out'], [POP + 360, 16], [POP + 420, -14, 'out'], [POP + 680, 'T', 'back']],
  earR: [[0, -16], [1180, -16], [1260, -26, 'out'], [POP, -26], [POP + 120, -10, 'out'], [POP + 360, -16], [POP + 420, 14, 'out'], [POP + 680, 'T', 'back']],
}, events: [
  [1180, (r) => { r.squeezing = true; }],
  [POP + 360, (r) => { r.squeezing = false; r.kick(-0.08); r.flick('L', -14); r.flick('R', 14); r.pop(0.6); }],
  [POP + 780, (r) => r.pop(0.2)],
  [POP + 1020, (r) => { r.flick('R', 10); r.pop(0.2); }],
  [POP + 1330, (r) => r.say('hello')],
], outAt: POP + 360, lump: {
  h: [[0, 'S'], [80, 1, 'out'], [880, 1], [960, 1.4, 'out'], [1030, 1, 'io'], [1110, 0.6, 'io'], [1180, 0.6],
    [1260, 1.55, 'out'], [1310, 1.35, 'io'], [1370, 2.3, 'out'], [1395, 2.05, 'io'], [POP, 2.5, 'out'],
    [POP + 80, 1.4, 'out'], [POP + 190, 0.45, 'io'], [POP + 280, 0.8, 'io'], [POP + 380, 0.2, 'io'], [POP + 480, 0.35, 'io'], [POP + 600, 0, 'io']],
  x: [[0, OFFSTAGE], [760, -0.025, 'out'], [880, 0, 'io']],
  w: [[0, 1], [1180, 1], [1260, 1.3, 'out'], [1370, 1.5, 'out'], [POP, 1.5], [POP + 190, 1.9, 'out'], [POP + 600, 2.1]],
  shake: [[0, 0], [1180, 0], [1260, 0.5, 'out'], [1310, 0.2], [1370, 1, 'in'], [POP, 1], [POP + 40, 0]],
} }, 0.7);
// Asleep (at 0.6 of the authored times, about 1.5 s in all), he isn't in a hurry: the lump drifts in and settles. He pushes up slowly, dozes off
// against it and it sinks back a little, then a second, longer push, and he hauls himself
// through as the covers slide down off him: head lolling, paws flopping onto the edge last, an
// ear twitching. The eyes stay shut.
const RISE = 1450;
const ASLEEP_RISE: Bit = timed({ ms: RISE + 1000, events: [
  [RISE + 220, (r) => r.flick('L', -8)],
  [RISE + 560, (r) => r.kick(-0.04)],
  [RISE + 780, (r) => r.flick('R', 8)],
], outAt: RISE + 560, tracks: {
  sink: [[0, HIDDEN.sink], [950, HIDDEN.sink], [1120, 650, 'io'], [1240, 685, 'io'], [1400, 620, 'io'], [RISE, 610], [RISE + 560, -8, 'io'], [RISE + 680, 0, 'io']],
  paw: [[0, HIDDEN.paw], [RISE + 420, HIDDEN.paw], [RISE + 530, -8, 'out'], [RISE + 640, 0, 'io']],
  stretch: [[0, 0], [RISE, 0], [RISE + 300, 0.05, 'io'], [RISE + 560, -0.04, 'io'], [RISE + 720, 0, 'io']],
  tilt: [[0, 'T'], [RISE + 180, 'T'], [RISE + 430, 13, 'io'], [RISE + 620, 8, 'io'], [RISE + 1000, 'T', 'io']],
}, lump: {
  h: [[0, 'S'], [160, 1, 'out'], [950, 1], [1120, 1.45, 'io'], [1240, 1.15, 'io'], [1400, 1.9, 'io'], [RISE, 1.95],
    // Held up until his head is through, then it slides down off him.
    [RISE + 160, 2.05, 'io'], [RISE + 350, 1.0, 'io'], [RISE + 510, 0.4, 'io'], [RISE + 600, 0.55, 'io'], [RISE + 720, 0, 'io']],
  x: [[0, OFFSTAGE], [950, 0, 'out']],
  w: [[0, 1], [950, 1], [1120, 1.3, 'io'], [1400, 1.45, 'io'], [RISE + 160, 1.5], [RISE + 510, 1.9, 'io'], [RISE + 720, 2]],
  shake: [[0, 0], [1280, 0], [1400, 0.2, 'io'], [RISE, 0.2], [RISE + 60, 0]],
} }, 0.6);
// Then, up, he doesn't just sleep (user, October 12, 2026: "look around like sad... then close
// his eyes or yawn"). The lids come up heavy and slanted sad, the pupils fading in with them;
// he looks slowly one way, a slow heavy blink, then the other way, at a room that's still dark; a big slumped sigh, the
// ears drooping; and the eyes drift shut. In real time, from when he's settled on the edge.
const UP = Math.round((RISE + 680) * 0.6);
const SAD_LOOK: Bit['tracks'] = {
  open: [[0, 'T'], [UP + 150, 'T'], [UP + 550, 0.52, 'io'], [UP + 1260, 0.5], [UP + 1360, 0.04, 'io'], [UP + 1520, 0.48, 'io'], [UP + 1850, 0.44], [UP + 2400, 0, 'io']],
  openR: [[0, 'T'], [UP + 200, 'T'], [UP + 600, 0.44, 'io'], [UP + 1270, 0.42], [UP + 1380, 0.03, 'io'], [UP + 1560, 0.4, 'io'], [UP + 1850, 0.36], [UP + 2350, 0, 'io']],
  pupils: [[0, 'T'], [UP + 150, 'T'], [UP + 500, 1, 'io'], [UP + 1850, 1], [UP + 2100, 'T', 'io']],
  slope: [[0, 'T'], [UP + 150, 'T'], [UP + 550, -18, 'io'], [UP + 2100, -18], [UP + 2450, 'T', 'io']],
  gx: [[0, 0], [UP + 650, 0], [UP + 900, -24, 'io'], [UP + 1250, -24], [UP + 1550, 22, 'io'], [UP + 1900, 22], [UP + 2150, 0, 'io'], [UP + 2600, 0]],
  gy: [[0, 0], [UP + 650, 0], [UP + 900, 5, 'io'], [UP + 2150, 5], [UP + 2400, 0, 'io'], [UP + 2600, 0]],
  stretch: [[0, 0], [UP + 1850, 0], [UP + 2150, 0.06, 'io'], [UP + 2550, -0.03, 'io'], [UP + 2800, 0, 'io']],
  y: [[0, 'T'], [UP + 2150, 'T'], [UP + 2550, 58, 'io'], [UP + 3000, 'T', 'io']],
  earL: [[0, 'T'], [UP + 2150, 'T'], [UP + 2550, -30, 'io'], [UP + 3000, 'T', 'io']],
  earR: [[0, 'T'], [UP + 2150, 'T'], [UP + 2550, 30, 'io'], [UP + 3000, 'T', 'io']],
};
const ARRIVE_ASLEEP: Bit = {
  ...ASLEEP_RISE,
  ms: UP + 3000,
  // The rise's own keys run first; each of these picks up where the rise left that channel.
  tracks: Object.fromEntries(
    [...new Set([...Object.keys(ASLEEP_RISE.tracks), ...Object.keys(SAD_LOOK)])].map((c) => {
      const rise = ASLEEP_RISE.tracks[c as Channel] ?? [];
      const look = SAD_LOOK[c as Channel] ?? [];
      const end = rise.length ? rise[rise.length - 1][0] : 0;
      return [c, [...rise, ...look.filter(([t]) => t > end)]];
    }),
  ),
  events: [...(ASLEEP_RISE.events ?? []), [UP + 2200, (r) => r.flick('L', -10)], [UP + 2900, (r) => r.say('hello')]],
};
// Leaving: no drama (that's saved for the way up). He slides down out of sight, ears folding,
// paws letting go last; the lump comes up where he went under and runs off along the edge,
// faster and faster.
const LEAVE: Bit = { ms: 1300, events: [[0, (r) => r.say('hide')]], tracks: {
  sink: [[0, 'S'], [450, HIDDEN.sink, 'io']],
  paw: [[0, 'S'], [180, 'S'], [340, HIDDEN.paw, 'io']],
  earL: [[0, 'S'], [350, 14, 'io']],
  earR: [[0, 'S'], [350, -14, 'io']],
  open: [[0, 'S'], [250, 0.45, 'io']],
  openR: [[0, 'S'], [250, 0.45, 'io']],
}, lump: {
  h: [[0, 'S'], [380, 'S'], [520, 1, 'out'], [1300, 1]],
  x: [[0, 'S'], [560, 'S'], [1300, OFFSTAGE, 'in']],
} };

// Tapped twice: he dives under the covers (the nav strip), the lump scurries about in quick
// little hops, brakes where he lives, crouches, and he bursts out furious (user, October 10,
// 2026: faster, and pop up with an angry face): pupils shrunk to trembling dots, lids slanted,
// ears pinned. Where the lump goes is new every time (`burrowLump`): "he shouldn't feel so
// programmatic". `pop` is when he bursts out, which depends on how far he ran.
const burrowBit = (pop: number, lump: NonNullable<Bit['lump']>): Bit => ({ ms: pop + 1700, outAt: pop + 140, tracks: {
  stretch: [[0, 0], [150, -0.08, 'out'], [300, 0.12, 'in'], [460, 0, 'out'], [pop, 0], [pop + 90, 0.16, 'out'], [pop + 200, -0.1, 'io'], [pop + 320, 0.03, 'io'], [pop + 480, 0, 'io']],
  sink: [[0, 'S'], [150, -6, 'out'], [460, HIDDEN.sink, 'in3'], [pop, HIDDEN.sink], [pop + 130, -60, 'out'], [pop + 260, 12, 'in'], [pop + 340, -4, 'out'], [pop + 460, 0, 'io']],
  paw: [[0, 'S'], [300, 'S'], [460, HIDDEN.paw, 'in'], [pop + 220, HIDDEN.paw], [pop + 280, -12, 'out'], [pop + 400, 0, 'io']],
  y: [[0, 'S'], [pop + 260, 'S'], [pop + 340, -10, 'out'], [pop + 1100, -10], [pop + 1700, 'T', 'io']],
  earL: [[0, 'S'], [150, -18, 'out'], [460, 16, 'in'], [pop, 16], [pop + 120, -34, 'out'], [pop + 1100, -30], [pop + 1700, 'T', 'io']],
  earR: [[0, 'S'], [150, 18, 'out'], [460, -16, 'in'], [pop, -16], [pop + 120, 34, 'out'], [pop + 1100, 30], [pop + 1700, 'T', 'io']],
  open: [[0, 'S'], [pop + 200, 'S'], [pop + 280, 0.5, 'out'], [pop + 1200, 0.5], [pop + 1700, 'T', 'io']],
  openR: [[0, 'S'], [pop + 200, 'S'], [pop + 280, 0.58, 'out'], [pop + 1200, 0.58], [pop + 1700, 'T', 'io']],
  squint: [[0, 'S'], [pop + 200, 'S'], [pop + 280, 0.36, 'out'], [pop + 1200, 0.36], [pop + 1700, 'T', 'io']],
  slope: [[0, 'S'], [pop + 200, 'S'], [pop + 280, 28, 'out'], [pop + 1200, 28], [pop + 1700, 'T', 'io']],
  swell: [[0, 'S'], [pop + 200, 'S'], [pop + 280, 0.6, 'out'], [pop + 1200, 0.6], [pop + 1700, 'T', 'io']],
  pupilJit: [[0, 'S'], [pop + 280, 'S'], [pop + 320, 0.7, 'out'], [pop + 1000, 0.7], [pop + 1300, 'T', 'io']],
  pupils: [[0, 'S'], [100, 1]],
}, events: [
  [0, (r) => { r.squeezing = true; r.say('hide'); }],
  [460, (r) => { r.squeezing = false; }],
  // Squeezed shut on the way up, then the eyes snap open into the glare.
  [pop, (r) => { r.squeezing = true; }],
  [pop + 200, (r) => { r.squeezing = false; r.pop(-0.45); }],
  [pop + 260, (r) => { r.kick(-0.06); r.flick('L', -20); r.flick('R', 20); r.say('angry'); }],
], lump });

/** Pairs of [ms, value]: his eyes rolling round in circles, wide to start and settling, `turns` times. */
const rolling = (from: number, to: number, turns: number, rx: number, ry: number): { gx: Key[]; gy: Key[] } => {
  const gx: Key[] = [], gy: Key[] = [];
  for (let t = from; t <= to; t += 50) {
    const p = (t - from) / (to - from), a = p * turns * Math.PI * 2, k = 1 - 0.55 * p;
    gx.push([t, Math.round(Math.sin(a) * rx * k * 10) / 10, 'lin']);
    gy.push([t, Math.round(-Math.cos(a) * ry * k * 10) / 10, 'lin']);
  }
  return { gx, gy };
};

// After the ultra zoomies (loc-ultra.ts) he bursts out like any burrow, but he's been round the
// whole screen: he comes up dazed. One eye wide with a huge pupil, the other half shut on a
// pinpoint, the eyes rolling round in circles, the head wobbling and the ears flopping, slumped.
// Then he shakes it off like a wet dog, a blink, and snaps into the glare.
const ultraBit = (pop: number, lump: NonNullable<Bit['lump']>): Bit => {
  const P = pop, end = P + 3800;
  const roll = rolling(P + 300, P + 1800, 2.25, 24, 9);
  const base = burrowBit(pop, lump);
  return { ...base, ms: end, tracks: {
    ...base.tracks,
    y: [[0, 'S'], [P + 260, 'S'], [P + 340, -10, 'out'], [P + 560, 16, 'io'], [P + 1880, 16], [P + 2040, -12, 'out'], [P + 3200, -10], [end, 'T', 'io']],
    tilt: [[0, 'S'], [P + 300, 'S'], [P + 520, 15, 'io'], [P + 820, -13, 'io'], [P + 1120, 11, 'io'], [P + 1400, -8, 'io'], [P + 1660, 4, 'io'],
      [P + 1880, 0, 'io'], [P + 1940, 11, 'out'], [P + 2000, -11, 'io'], [P + 2060, 9, 'io'], [P + 2120, -7, 'io'], [P + 2180, 4, 'io'],
      [P + 2260, 0, 'io'], [end, 'T', 'io']],
    earL: [[0, 'S'], [150, -18, 'out'], [460, 16, 'in'], [P, 16], [P + 120, -34, 'out'], [P + 440, 20, 'io'], [P + 780, -6, 'io'],
      [P + 1120, 24, 'io'], [P + 1480, 0, 'io'], [P + 1880, 14, 'io'], [P + 1960, -32, 'out'], [P + 3200, -30], [end, 'T', 'io']],
    earR: [[0, 'S'], [150, 18, 'out'], [460, -16, 'in'], [P, -16], [P + 120, 34, 'out'], [P + 560, 4, 'io'], [P + 900, 26, 'io'],
      [P + 1260, -2, 'io'], [P + 1600, 20, 'io'], [P + 1880, -10, 'io'], [P + 1960, 32, 'out'], [P + 3200, 30], [end, 'T', 'io']],
    open: [[0, 'S'], [P + 200, 'S'], [P + 280, 1.15, 'out'], [P + 1880, 1.1], [P + 1940, 0, 'in'], [P + 2120, 0], [P + 2260, 0.5, 'out'], [P + 3200, 0.5], [end, 'T', 'io']],
    openR: [[0, 'S'], [P + 200, 'S'], [P + 280, 0.5, 'out'], [P + 1880, 0.55], [P + 1940, 0, 'in'], [P + 2140, 0], [P + 2260, 0.58, 'out'], [P + 3200, 0.58], [end, 'T', 'io']],
    squint: [[0, 'S'], [P + 200, 'S'], [P + 280, 0.1, 'out'], [P + 2120, 0.1], [P + 2260, 0.36, 'out'], [P + 3200, 0.36], [end, 'T', 'io']],
    slope: [[0, 'S'], [P + 200, 'S'], [P + 280, -4, 'out'], [P + 2120, -4], [P + 2260, 28, 'out'], [P + 3200, 28], [end, 'T', 'io']],
    swell: [[0, 'S'], [P + 200, 'S'], [P + 280, 1.7, 'out'], [P + 1880, 1.6], [P + 2260, 0.6, 'out'], [P + 3200, 0.6], [end, 'T', 'io']],
    swellR: [[0, 1], [P + 200, 1], [P + 280, 0.35, 'out'], [P + 1880, 0.4], [P + 2260, 1, 'out'], [end, 1]],
    eyeR: [[0, 1], [P + 200, 1], [P + 280, 0.85, 'out'], [P + 1880, 0.85], [P + 2260, 1, 'out'], [end, 1]],
    pupilJit: [[0, 'S'], [P + 280, 'S'], [P + 320, 0.2, 'out'], [P + 2120, 0.2], [P + 2280, 0.7, 'out'], [P + 3200, 0.7], [P + 3600, 'T', 'io']],
    gx: [[0, 0], [P + 280, 0], ...roll.gx, [P + 1900, 0, 'io'], [end, 0]],
    gy: [[0, 0], [P + 280, 0], ...roll.gy, [P + 1900, 0, 'io'], [end, 0]],
  }, events: [
    [0, (r) => { r.squeezing = true; r.say('hide'); }],
    [460, (r) => { r.squeezing = false; }],
    [pop, (r) => { r.squeezing = true; }],
    // Out, the eyes spring open tall: boing.
    [P + 200, (r) => { r.squeezing = false; r.pop(0.8); }],
    [P + 260, (r) => { r.kick(-0.06); r.flick('L', -20); r.flick('R', 20); }],
    [P + 520, (r) => r.say('ultra')],
    [P + 820, (r) => r.pop(0.25)],
    [P + 1400, (r) => r.pop(0.2)],
    // Shaking it off.
    [P + 1940, (r) => { r.flick('L', -18); r.flick('R', 18); r.pop(0.35); }],
    [P + 2060, (r) => { r.flick('L', 14); r.flick('R', -14); r.kick(0.04); }],
    [P + 2180, (r) => { r.flick('L', -10); r.flick('R', 10); }],
    // Into the glare.
    [P + 2260, (r) => { r.pop(-0.45); r.kick(-0.05); }],
  ] };
};

// ---- Explorations (docs/LOC_ANIMATION_REVIEW.md): new acting, played only from the Loc studio ----

/**
 * The unhinged pop: a cut, not a move. On one frame his pupils go mismatched (one a pinpoint, one
 * huge), the lids go flat and level and he leans in; it holds dead still while one lower lid
 * twitches in two bursts; then a double blink at normal speed and a glance away, as if nothing
 * happened. The cut in and the clean exit keep it funny, not creepy (benign violation).
 */
const UNHINGED: Bit = { ms: 2700, tracks: {
  open: [[0, 'S'], [17, 0.95, 'lin'], [1250, 0.95], [1500, 'T', 'io']],
  openR: [[0, 'S'], [17, 1.45, 'lin'], [1250, 1.45], [1500, 'T', 'io']],
  eyeR: [[0, 1], [17, 1.3, 'lin'], [1250, 1.32], [1450, 1, 'io']],
  slope: [[0, 'S'], [17, 0, 'lin'], [1250, 0], [1500, 'T', 'io']],
  squint: [[0, 'S'], [17, 0.12, 'lin'], [420, 0.12], [437, 0.34, 'lin'], [470, 0.12, 'lin'], [505, 0.36, 'lin'], [540, 0.12, 'lin'],
    [880, 0.12], [897, 0.34, 'lin'], [930, 0.12, 'lin'], [1250, 0.12], [1500, 'T', 'io']],
  swell: [[0, 'S'], [17, 0.3, 'lin'], [1250, 0.3], [1450, 'T', 'io']],
  swellR: [[0, 1], [17, 5.5, 'lin'], [1250, 5.5], [1450, 1, 'io']],
  lean: [[0, 0], [17, 0.12, 'lin'], [1250, 0.15], [1500, 0, 'io']],
  tilt: [[0, 'S'], [17, -9, 'lin'], [1250, -10], [1600, 'T', 'io']],
  earL: [[0, 'S'], [17, -28, 'lin'], [1250, -28], [1600, 'T', 'io']],
  earR: [[0, 'S'], [17, 28, 'lin'], [1250, 28], [1600, 'T', 'io']],
  gx: [[0, 0], [1700, 0], [1760, -22, 'out'], [2350, -22], [2420, 0, 'out'], [2700, 0]],
  gy: [[0, 0], [1700, 0], [1760, 4, 'out'], [2350, 4], [2420, 0, 'out'], [2700, 0]],
}, events: [[1330, (r) => r.blinkNow()], [1600, (r) => r.blinkNow()]] };

/**
 * The dead stare, for a deadpan doom line ("I am doom."): pupils small and dead centre, lids flat
 * at about a third, and no blink for three and a half seconds; only a slow drift. The joke is the
 * blink that never comes. It ends in one long, slow blink.
 */
const DEAD_STARE: Bit = { ms: 5000, tracks: {
  open: [[0, 'S'], [260, 0.5, 'io'], [3900, 0.5], [4020, 0, 'in'], [4100, 0], [4600, 'T', 'out']],
  openR: [[0, 'S'], [260, 0.48, 'io'], [3900, 0.48], [4030, 0, 'in'], [4110, 0], [4620, 'T', 'out']],
  slope: [[0, 'S'], [260, 0, 'io'], [4100, 0], [4600, 'T', 'io']],
  squint: [[0, 'S'], [260, 0.2, 'io'], [4100, 0.2], [4600, 'T', 'io']],
  swell: [[0, 'S'], [260, 0.55, 'io'], [4100, 0.55], [4600, 'T', 'io']],
  gx: [[0, 0], [5000, 0]],
  gy: [[0, 0], [5000, 0]],
  tilt: [[0, 'S'], [3900, 3, 'io'], [4600, 'T', 'io']],
  y: [[0, 'S'], [3900, 8, 'io'], [4600, 'T', 'io']],
} };

/**
 * The comment lid ("save a move", Glen Keane): he looks straight at you, holds a beat, then one
 * lid drops, sagging, and stays down. A silent "really." It's the subtle beat after a reaction.
 */
const COMMENT_LID: Bit = { ms: 2600, tracks: {
  gx: [[0, 0], [2600, 0]],
  gy: [[0, 0], [2600, 0]],
  openR: [[0, 'S'], [330, 'S'], [400, 0.46, 'out'], [2050, 0.46], [2500, 'T', 'io']],
  curve: [[0, 0], [330, 0], [400, 4, 'out'], [2050, 4], [2500, 0, 'io']],
  swell: [[0, 'S'], [330, 'S'], [400, 0.85, 'out'], [2050, 0.85], [2500, 'T', 'io']],
}, events: [[410, (r) => r.flick('R', 9)]] };

/**
 * Bored of you: he looks right at you, pupils big, for two seconds; then loses interest and his
 * gaze drifts up and away to the moon, the lids sinking a little and the ears going slack.
 */
const BORED: Bit = { ms: 4600, tracks: {
  gx: [[0, 0], [2100, 0], [2700, 16, 'io'], [4100, 16], [4600, 0, 'io']],
  gy: [[0, 0], [2100, 0], [2700, -9, 'io'], [4100, -9], [4600, 0, 'io']],
  swell: [[0, 'S'], [150, 1.3, 'out'], [2100, 1.3], [2700, 0.95, 'io'], [4100, 0.95], [4600, 'T', 'io']],
  open: [[0, 'S'], [2100, 'S'], [2800, 0.6, 'io'], [4100, 0.6], [4600, 'T', 'io']],
  openR: [[0, 'S'], [2100, 'S'], [2850, 0.56, 'io'], [4100, 0.56], [4600, 'T', 'io']],
  earL: [[0, 'S'], [2200, 'S'], [2900, -9, 'io'], [4100, -9], [4600, 'T', 'io']],
  earR: [[0, 'S'], [2200, 'S'], [2900, 9, 'io'], [4100, 9], [4600, 'T', 'io']],
  tilt: [[0, 'S'], [2200, 'S'], [2900, 4, 'io'], [4100, 4], [4600, 'T', 'io']],
} };

/**
 * The slow blink: what a cat does when it trusts you. The lids come down soft and curved, the
 * bottom ones pushing up into a smile, and he holds it, then opens slowly. The quiet, warm one;
 * for the morning you actually got up.
 */
const SLOW_BLINK: Bit = { ms: 2500, tracks: {
  gx: [[0, 0], [2300, 0]],
  gy: [[0, 0], [2300, 0]],
  open: [[0, 'S'], [600, 0, 'io'], [1300, 0], [2000, 'T', 'io']],
  openR: [[0, 'S'], [650, 0, 'io'], [1330, 0], [2050, 'T', 'io']],
  smile: [[0, 0], [400, 0.8, 'io'], [1350, 0.8], [2000, 0, 'io']],
  curve: [[0, 0], [550, 5, 'io'], [1150, 5], [1900, 0, 'io']],
  y: [[0, 'S'], [600, 10, 'io'], [1200, 10], [2000, 'T', 'io']],
  earL: [[0, 'S'], [600, -8, 'io'], [1200, -8], [2000, 'T', 'io']],
  earR: [[0, 'S'], [600, 8, 'io'], [1200, 8], [2000, 'T', 'io']],
} };

/**
 * Sinking (the peek height as the emotion): betrayed, he slowly sinks until only his eyes are
 * over the edge, ears flat, and stays there, then comes back up. It reads from the outline alone,
 * so it works at any size.
 */
const SINK: Bit = { ms: 3600, tracks: {
  sink: [[0, 'S'], [900, 215, 'io'], [2700, 215], [3500, 0, 'io']],
  earL: [[0, 'S'], [700, -40, 'io'], [2700, -40], [3400, 'T', 'io']],
  earR: [[0, 'S'], [700, 40, 'io'], [2700, 40], [3400, 'T', 'io']],
  open: [[0, 'S'], [500, 1.08, 'io'], [2700, 1.08], [3400, 'T', 'io']],
  openR: [[0, 'S'], [500, 1.08, 'io'], [2700, 1.08], [3400, 'T', 'io']],
  slope: [[0, 'S'], [500, -16, 'io'], [2700, -16], [3400, 'T', 'io']],
  swell: [[0, 'S'], [500, 0.8, 'io'], [2700, 0.8], [3400, 'T', 'io']],
  gx: [[0, 0], [1300, 0], [1500, -10, 'out'], [2000, -10], [2200, 0, 'out'], [3600, 0]],
  gy: [[0, 0], [3600, 0]],
} };


// ---- Hands (LOC_TUNE.hands): only ever the grips on the ledge ----
// User, October 14, 2026: no long arms or hands that change shape. The hands stay as they rest,
// curled over the ledge; they can shift, lift a little, clench and tap. The acting is in his eyes.

type HandProp = 'x' | 'y' | 'c' | 's' | 'w';
/** A hand keyframe: at `ms`, these props ('S' start, 'T' rest, 'H' hold the last key), eased in. */
type HandKey = [number, Partial<Record<HandProp, number | 'S' | 'T' | 'H'>>, Ease?];
/** A hand's keys as tracks. A pose that leaves a prop out lets it carry on to its next key. */
const handTracks = (side: 'L' | 'R', keys: HandKey[]): Partial<Record<Channel, Key[]>> => {
  const out: Partial<Record<Channel, Key[]>> = {};
  for (const [t, pose, ease] of keys) {
    for (const [prop, given] of Object.entries(pose) as [HandProp, number | 'S' | 'T' | 'H'][]) {
      const ch = `h${side}${prop}` as Channel;
      const track = (out[ch] ??= [[0, 'S']]);
      const v = given === 'H' ? track[track.length - 1][1] : given;
      track.push(ease ? [t, v, ease] : [t, v]);
    }
  }
  return out;
};
/** Joins key lists for the same channel, in order. */
const joinTracks = (...parts: Partial<Record<Channel, Key[]>>[]) => {
  const out: Partial<Record<Channel, Key[]>> = {};
  for (const part of parts) for (const [k, keys] of Object.entries(part) as [Channel, Key[]][]) {
    const prev = out[k];
    out[k] = prev ? [...prev, ...keys.filter(([t]) => t > prev[prev.length - 1][0])] : keys;
  }
  return out;
};
const ft = (keys: [number, number | 'S' | 'T', Ease?][]): Key[] => keys.map(([t, v, e]) => (e ? [t, v, e] : [t, v]));
/** Where each hand rests, and how high is "lifted" (a hop off the ledge, never more). */
const REST_X = { L: 102, R: 716 };
const REST_Y = 446;
const LIFT_Y = 418;
/** A step: the hand hops up a little, moves to `x`, and lands with a grip. */
const step = (side: 'L' | 'R', at: number, x: number, ms = 220): HandKey[] => [
  [at, { x: 'H', y: REST_Y, c: 'H' }],
  [at + ms * 0.4, { y: LIFT_Y, c: 0.62 }, 'out'],
  [at + ms, { x, y: REST_Y, c: 0.92 }, 'in'],
];

/**
 * Hiding: he ducks behind the ledge, leaving his ears and his hands clutching the edge. His eyes
 * come up just over it, look left, look right, and he ducks again; then up.
 */
const HIDE: Bit = { ms: 3500, tracks: joinTracks(
  handTracks('L', [[0, { c: 'S' }], [140, { c: 0.7 }, 'out'], [330, { c: 1 }, 'in'], [2900, { c: 1 }], [3350, { c: 'T' }, 'io']]),
  handTracks('R', [[0, { c: 'S' }], [180, { c: 0.72 }, 'out'], [380, { c: 1 }, 'in'], [2900, { c: 1 }], [3350, { c: 'T' }, 'io']]),
  {
    y: ft([[0, 'S'], [110, -8, 'out'], [380, 'T', 'io']]),
    sink: ft([[0, 'S'], [110, -6, 'out'], [360, 305, 'in'], [420, 295, 'out'], [1300, 295], [1620, 228, 'io'], [2150, 228], [2300, 305, 'in'], [2800, 305], [3350, 0, 'io']]),
    earL: ft([[0, 'S'], [300, -30, 'out'], [1300, -30], [1600, -6, 'io'], [2150, -6], [2300, -30, 'out'], [2900, -30], [3350, 'T', 'io']]),
    earR: ft([[0, 'S'], [300, 30, 'out'], [1300, 30], [1600, 6, 'io'], [2150, 6], [2300, 30, 'out'], [2900, 30], [3350, 'T', 'io']]),
    open: ft([[0, 'S'], [110, 1.15, 'out'], [1500, 1.15], [3350, 'T', 'io']]),
    openR: ft([[0, 'S'], [110, 1.15, 'out'], [1500, 1.15], [3350, 'T', 'io']]),
    gx: ft([[0, 0], [1620, 0], [1680, -22, 'out'], [1880, -22], [1940, 22, 'out'], [2140, 22], [2200, 0, 'out'], [3500, 0]]),
    gy: ft([[0, 0], [3500, 0]]),
  },
), events: [[820, (r) => r.flick('R', 10)], [1700, (r) => r.pop(0.3)]] };

/**
 * Shuffling over: his eyes go left first, then he follows them, hand over hand along the ledge,
 * his body sliding after. He takes a look from there, back at you, and shuffles home.
 */
const SCOOT: Bit = (() => {
  const d = -95;
  return { ms: 4300, tracks: joinTracks(
    handTracks('L', [...step('L', 380, REST_X.L + d), ...step('L', 2700, REST_X.L)]),
    handTracks('R', [...step('R', 560, REST_X.R + d), ...step('R', 2880, REST_X.R)]),
    {
      gx: ft([[0, 0], [120, -24, 'out'], [1500, -24], [1560, 20, 'out'], [2250, 20], [2310, 0, 'out'], [2500, 0], [2560, 22, 'out'], [3300, 22], [3360, 0, 'out'], [4300, 0]]),
      gy: ft([[0, 0], [4300, 0]]),
      slide: ft([[0, 0], [380, 0], [640, d * 0.45, 'io'], [800, d, 'out'], [2700, d], [2960, d * 0.55, 'io'], [3120, 0, 'out']]),
      tilt: ft([[0, 'S'], [380, -6, 'io'], [800, 2, 'out'], [1100, 'T', 'io'], [2700, 'T'], [2900, 6, 'io'], [3200, 'T', 'io']]),
      y: ft([[0, 'S'], [400, 8, 'io'], [560, -2, 'io'], [760, 8, 'io'], [1000, 'T', 'io'], [2700, 'T'], [2800, 8, 'io'], [3000, -2, 'io'], [3200, 'T', 'io']]),
      open: ft([[0, 'S'], [1500, 'S'], [1560, 0.55, 'io'], [2250, 0.55], [2400, 'T', 'io']]),
      openR: ft([[0, 'S'], [1500, 'S'], [1560, 0.5, 'io'], [2250, 0.5], [2400, 'T', 'io']]),
    },
  ), events: [[1480, (r) => r.blinkNow()], [3420, (r) => r.blinkNow()]] };
})();

/**
 * Clutching the ledge: something startles him. His eyes go huge first, then his hands clench the
 * edge, knuckles up, and he shrinks down, pupils trembling. It passes; he comes back up slowly,
 * with a heavy-lidded side-eye at you, as if it was your fault.
 */
const CLUTCH: Bit = { ms: 3800, tracks: joinTracks(
  handTracks('L', [[0, { c: 'S', y: 'S' }], [140, { c: 1, y: 452 }, 'out'], [1800, { c: 1, y: 452 }], [2500, { c: 'T', y: 'T' }, 'io']]),
  handTracks('R', [[0, { c: 'S', y: 'S' }], [180, { c: 1, y: 452 }, 'out'], [1850, { c: 1, y: 452 }], [2550, { c: 'T', y: 'T' }, 'io']]),
  {
    open: ft([[0, 'S'], [70, 1.35, 'out'], [1700, 1.3], [2300, 0.45, 'io'], [3200, 0.45], [3700, 'T', 'io']]),
    openR: ft([[0, 'S'], [70, 1.35, 'out'], [1700, 1.3], [2300, 0.4, 'io'], [3200, 0.4], [3700, 'T', 'io']]),
    swell: ft([[0, 'S'], [70, 0.45, 'out'], [1700, 0.45], [2300, 'T', 'io']]),
    pupilJit: ft([[0, 'S'], [200, 0.6, 'out'], [1600, 0.6], [1900, 'T', 'io']]),
    sink: ft([[0, 'S'], [120, 'S'], [380, 120, 'out'], [1700, 118], [2400, 0, 'io']]),
    earL: ft([[0, 'S'], [150, -34, 'out'], [1700, -32], [2400, 'T', 'io']]),
    earR: ft([[0, 'S'], [150, 34, 'out'], [1700, 32], [2400, 'T', 'io']]),
    gx: ft([[0, 0], [2300, 0], [2420, 18, 'out'], [3300, 18], [3450, 0, 'io'], [3800, 0]]),
    gy: ft([[0, 0], [3800, 0]]),
    slope: ft([[0, 'S'], [2200, 'S'], [2400, 8, 'io'], [3300, 8], [3700, 'T', 'io']]),
  },
), events: [[60, (r) => { r.kick(-0.06); r.pop(0.6); }]] };

/**
 * Pulling himself up to look: his hands press down on the ledge and he rises up tall, eyes wide,
 * scanning left and right over the edge. Nothing. He lowers back down, not impressed.
 */
const PULL_UP: Bit = { ms: 3600, tracks: joinTracks(
  handTracks('L', [[0, { c: 'S', y: 'S' }], [200, { c: 1, y: 452 }, 'out'], [2300, { c: 1, y: 452 }], [2800, { c: 'T', y: 'T' }, 'io']]),
  handTracks('R', [[0, { c: 'S', y: 'S' }], [240, { c: 1, y: 452 }, 'out'], [2350, { c: 1, y: 452 }], [2850, { c: 'T', y: 'T' }, 'io']]),
  {
    y: ft([[0, 'S'], [200, 10, 'out'], [600, -46, 'out'], [700, -42, 'io'], [2300, -42], [2800, 'T', 'io']]),
    stretch: ft([[0, 0], [200, -0.04, 'out'], [500, 0.08, 'out'], [800, 0, 'io']]),
    open: ft([[0, 'S'], [500, 1.12, 'out'], [2200, 1.1], [2600, 0.5, 'io'], [3200, 0.5], [3600, 'T', 'io']]),
    openR: ft([[0, 'S'], [500, 1.12, 'out'], [2200, 1.1], [2600, 0.46, 'io'], [3200, 0.46], [3600, 'T', 'io']]),
    gx: ft([[0, 0], [700, 0], [760, -24, 'out'], [1250, -24], [1310, 24, 'out'], [1800, 24], [1860, 0, 'out'], [3600, 0]]),
    gy: ft([[0, 0], [700, 0], [760, 4, 'out'], [1860, 4], [1900, 0, 'out'], [3600, 0]]),
    earL: ft([[0, 'S'], [600, 6, 'out'], [2300, 6], [2800, -10, 'io'], [3300, 'T', 'io']]),
    earR: ft([[0, 'S'], [600, -6, 'out'], [2300, -6], [2800, 10, 'io'], [3300, 'T', 'io']]),
  },
), events: [[1250, (r) => r.flick('L', -10)], [2400, (r) => r.blinkNow()]] };

/**
 * Slipping: his left hand slides off the edge and drops out of sight. He lurches, eyes huge. The
 * hand scrabbles back up and hooks on; he hangs a beat, then a long relieved exhale.
 */
const SLIP: Bit = { ms: 3000, tracks: joinTracks(
  handTracks('L', [
    [0, { y: 'S', c: 'S' }], [80, { c: 0.6 }, 'in'], [230, { y: 540, c: 0.6 }, 'in'],
    [560, { y: 540 }], [720, { y: LIFT_Y, c: 0.62 }, 'out'], [820, { y: REST_Y, c: 1 }, 'in'],
    [1700, { c: 1 }], [2300, { c: 'T' }, 'io'],
  ]),
  handTracks('R', [[0, { c: 'S', y: 'S' }], [200, { c: 1, y: 454 }, 'out'], [1700, { c: 1, y: 454 }], [2300, { c: 'T', y: 'T' }, 'io']]),
  {
    sink: ft([[0, 'S'], [100, 'S'], [300, 80, 'in'], [760, 84], [960, -8, 'out'], [1150, 0, 'io']]),
    tilt: ft([[0, 'S'], [300, -12, 'out'], [800, -10], [1150, 'T', 'io']]),
    open: ft([[0, 'S'], [120, 1.3, 'out'], [1100, 1.25], [1500, 0.42, 'io'], [2400, 0.42], [2900, 'T', 'io']]),
    openR: ft([[0, 'S'], [120, 1.3, 'out'], [1100, 1.25], [1500, 0.38, 'io'], [2400, 0.38], [2900, 'T', 'io']]),
    swell: ft([[0, 'S'], [120, 1.5, 'out'], [1100, 1.5], [1500, 'T', 'io']]),
    breathe: ft([[0, 'S'], [1400, 'S'], [1500, 1.4, 'io'], [2500, 1.4], [2900, 'T', 'io']]),
    y: ft([[0, 'S'], [1500, 'S'], [1800, 14, 'io'], [2500, 14], [2900, 'T', 'io']]),
    earL: ft([[0, 'S'], [200, 14, 'out'], [900, 10], [1300, -22, 'out'], [2300, -18], [2800, 'T', 'io']]),
    earR: ft([[0, 'S'], [200, -14, 'out'], [900, -10], [1300, 22, 'out'], [2300, 18], [2800, 'T', 'io']]),
    gx: ft([[0, 0], [3000, 0]]),
    gy: ft([[0, 0], [120, 10, 'out'], [900, 10], [1100, 0, 'io'], [3000, 0]]),
  },
), events: [[820, (r) => { r.splat('L', 0.4); r.kick(-0.05); }], [100, (r) => r.pop(0.6)]] };

/**
 * Tapping the ledge, impatient: one hand lifts a little and taps down, three quick, a pause, one
 * slow. Lids heavy, eyes on you the whole time. A slow blink to finish.
 */
const KNUCKLE_TAP: Bit = (() => {
  const tap = (t: number, fast = true): HandKey[] => [[t, { y: 426, c: 0.85 }, 'out'], [t + (fast ? 110 : 260), { y: REST_Y, c: 0.95 }, 'in']];
  return { ms: 3400, tracks: joinTracks(
    handTracks('R', [[0, { y: 'S', c: 'S' }], ...tap(400), ...tap(620), ...tap(840), ...tap(1700, false), [2200, { y: 'T', c: 'T' }, 'io']]),
    {
      open: ft([[0, 'S'], [300, 0.46, 'io'], [2500, 0.46], [2700, 0.02, 'io'], [3000, 0.02], [3350, 'T', 'io']]),
      openR: ft([[0, 'S'], [300, 0.42, 'io'], [2500, 0.42], [2720, 0.02, 'io'], [3020, 0.02], [3380, 'T', 'io']]),
      curve: ft([[0, 0], [300, 3, 'io'], [3000, 3], [3350, 0, 'io']]),
      tilt: ft([[0, 'S'], [300, 5, 'io'], [3000, 5], [3350, 'T', 'io']]),
      gx: ft([[0, 0], [3400, 0]]),
      gy: ft([[0, 0], [3400, 0]]),
    },
  ), events: [[510, (r) => r.splat('R', 0.12)], [730, (r) => r.splat('R', 0.12)], [950, (r) => r.splat('R', 0.12)], [1960, (r) => r.splat('R', 0.2)]] };
})();

/**
 * Drumming his claws on the ledge: bored. Three rolls, pinky to index, from the grip, with dead
 * eyes. One slow blink in the middle.
 */
const CLAW_DRUM: Bit = { ms: 3600, tracks: joinTracks(
  handTracks('R', [[0, { c: 'S', w: 0 }], [200, { c: 1 }, 'out'], [260, { w: 1 }, 'lin'], [1500, { w: 1 }], [1560, { w: 0 }, 'lin'],
    [1900, { w: 0 }], [1960, { w: 1 }, 'lin'], [2900, { w: 1 }], [2960, { w: 0 }, 'lin'], [3300, { c: 'T' }, 'io']]),
  {
    open: ft([[0, 'S'], [300, 0.45, 'io'], [3300, 0.45], [3600, 'T', 'io']]),
    openR: ft([[0, 'S'], [300, 0.42, 'io'], [3300, 0.42], [3600, 'T', 'io']]),
    y: ft([[0, 'S'], [300, 10, 'io'], [3300, 10], [3600, 'T', 'io']]),
    tilt: ft([[0, 'S'], [300, 7, 'io'], [3300, 7], [3600, 'T', 'io']]),
    gx: ft([[0, 0], [3600, 0]]),
    gy: ft([[0, 0], [3600, 0]]),
  },
), events: [[1700, (r) => r.blinkNow()]] };

/** The studio's explorations, by name. `poke-twos` is the same poke held on twos, to compare textures. */
export const LOC_EXPLORE: Record<string, Bit> = {
  unhinged: UNHINGED,
  'dead-stare': DEAD_STARE,
  'comment-lid': COMMENT_LID,
  bored: BORED,
  'slow-blink': SLOW_BLINK,
  sink: SINK,
  'poke-twos': { ...POKE, steps: 12 },
  'unhinged-twos': { ...UNHINGED, steps: 12 },
  hide: HIDE,
  scoot: SCOOT,
  clutch: CLUTCH,
  'pull-up': PULL_UP,
  slip: SLIP,
  'knuckle-tap': KNUCKLE_TAP,
  'claw-drum': CLAW_DRUM,
};

/**
 * What he does with himself, mood by mood, when nothing is happening (in the app since October
 * 14, 2026). One is picked at random each time his habit comes round, weighted, so the old habit
 * still turns up most and the bigger moves stay rare.
 */
const IDLE: Partial<Record<LocMood, [Bit, number][]>> = {
  awake: [[HABITS.awake!, 4], [SCOOT, 2], [PULL_UP, 2], [KNUCKLE_TAP, 2], [COMMENT_LID, 1.5], [BORED, 1.5]],
  groggy: [[HABITS.groggy!, 4], [CLAW_DRUM, 2], [KNUCKLE_TAP, 1]],
  smug: [[HABITS.smug!, 4], [COMMENT_LID, 2], [KNUCKLE_TAP, 1.5], [SCOOT, 1]],
  betrayed: [[SINK, 2], [CLUTCH, 1.5], [DEAD_STARE, 1]],
  asleep: [[HABITS.asleep!, 1]],
};
const pickIdle = (mood: LocMood): Bit | undefined => {
  const pool = IDLE[mood];
  if (!pool) return HABITS[mood];
  let r = Math.random() * pool.reduce((sum, [, w]) => sum + w, 0);
  for (const [bit, w] of pool) if ((r -= w) <= 0) return bit;
  return pool[0][0];
};
/** Gaps between idle moves, seconds: a base and a random extra. */
const IDLE_GAP: Record<LocMood, [number, number]> = { awake: [6, 5], groggy: [5, 4], smug: [6, 4], betrayed: [5, 4], asleep: [6, 4] };
/** A poke's odds of something other than the usual flinch. */
const POKE_ODDS = { unhinged: 0.12, clutch: 0.15 };
/** The Loc studio's "In the app" page reads what plays when from these same tables. */
export { HABITS as LOC_HABITS, IDLE as LOC_IDLE, IDLE_GAP as LOC_IDLE_GAP, POKE_ODDS as LOC_POKE_ODDS };

/** Poked, now and then he does something other than the usual flinch: a clutch, or (rarely) the unhinged pop. */
const POKE_CLUTCH: Bit = { ...CLUTCH, events: [...(CLUTCH.events ?? []), [260, (r) => r.say('poke')]] };
const POKE_UNHINGED: Bit = { ...UNHINGED, events: [...(UNHINGED.events ?? []), [300, (r) => r.say('poke')]] };

/**
 * A fresh route for the lump under the covers: one way and back, back and forth, a nervous
 * zigzag, a fake-out (a nudge one way, then a dash the other), or wriggling on the spot, with
 * random distances, pauses, peeks and hop rhythm. Returns when he pops out and the lump's tracks.
 */
function burrowLump(rand: () => number = Math.random, fit = 1): { pop: number; lump: NonNullable<Bit['lump']> } {
  const side = rand() < 0.5 ? -1 : 1;
  // Out toward the strip's ends, so he knocks every button (NAV_KNOCK.reach; it was 0.3, where
  // the lump starts to hide in the panel's rounded corner), and quick (NAV_KNOCK.scurry).
  // `fit` keeps him over the nav buttons on a screen wider than a phone (see `burrow`).
  const span = (NAV_KNOCK.reach / 0.3) * fit, pace = Math.max(0.2, NAV_KNOCK.scurry);
  const far = () => (0.14 + rand() * 0.16) * span;
  const near = () => (0.05 + rand() * 0.07) * span;
  const routes = [
    () => [side * far(), 0],
    () => [side * far(), -side * far(), 0],
    () => [side * near(), -side * near(), side * near(), -side * near() * 0.6, 0],
    () => [side * 0.04, -side * far(), 0],
    () => [side * 0.03, -side * 0.03, side * 0.02, 0],
    () => [side * far(), side * near() * 0.5, side * far(), 0],
  ];
  const stops = routes[Math.floor(rand() * routes.length)]();
  const x: Key[] = [[0, 0], [540, 0]];
  const h: Key[] = [[0, 0], [430, 0], [540, 1.2, 'out'], [620, 1, 'io']];
  let t = 620, at = 0;
  let high = true;
  // Little hops while it runs: an uneven rhythm, never a metronome.
  const hops = (until: number) => {
    while (t + 70 < until) {
      t += (75 + rand() * 60) / Math.sqrt(pace);
      h.push([t, high ? 1.1 + rand() * 0.15 : 0.75 + rand() * 0.12, 'io']);
      high = !high;
    }
  };
  for (const [i, stop] of stops.entries()) {
    const last = i === stops.length - 1;
    const travel = ((130 + Math.abs(stop - at) * 1900) * (0.8 + rand() * 0.4)) / pace;
    const start = t;
    hops(start + travel);
    // A hop can land just past the stop; the next keys follow it, never before it.
    t = Math.max(t, start + travel);
    // Darts and brakes ease out; some runs speed up into the stop instead.
    x.push([t, stop, last || rand() < 0.6 ? 'out' : 'in']);
    at = stop;
    if (!last && rand() < 0.55) {
      // A pause, and now and then a peek: the lump rises as if he's listening.
      const pause = (90 + rand() * 260) / Math.sqrt(pace);
      h.push([t + 40, 1, 'io']);
      if (rand() < 0.5) h.push([t + pause * 0.45, 1.35 + rand() * 0.2, 'out']);
      h.push([t + pause, 1, 'io']);
      x.push([t + pause, stop]);
      t += pause;
    }
  }
  // Crouch where he lives, then burst out.
  const pop = Math.round(t + 160 + rand() * 120);
  h.push([t + 20, 1, 'io'], [t + 110, 0.5, 'io'], [pop - 40, 0.5], [pop + 30, 1.8, 'out'], [pop + 100, 0, 'in']);
  return { pop, lump: { h, x } };
}

/** The panel's bottom corners, in points: PANEL_RADIUS in components/app-tabs.tsx (this runs in the webview, so it's copied). */
const PANEL_CORNER = 44;

/**
 * The covers' edge, `u` px along it from the left side of the screen: up the left wall, round the
 * corner (radius `R`, a quarter turn `bend` long), along the bottom and round the right corner.
 * Returns the point and the unit normal pointing up out of the covers.
 */
function coverEdge(u: number, cw: number, ch: number, R: number, bend: number): [number, number, number, number] {
  if (u < bend) {
    const a = u / R;
    return [R - R * Math.cos(a), ch - R + R * Math.sin(a), Math.cos(a), -Math.sin(a)];
  }
  const flat = cw - 2 * R;
  if (u <= bend + flat) return [R + u - bend, ch, 0, -1];
  const a = Math.min(Math.PI / 2, (u - bend - flat) / R);
  return [cw - R + R * Math.sin(a), ch - R + R * Math.cos(a), -Math.sin(a), -Math.cos(a)];
}

// ---- Small math ----
const clamp =(v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const mul = (A: Mat, B: Mat): Mat => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const tr = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
const rot = (deg: number): Mat => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
const scale = (x: number, y: number): Mat => [x, 0, 0, y, 0, 0];
const about = (o: Vec, m: Mat) => mul(tr(o[0], o[1]), mul(m, tr(-o[0], -o[1])));
const apply = (m: Mat, p: Vec): Vec => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
const chain = (...ms: Mat[]) => ms.reduce((a, b) => mul(a, b));

// ---- Face shapes ----

// ---- Mesh and weights (built once) ----
const BONES = 7; // root (paws), body, head, earL, earR, cheekL, cheekR
function earWeight(x: number, y: number, ear: typeof BONE.earL) {
  const [ax, ay] = ear.a, [bx, by] = ear.b;
  const len = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / len, dy = (by - ay) / len;
  let nx = dy, ny = -dx;
  if (nx * (ear.tip[0] - ax) + ny * (ear.tip[1] - ay) < 0) { nx = -nx; ny = -ny; }
  const d = (x - ax) * nx + (y - ay) * ny;
  const along = ((x - ax) * dx + (y - ay) * dy) / len;
  return smooth(-14, 34, d) * smooth(-0.6, -0.15, along) * (1 - smooth(1.15, 1.6, along));
}
function weightsAt(x: number, y: number) {
  const body = smooth(330, 480, y);
  let head = 1 - body;
  const eL = earWeight(x, y, BONE.earL) * head, eR = earWeight(x, y, BONE.earR) * head;
  head -= eL + eR;
  const band = smooth(250, 320, y) * (1 - smooth(470, 540, y));
  const cL = (1 - smooth(150, 250, x)) * band * 0.85, cR = smooth(660, 750, x) * band * 0.85;
  const keep = 1 - Math.max(cL, cR);
  const paw = smooth(470, 515, y) * Math.max(1 - smooth(130, 190, x), smooth(640, 700, x));
  const rest = 1 - paw;
  const w = [paw, body * keep * rest, head * keep * rest, eL * keep * rest, eR * keep * rest, cL * rest, cR * rest];
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((v) => v / sum);
}
const cols = Math.round((MESH.x1 - MESH.x0) / MESH.step) + 1, rows = Math.round((MESH.y1 - MESH.y0) / MESH.step) + 1;
const NV = cols * rows;
let mesh: { rest: Float32Array; uvs: Float32Array; weights: Float32Array; idx: Uint16Array } | null = null;
function buildMesh() {
  if (mesh) return mesh;
  const rest = new Float32Array(NV * 2), uvs = new Float32Array(NV * 2), weights = new Float32Array(NV * BONES);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i, x = MESH.x0 + i * MESH.step, y = MESH.y0 + j * MESH.step;
    rest[k * 2] = x; rest[k * 2 + 1] = y;
    uvs[k * 2] = (x - MESH.x0) / (MESH.x1 - MESH.x0); uvs[k * 2 + 1] = (y - MESH.y0) / (MESH.y1 - MESH.y0);
    weightsAt(x, y).forEach((v, b) => { weights[k * BONES + b] = v; });
  }
  const idx: number[] = [];
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  mesh = { rest, uvs, weights, idx: new Uint16Array(idx) };
  return mesh;
}

// ---- Secondary motion (Spine-style physics constraints: inertia, strength, damping) ----
class Wobble {
  x = 0;
  v = 0;
  constructor(private k: number, private z: number, private inertia: number, private limit: number) {}
  step(force: number, dt: number) {
    const a = force * this.inertia - this.k * this.x - 2 * Math.sqrt(this.k) * this.z * this.v;
    this.v += a * dt;
    this.x = clamp(this.x + this.v * dt, -this.limit, this.limit);
    return this.x;
  }
}
class Tracker {
  private p: Vec | null = null;
  private v: Vec = [0, 0];
  step(p: Vec, dt: number): Vec {
    if (!this.p || dt <= 0) { this.p = p; return [0, 0]; }
    const v: Vec = [(p[0] - this.p[0]) / dt, (p[1] - this.p[1]) / dt];
    const a: Vec = [clamp((v[0] - this.v[0]) / dt, -9000, 9000), clamp((v[1] - this.v[1]) / dt, -9000, 9000)];
    this.p = p; this.v = v;
    return a;
  }
}
/** Angular push on a part hanging from `pivot` with its weight at `tip`, in degrees/s². */
const torque = (pivot: Vec, tip: Vec, acc: Vec) => {
  const r = [tip[0] - pivot[0], tip[1] - pivot[1]];
  return ((r[0] * -acc[1] - r[1] * -acc[0]) / (r[0] * r[0] + r[1] * r[1])) * 57.3;
};

/** A frozen copy of a rig's state (`LocRig.snapshot`). */
export type LocSnapshot = { readonly __loc: unique symbol };
/** The rig's fields that are drawing machinery, not state. */
const NOT_STATE = new Set(['canvas', 'ctx', 'gl', 'glCanvas', 'eyeLayer', 'texHands', 'inkHex', 'posBuf', 'resLoc', 'inkLoc', 'skinned', 'onCue']);
/** A deep copy of rig state. Bit definitions (with their event functions) are shared, not copied. */
function copyState(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Set) return new Set(v);
  if (Array.isArray(v)) return v.map(copyState);
  if (ArrayBuffer.isView(v)) return (v as Float32Array).slice();
  const out = Object.create(Object.getPrototypeOf(v)) as Record<string, unknown>;
  for (const [k, x] of Object.entries(v)) out[k] = k === 'def' ? x : copyState(x);
  return out;
}

// ---------------------------------------------------------------------------
export class LocRig {
  private ctx: CanvasRenderingContext2D;
  private gl: WebGLRenderingContext | null;
  private glCanvas = document.createElement('canvas');
  /** Where each eye is drawn before it goes on him (see `draw`). */
  private eyeLayer = document.createElement('canvas');
  private posBuf: WebGLBuffer | null = null;
  private resLoc: WebGLUniformLocation | null = null;
  private inkLoc: WebGLUniformLocation | null = null;
  private inkHex = INK;
  private skinned = new Float32Array(NV * 2);
  private cur = { ...BASE };
  private vel = Object.fromEntries(KEYS.map((k) => [k, 0])) as Record<Channel, number>;
  private goal = { ...BASE };
  private pending: { key: Channel; value: number; at: number }[] = [];
  private clock = Math.random() * 10;
  private mood: LocMood = 'awake';
  private blinkAt = -1;
  private nextBlink = 1.5;
  private glance: Vec = [0, 0];
  private nextGlance = 2;
  private nextHabit = 4;
  private flicks = { L: 0, R: 0 };
  private bit: { def: Bit; t: number; start: typeof BASE; fired: Set<number>; lump: { h: number; x: number } } | null = null;
  private gaze: Vec = [0, 0];
  private gazeV: Vec = [0, 0];
  /** When the current squeeze (> <) started, so it can slam shut with a shudder. */
  private squeezeAt = -1;
  private swaySeed = Math.random() * 10;
  private lag = { tilt: 0, earL: 0, earR: 0, gazeTurn: 0 };
  private phys = {
    headRot: new Wobble(110, 0.32, 0.55, 12), headY: new Wobble(150, 0.3, 0.035, 18),
    earL: new Wobble(150, 0.2, 0.9, 38), earR: new Wobble(150, 0.2, 0.9, 38),
    cheekLx: new Wobble(240, 0.28, 0.02, 12), cheekLy: new Wobble(240, 0.28, 0.02, 12),
    cheekRx: new Wobble(240, 0.28, 0.02, 12), cheekRy: new Wobble(240, 0.28, 0.02, 12),
  };
  private track = { head: new Tracker(), earL: new Tracker(), earR: new Tracker(), cheekL: new Tracker(), cheekR: new Tracker() };
  private bones: Mat[] = [];
  private head: Mat = [1, 0, 0, 1, 0, 0];
  private blink = 0;
  private blinkR = 0;
  /** The hands' secondary motion (loc-hands.ts). */
  private hands: Record<'L' | 'R', HandSim> = { L: newHandSim(0.85, 2 + Math.random() * 4), R: newHandSim(0.85, 5 + Math.random() * 4) };
  /** The face's held pose, with `faceSteps`. */
  private faceHold: { tick: number; c: typeof BASE; gaze: Vec; gazeV: Vec; blink: number; blinkR: number; clock: number } | null = null;
  squeezing = false;
  /** His view box's width as a share of the canvas: the canvas is wider, so the lump can travel. */
  private share = 1;
  /** Starts out of sight; `setPresent(true)` brings him up. */
  private hidden = true;
  private lumpX = 0;
  private lumpH = 0;
  private lumpW = 1;

  /**
   * `ink` is his body's colour, `#RRGGBB`: black on Home, in front of the moon; light where
   * there's no moon behind him (the push-up camera's black strip). The pupils and the blanket
   * stay black either way.
   */
  constructor(private canvas: HTMLCanvasElement, mood: LocMood, private reduced = false, ink = INK) {
    this.ctx = canvas.getContext('2d')!;
    this.gl = this.glCanvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.setupGL(ink);
    this.mood = mood;
    // With Reduce Motion he never leaves his spot: out of sight is see-through (`setPresent`).
    const away = reduced ? { sink: 0, paw: 0 } : HIDDEN;
    Object.assign(this.cur, TARGET[mood], away);
    Object.assign(this.goal, TARGET[mood], away);
    if (reduced) {
      canvas.style.transition = `opacity ${FADE_MS}ms ease`;
      canvas.style.opacity = '0';
    }
    this.lag = { tilt: this.cur.tilt, earL: this.cur.earL, earR: this.cur.earR, gazeTurn: 0 };
  }

  private setupGL(ink: string) {
    const gl = this.gl;
    if (!gl) return;
    const m = buildMesh();
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; attribute vec2 uv; uniform vec2 res; varying vec2 v; void main(){ v = uv; gl_Position = vec4(p.x / res.x * 2.0 - 1.0, 1.0 - p.y / res.y * 2.0, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision mediump float; uniform sampler2D t; uniform vec3 ink; varying vec2 v; void main(){ float a = texture2D(t, v).a; gl_FragColor = vec4(ink * a, a); }'));
    gl.linkProgram(prog); gl.useProgram(prog);
    this.posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf); gl.bufferData(gl.ARRAY_BUFFER, NV * 8, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    const uvBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, m.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(prog, 'uv'); gl.enableVertexAttribArray(uvLoc); gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    this.paintTexture();
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.resLoc = gl.getUniformLocation(prog, 'res');
    this.inkLoc = gl.getUniformLocation(prog, 'ink');
    this.setInk(ink);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  /** His silhouette as the mesh's texture. With hands on, the round paws traced into it are rubbed out. */
  private texHands: boolean | null = null;
  private paintTexture() {
    const gl = this.gl;
    if (!gl) return;
    const tex = document.createElement('canvas');
    const T = 2048;
    tex.width = T; tex.height = T;
    const t = tex.getContext('2d')!;
    const sx = T / (MESH.x1 - MESH.x0), sy = T / (MESH.y1 - MESH.y0);
    t.setTransform(sx, 0, 0, sy, -MESH.x0 * sx, -MESH.y0 * sy);
    t.fillStyle = INK;
    t.fillRect(2, LEDGE - 14, 814, MESH.y1 - LEDGE + 20); // his base continues below the ledge
    t.save();
    t.translate(0, 552); t.scale(0.1, -0.1);
    t.fill(new Path2D(LOC_PATH));
    t.restore();
    if (LOC_TUNE.hands) {
      t.globalCompositeOperation = 'destination-out';
      t.fillRect(-40, 497, 173, 200);
      t.fillRect(685, 497, 173, 200);
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.texHands = LOC_TUNE.hands;
  }

  /** Change mood. Parts move in sequence: going to sleep the eyes close, then he sinks. */
  setMood(mood: LocMood) {
    if (mood === this.mood) return;
    const prev = this.mood;
    this.mood = mood;
    let delay: Partial<Record<Channel, number>> = { earL: 50, earR: 110 };
    if (mood === 'asleep') delay = { open: 0, openR: 40, pupils: 0, y: 430, tilt: 430, earL: 520, earR: 600, breathe: 650 };
    else if (prev === 'asleep') delay = { open: 320, openR: 380, pupils: 300, y: 120, tilt: 160, earL: 180, earR: 240 };
    this.pending = KEYS.map((key) => ({ key, value: TARGET[mood][key], at: this.clock + (delay[key] ?? 0) / 1000 }));
    if (mood === 'betrayed') { this.kick(-0.06); this.flick('L', -12); this.flick('R', 12); this.pop(0.7); }
    if (prev === 'asleep') this.blinkAt = this.clock + 0.55;
  }

  setShare(share: number) { this.share = share; }

  /**
   * How wary of you he is, 0..1 (lib/loc-mind.ts: you've been slipping out). It narrows his eyes
   * a little and lowers the lids into a squint, on top of whatever mood he's in, and when he's
   * idle he gives you the comment lid more often. Never when he's asleep.
   */
  private wary = 0;
  setWary(wary: number) { this.wary = Math.max(0, Math.min(1, wary)); }
  private waryOffset(k: Channel) {
    if (!this.wary || this.mood === 'asleep') return 0;
    return k === 'squint' ? 0.2 * this.wary : k === 'open' ? -0.12 * this.wary : k === 'openR' ? -0.2 * this.wary : 0;
  }
  /**
   * Under the covers (burrowing, or arriving or leaving by them): taps wait until he's out. Once
   * he's through (`outAt`), a tap cuts the rest of the bit short (user, October 15, 2026: a tap
   * should always get a reaction).
   */
  get burrowing() {
    const b = this.bit;
    return !!b?.def.lump && (b.def.outAt === undefined || b.t < b.def.outAt);
  }
  /** When he was last sent under, in ms, for the zoomies (`zoomLump`) and the ultra zoomies (`ultraRun`). */
  private burrows: number[] = [];
  /** The screen's edge, for the ultra zoomies' run round it; without it (the studio) they're plain zoomies. */
  private rim: Rim | null = null;
  setRim(rim: Rim | null) { this.rim = rim; }
  /** Sends him under the covers. `force` sets off the zoomies or the ultra zoomies (the knock lab's buttons). */
  burrow(force: false | 'zoom' | 'ultra' = false) {
    if (this.hidden) return;
    if (this.reduced) return this.play(BURROW_CALM);
    const now = Date.now();
    this.burrows = [...this.burrows.filter((at) => now - at < NAV_KNOCK.zoomWindow * 1000), now];
    const count = this.burrows.length;
    const ultra = !!this.rim && (force === 'ultra' || (!force && count >= Math.max(2, Math.round(NAV_KNOCK.ultraAfter))));
    // Once round the screen, he has to be worked up all over again.
    if (ultra) this.burrows = [];
    // His run is a share of the canvas's width, which is the screen's; the nav buttons sit in a
    // row at most 520 pt wide (app-tabs.tsx). On a wider screen (web on a computer) the run is cut
    // to what it would be over a phone-shaped row, so he still runs into them.
    const fit = Math.min(1, ROW_SPAN / (this.canvas.clientWidth || ROW_SPAN));
    const seed = Math.floor(Math.random() * 2147483646) + 1;
    const round = ultra ? { seed, ...ultraRun(this.rim!, seeded(seed)) } : null;
    const { pop, lump } = round
      ? { pop: round.run.pop, lump: round.lump }
      : force || count >= Math.max(1, Math.round(NAV_KNOCK.zoomAfter)) ? zoomLump(Math.random, fit) : burrowLump(Math.random, fit);
    this.play(round ? ultraBit(pop, lump) : burrowBit(pop, lump));
    // The tab bar plays the bounce off the whole run, planned now (nav-knock.ts): one message,
    // not one a frame, so the buttons move on the UI thread with nothing crossing per frame.
    // Round the screen, the lump is drawn by an overlay (components/loc-rim) until he's home. Only
    // the run's seed goes with it, like any burrow's numbers; the app plans the same run from it
    // (the run itself wouldn't cross from the iPhone's webview: "not serializable").
    if (this.onBurrow) {
      const from = this.bit!.lump, dt = 1 / 60, path: BurrowPath = { dt, x: [], h: [], pop: pop / 1000 };
      const away = round ? ultraNav(round.run) : null;
      for (let t = 0, i = 0; t <= pop + 140; t += dt * 1000, i++) {
        if (away && round && t < round.run.home && i < away.x.length) {
          path.x.push(away.x[i]);
          path.h.push(away.h[i]);
          continue;
        }
        path.x.push(Math.round((this.sample(lump.x, t, 'sink', from.x) ?? 0) * 1e4) / 1e4);
        path.h.push(Math.round((this.sample(lump.h, t, 'sink', from.h) ?? 0) * 1e3) / 1e3);
      }
      if (round) path.ultra = round.seed;
      this.onBurrow(path);
    }
  }
  /** Hears each burrow's planned run, for the nav strip's bounce. */
  onBurrow: ((path: BurrowPath) => void) | null = null;
  /** Off Home he dives under the covers and runs off; back on Home he runs in and bursts out. */
  setPresent(present: boolean) {
    if (present === !this.hidden) return;
    this.hidden = !present;
    if (this.reduced) {
      this.canvas.style.opacity = present ? '1' : '0';
      this.play(present ? ARRIVE_CALM : LEAVE_CALM);
      return;
    }
    this.play(present ? (this.mood === 'asleep' ? ARRIVE_ASLEEP : ARRIVE) : LEAVE);
  }
  /**
   * Out of sight with nothing playing: every frame would draw the same empty canvas, so the
   * stage stops its frame loop until something changes (loc-stage.tsx).
   */
  get idle() { return this.hidden && !this.bit; }
  poke() {
    if (this.reduced) return this.play(POKE_CALM);
    const r = Math.random();
    this.play(r < POKE_ODDS.unhinged ? POKE_UNHINGED : r < POKE_ODDS.unhinged + POKE_ODDS.clutch ? POKE_CLUTCH : POKE);
  }
  kick(v: number) { this.vel.stretch += v * 14; }
  flick(side: 'L' | 'R', deg: number) { this.flicks[side] += deg; }
  /** Tells Home what just happened, so he can say something about it (loc-lines.ts). */
  onCue: ((cue: 'poke' | 'angry' | 'hello' | 'hide' | 'ultra') => void) | null = null;
  say(cue: 'poke' | 'angry' | 'hello' | 'hide' | 'ultra') { this.onCue?.(cue); }
  /** Kick the eyeballs' jelly: + springs them tall, - squashes them wide. */
  pop(v: number) { if (!this.reduced) this.vel.goo += v * 18; }

  private play(def: Bit) {
    this.bit = { def, t: 0, start: { ...this.cur }, fired: new Set(), lump: { h: this.lumpH, x: this.lumpX } };
  }

  private sample(track: Key[], t: number, key: Channel, start = this.bit!.start[key]): number | null {
    const rest = (k: Channel) => (k === 'sink' || k === 'paw' ? this.goal[k] : TARGET[this.mood][k]);
    const val = (v: Key[1]) => (v === 'S' ? start : v === 'T' ? rest(key) : v);
    if (t <= track[0][0]) return val(track[0][1]);
    for (let i = 1; i < track.length; i++) {
      const [t1, v1, ease = 'io'] = track[i];
      const [t0, v0] = track[i - 1];
      if (t <= t1) {
        const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
        const a = val(v0), b = val(v1);
        return a + (b - a) * E[ease](p);
      }
    }
    return null;
  }

  private animate(dt: number) {
    this.clock += dt;
    if (this.pending.length) this.pending = this.pending.filter((p) => { if (p.at <= this.clock) { this.goal[p.key] = p.value; return false; } return true; });
    // Where he rests: up on the edge, or out of sight below it.
    this.goal.sink = this.hidden && !this.reduced ? HIDDEN.sink : 0;
    this.goal.paw = this.hidden && !this.reduced ? HIDDEN.paw : 0;
    const driven: Partial<Record<Channel, number>> = {};
    if (this.bit) {
      const b = this.bit;
      b.t += dt * 1000;
      const held = b.def.steps ? Math.floor(b.t / (1000 / b.def.steps)) * (1000 / b.def.steps) : b.t;
      for (const [key, track] of Object.entries(b.def.tracks) as [Channel, Key[]][]) {
        const v = this.sample(track, held, key);
        if (v !== null) driven[key] = v;
      }
      (b.def.events ?? []).forEach(([ms, fn], i) => { if (!b.fired.has(i) && b.t >= ms) { b.fired.add(i); fn(this); } });
      if (b.t >= b.def.ms) { this.bit = null; this.squeezing = false; }
    }
    for (const k of KEYS) {
      const d = driven[k];
      if (d !== undefined) {
        this.vel[k] = dt > 0 ? (d - this.cur[k]) / dt : 0;
        this.cur[k] = d;
      } else {
        const [kk, z] = SPRING[k];
        const a = kk * ((k === 'stretch' ? 0 : this.goal[k] + this.waryOffset(k)) - this.cur[k]) - 2 * Math.sqrt(kk) * z * this.vel[k];
        this.vel[k] += a * dt; this.cur[k] += this.vel[k] * dt;
      }
    }
    this.flicks.L *= Math.pow(0.004, dt); this.flicks.R *= Math.pow(0.004, dt);

    const mood = MOODS[this.mood];
    if (!this.bit && !this.reduced && !this.hidden && !this.quiet) {
      if (mood.blinks) {
        this.nextBlink -= dt;
        if (this.nextBlink <= 0) { this.blinkAt = this.clock; this.nextBlink = mood.blinks === 'slow' ? 3 + Math.random() * 3 : Math.random() < 0.2 ? 0.3 : 2 + Math.random() * 3; }
      }
      this.nextGlance -= dt;
      if (this.nextGlance <= 0) {
        const was = this.glance;
        this.glance = Math.random() < 0.45 ? [0, 0] : [(Math.random() - 0.5) * 24, (Math.random() - 0.4) * 10];
        // A thought-blink: a big shift of gaze takes a blink with it.
        if (LOC_TUNE.snapGaze && Math.hypot(this.glance[0] - was[0], this.glance[1] - was[1]) > 9 && this.blinkAt < 0) this.blinkAt = this.clock;
        this.nextGlance = 1.2 + Math.random() * 2.6;
        if (Math.random() < 0.2) this.flick(Math.random() < 0.5 ? 'L' : 'R', Math.random() < 0.5 ? -16 : 16);
      }
      this.nextHabit -= dt;
      if (this.nextHabit <= 0) {
        const move = this.wary > 0.3 && this.mood !== 'asleep' && Math.random() < 0.35 * this.wary ? COMMENT_LID : pickIdle(this.mood);
        if (move) this.play(move);
        const [base, extra] = IDLE_GAP[this.mood];
        this.nextHabit = base + Math.random() * extra;
      }
    }
    this.blink = 0;
    this.blinkR = 0;
    if (this.blinkAt >= 0) {
      const len = mood.blinks === 'slow' ? 0.55 : LOC_TUNE.snapGaze ? 0.23 : 0.19;
      // Real blinks close fast and open slower (Disney Research); with snapGaze, 80 ms shut, 150 ms open.
      const shut = LOC_TUNE.snapGaze ? 0.33 : 0.4;
      const shape = (p: number) => (p < 0 || p >= 1 ? 0 : p < shut ? E.out(p / shut) : 1 - (LOC_TUNE.snapGaze ? E.out : E.io)((p - shut) / (1 - shut)));
      const p = (this.clock - this.blinkAt) / len;
      const pR = (this.clock - this.blinkAt - LOC_TUNE.blinkLag / 1000) / len;
      this.blink = shape(p);
      this.blinkR = shape(pR);
      // They bounce back open, overshooting into a tall stretch.
      if (p >= 1 && pR >= 1) { this.blinkAt = -1; this.pop(0.3); }
    }
  }

  /** Pose the skeleton from the channels, then let physics add the follow-through. */
  private pose(dt: number) {
    const c = this.cur, t = this.clock, mood = MOODS[this.mood];
    const deep = this.mood === 'asleep' && Math.floor(t * mood.rate) % 4 === 3 ? 1.6 : 1;
    const breath = this.reduced ? 0 : Math.sin(t * Math.PI * 2 * mood.rate) * c.breathe * deep;
    // A moving hold: a slow weight shift, so he's never perfectly still.
    const sway = this.reduced ? 0 : (Math.sin(t * 0.9 + this.swaySeed) * 0.7 + Math.sin(t * 0.37 + this.swaySeed * 2) * 0.5) * (this.mood === 'asleep' ? 0.3 : 1);
    const hasGaze = !!this.bit && 'gx' in this.bit.def.tracks;
    const gx = hasGaze ? c.gx : this.glance[0], gy = hasGaze ? c.gy : this.glance[1];
    // The pupils dart on an underdamped spring, so every glance overshoots and settles.
    const gk = LOC_TUNE.snapGaze ? 5200 : 900, gz = this.reduced ? 1 : LOC_TUNE.snapGaze ? 0.8 : 0.42;
    for (const i of [0, 1] as const) {
      const a = gk * ((i ? gy : gx) - this.gaze[i]) - 2 * Math.sqrt(gk) * gz * this.gazeV[i];
      this.gazeV[i] += a * dt; this.gaze[i] += this.gazeV[i] * dt;
    }
    // Down the chain: the head follows the body's lean about 60 ms later, the ears after that.
    const follow = (key: keyof LocRig['lag'], target: number, tau: number) => (this.lag[key] += (target - this.lag[key]) * (1 - Math.exp(-dt / tau)));
    const headTilt = follow('tilt', c.tilt, 0.06);
    const earLA = follow('earL', c.earL, 0.11), earRA = follow('earR', c.earR, 0.13);
    const gazeTurn = follow('gazeTurn', this.gaze[0], 0.12);

    // Body: squashes and stretches from the ledge, and takes a third of the lean.
    const posture = 1 - c.y / 380;
    const sy = posture * (1 + c.stretch) * (1 + breath * 0.013);
    const sx = (1 - (posture * (1 + c.stretch) - 1) * 0.45) * (1 + breath * 0.007);
    // The paws have their own drop, so they can let go after him and grab the edge last.
    const root = tr(0, c.paw);
    const near = 1 + c.lean * 0.35;
    const body = mul(tr(c.slide, c.sink), about(BONE.base, mul(rot(c.tilt * 0.38 + sway * 0.5), scale(sx * near, sy * near))));
    // Head: the rest of the lean plus a turn toward the gaze, swinging on the neck.
    const neckW = apply(body, BONE.neck), massW = apply(body, BONE.headMass);
    const aHead = this.track.head.step(massW, dt);
    const hr = this.phys.headRot.step(torque(neckW, massW, aHead), dt);
    const hy = this.phys.headY.step(aHead[1], dt);
    const head = chain(body, tr(0, hy - breath * 1.5 + this.gaze[1] * 0.25), about(BONE.neck, rot(headTilt * 0.62 + gazeTurn * 0.16 - sway * 0.8 + hr)));
    // Ears trail the head; the fluff jiggles.
    const ear = (side: 'L' | 'R', authored: number) => {
      const bone = side === 'L' ? BONE.earL : BONE.earR;
      const pivot = apply(head, bone.pivot), tip = apply(head, bone.tip);
      const lag = this.phys[side === 'L' ? 'earL' : 'earR'].step(torque(pivot, tip, this.track[side === 'L' ? 'earL' : 'earR'].step(tip, dt)), dt);
      return chain(head, about(bone.pivot, rot(authored + this.flicks[side] + lag)));
    };
    const cheek = (side: 'L' | 'R') => {
      const p = apply(head, side === 'L' ? BONE.cheekL : BONE.cheekR);
      const a = this.track[side === 'L' ? 'cheekL' : 'cheekR'].step(p, dt);
      const ox = this.phys[side === 'L' ? 'cheekLx' : 'cheekRx'].step(-a[0], dt), oy = this.phys[side === 'L' ? 'cheekLy' : 'cheekRy'].step(-a[1], dt);
      return mul(tr(ox, oy), head);
    };
    this.bones = [root, body, head, ear('L', earLA - breath * 1.2), ear('R', earRA + breath * 1.2), cheek('L'), cheek('R')];
    this.head = head;
    if (LOC_TUNE.hands) {
      const life = !this.bit && !this.reduced && !this.hidden && !this.quiet;
      for (const side of ['L', 'R'] as const) {
        const other = this.hands[side === 'L' ? 'R' : 'L'];
        stepHand(this.hands[side], this.handPose(side), wristAt(this.handPose(side), root, head), dt, life, Math.random, fidgeting(other));
      }
    }
  }

  /** Rig units to canvas pixels: his view box centred, `share` of the width, on the bottom edge. */
  private view(): Mat {
    const cw = this.canvas.width, ch = this.canvas.height;
    const s = (cw * this.share) / LOC_VIEW.width;
    return [s, 0, 0, s, (cw - cw * this.share) / 2 - LOC_VIEW.x * s, ch - LEDGE * s];
  }

  /** The blanket lump: the strip's black, bulging up from the bottom edge where he is. */
  private drawLump(dt: number) {
    const lump = this.bit?.def.lump;
    let h = 0, x = this.lumpX, wide = this.lumpW, shake = 0;
    if (lump) {
      const t = this.bit!.t;
      const from = this.bit!.lump;
      h = this.sample(lump.h, t, 'sink', from.h) ?? 0;
      x = this.sample(lump.x, t, 'sink', from.x) ?? 0;
      wide = lump.w ? this.sample(lump.w, t, 'sink', 1) ?? 1 : 1;
      shake = lump.shake && !this.reduced ? this.sample(lump.shake, t, 'sink', 0) ?? 0 : 0;
    } else if (this.lumpH > 0.001) {
      // A tap cut his pop out short: the covers still settle flat behind him, not vanish.
      h = this.lumpH * Math.pow(0.002, dt);
    }
    const vx = dt > 0 ? (x - this.lumpX) / dt : 0;
    this.lumpX = h > 0.001 ? x : 0; this.lumpH = h > 0.001 ? h : 0; this.lumpW = wide;
    if (h <= 0.001) return;
    const { ctx, canvas } = this;
    const cw = canvas.width, ch = canvas.height;
    const dpr = cw / (canvas.clientWidth || cw);
    // Low and wide (user, October 10, 2026): about 9 pt high, roughly a fifth of the width across.
    // Straining, it trembles: quick and uneven, so it reads as effort, not a vibration.
    const strain = shake * (Math.sin(this.clock * 58) * 0.6 + Math.sin(this.clock * 37) * 0.4);
    const top = 9 * dpr * h * (1 + (this.reduced ? 0 : Math.sin(this.clock * 6) * 0.08) + strain * 0.12);
    const cx = cw * (0.5 + x) + strain * dpr * 2, w = cw * 0.085 * wide;
    // A ripple trails whichever way he's moving, so it flows like a wave.
    const dir = Math.sign(vx);
    const ripple = this.reduced ? 0 : top * 0.42 * Math.min(1, Math.abs(vx) * 1.6) * (0.65 + 0.35 * Math.sin(this.clock * 10));
    // The covers' edge isn't flat all the way: at the ends it bends up into the panel's rounded
    // corners. Run flat into a bend, the lump met it in a notch (user, October 15, 2026), so it
    // follows the edge instead: placed by distance along it (the same pace round the bend) and
    // pushed out square to it, so near the ends it climbs the curve, tilted with it.
    const R = Math.min(PANEL_CORNER * dpr, cw / 2), bend = (Math.PI / 2) * R, run = 2 * bend + cw - 2 * R;
    const at = clamp(bend + cx - R, R * 0.4, run - R * 0.4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(0, ch);
    for (let u = 0; u <= run; u += Math.max(1, dpr)) {
      const d = (u - at) / w, r = (u - (at - dir * 1.7 * w)) / (0.7 * w);
      const lift = top * Math.exp(-d * d) + ripple * Math.exp(-r * r);
      const [px, py, nx, ny] = coverEdge(u, cw, ch, R, bend);
      // Fading out as the edge turns upright: the screen's sides never bend, only the bottom.
      const k = lift * -ny;
      ctx.lineTo(px + nx * k, py + ny * k);
    }
    ctx.lineTo(cw, ch);
    ctx.closePath();
    ctx.fill();
  }

  /** Skin the mesh on the GPU, copy it in, then cut the face out on the 2D canvas. */
  private draw() {
    const { canvas, ctx, gl } = this;
    const cw = canvas.width, ch = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    if (!gl || cw === 0 || ch === 0) return;
    if (this.texHands !== LOC_TUNE.hands) this.paintTexture();
    const view = this.view();
    const s = view[0];
    const ledgePx = Math.min(ch, Math.round(view[5] + LEDGE * s));
    const m = buildMesh();
    const B = this.bones.map((b) => mul(view, b));
    for (let i = 0; i < NV; i++) {
      const x = m.rest[i * 2], y = m.rest[i * 2 + 1];
      let X = 0, Y = 0;
      for (let b = 0; b < BONES; b++) {
        const w = m.weights[i * BONES + b];
        if (w === 0) continue;
        const M = B[b];
        X += w * (M[0] * x + M[2] * y + M[4]); Y += w * (M[1] * x + M[3] * y + M[5]);
      }
      this.skinned[i * 2] = X; this.skinned[i * 2 + 1] = Y;
    }
    if (this.glCanvas.width !== cw || this.glCanvas.height !== ch) { this.glCanvas.width = cw; this.glCanvas.height = ch; }
    gl.viewport(0, 0, cw, ch);
    gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(0, ch - ledgePx, cw, ledgePx);
    gl.uniform2f(this.resLoc, cw, ch);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.skinned);
    gl.drawElements(gl.TRIANGLES, m.idx.length, gl.UNSIGNED_SHORT, 0);
    ctx.drawImage(this.glCanvas, 0, 0);

    // Face: rides the head bone. With `faceSteps` it holds each pose for a beat (see LOC_TUNE).
    let c = this.cur, gaze: Vec = this.gaze, gazeV: Vec = this.gazeV, blinkL = this.blink, blinkR = this.blinkR, fclock = this.clock;
    if (LOC_TUNE.faceSteps > 0 && !this.reduced) {
      const tick = Math.floor(this.clock * LOC_TUNE.faceSteps);
      if (!this.faceHold || tick !== this.faceHold.tick) {
        this.faceHold = { tick, c: { ...this.cur }, gaze: [this.gaze[0], this.gaze[1]], gazeV: [this.gazeV[0], this.gazeV[1]], blink: this.blink, blinkR: this.blinkR, clock: this.clock };
      }
      ({ c, gaze, gazeV, blink: blinkL, blinkR, clock: fclock } = this.faceHold);
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, cw, ledgePx); ctx.clip();
    const H = mul(view, this.head);
    const at = (local: Mat) => { const q = mul(H, local); ctx.setTransform(q[0], q[1], q[2], q[3], q[4], q[5]); };
    const quiver = this.mood === 'betrayed' && !this.bit ? Math.sin(fclock * 31) * 0.05 : 0;
    const jit = c.pupilJit > 0.01 && !this.reduced ? [Math.sin(fclock * 97) * 4 * c.pupilJit, Math.cos(fclock * 83) * 3 * c.pupilJit] : [0, 0];
    const goo = this.reduced ? 0 : clamp(c.goo, -0.45, 0.6);
    // Moving fast, they stretch along the way they're looking.
    const dart = this.reduced ? 0 : clamp(Math.hypot(gazeV[0], gazeV[1]) * 0.0009, 0, 0.18);
    if (this.squeezing && this.squeezeAt < 0) this.squeezeAt = this.clock;
    if (!this.squeezing) this.squeezeAt = -1;
    const eyes: { pos: Vec; o: number; side: 1 | -1; squeeze: string }[] = [
      { pos: EYE_L, o: Math.max(0, c.open + quiver), side: 1, squeeze: 'M-26,-24 L20,0 L-26,24' },
      { pos: EYE_R, o: Math.max(0, c.openR + quiver - (c.openR < 0.95 ? LOC_TUNE.heavyLid : 0)), side: -1, squeeze: 'M26,-24 L-20,0 L26,24' },
    ];
    const sparkle = c.slope < 14 && Math.min(c.open, c.openR) > 0.3;
    for (const e of eyes) {
      at(chain(tr(e.pos[0] + gaze[0] * 0.12, e.pos[1] + gaze[1] * 0.12), rot(FACE)));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = LOC_TUNE.eyeWhite; ctx.strokeStyle = LOC_TUNE.eyeWhite;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (this.squeezing) {
        // Slammed shut: the > < punch in oversized and shudder.
        const since = this.clock - this.squeezeAt;
        const punch = this.reduced ? 1 : 1 + 0.45 * Math.exp(-since * 14);
        const shake = this.reduced ? 0 : Math.sin(this.clock * 70) * 2.5;
        ctx.save();
        ctx.translate(shake, 0); ctx.scale(punch, punch);
        ctx.lineWidth = 15; ctx.stroke(new Path2D(e.squeeze));
        ctx.restore();
        continue;
      }
      // Moods lower a lid over a round eye (heavy for groggy, half for smug, slanted for a
      // glare); only a blink squashes the eyeball itself, flat and wide. Wide open past his
      // rest, they balloon.
      const k = e.o / 0.8;
      const grow = 1 + 0.45 * Math.max(0, k - 1);
      const lidded = 1 - Math.min(1, k);
      const right = e.side === -1;
      const size = LOC_TUNE.button * grow * (right ? Math.max(0.3, c.eyeR) : 1);
      const blink = right ? blinkR : blinkL;
      const rx = size * (1 + 0.3 * blink + dart - 0.5 * goo);
      const ry = size * (1 - blink) * (1 - 0.6 * dart + goo);
      // Lids: the top one comes down as he closes and slants with his mood (+ angry, - worried);
      // the bottom one rises as he squints.
      const lift = Math.max(0, c.squint - 0.12) * 0.9 * ry;
      // With snapGaze the top lid follows the pupil: looking down, it comes down with it.
      const top = -ry - 2 + lidded * 1.84 * ry + (LOC_TUNE.snapGaze ? Math.max(-4, gaze[1] * 0.7) : 0);
      // A smiling bottom lid closes the eye from below too.
      if (ry < 5 || top > ry - lift - c.smile * ry * 0.65 - 4) {
        // Closed: a soft curve, not a sliver.
        ctx.lineWidth = 10;
        // Smiling, the closed eye arches up (^), content; otherwise it sags (‿), asleep.
        ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.quadraticCurveTo(0, 12 - c.smile * 40, rx, 0); ctx.stroke();
        continue;
      }
      const inner = top + Math.max(0, c.slope - 4) * 1.1;
      const outer = top + Math.max(0, -c.slope) * 1.1 + Math.max(0, c.slope - 4) * 0.15;
      const xi = e.side * (rx + 6), xo = -e.side * (rx + 6);
      const far = ry + 20;
      // Drawn on their own layer with smooth edges: the white, then the lids rubbed out of it,
      // then the pupil only where white is left. (Cutting them with clip() gave jagged edges:
      // canvas clips aren't anti-aliased.)
      const q = mul(H, chain(tr(e.pos[0] + gaze[0] * 0.12, e.pos[1] + gaze[1] * 0.12), rot(FACE)));
      const box = [[-rx - 12, -far], [rx + 12, -far], [rx + 12, far], [-rx - 12, far]].map((p) => apply(q, p as Vec));
      const x0 = Math.max(0, Math.floor(Math.min(...box.map((p) => p[0])))), x1 = Math.min(cw, Math.ceil(Math.max(...box.map((p) => p[0]))));
      const y0 = Math.max(0, Math.floor(Math.min(...box.map((p) => p[1])))), y1 = Math.min(ch, Math.ceil(Math.max(...box.map((p) => p[1]))));
      if (x1 <= x0 || y1 <= y0) continue;
      const layer = this.eyeLayer;
      if (layer.width < cw || layer.height < ch) { layer.width = cw; layer.height = ch; }
      const lc = layer.getContext('2d')!;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.globalCompositeOperation = 'source-over';
      lc.clearRect(x0, y0, x1 - x0, y1 - y0);
      lc.setTransform(q[0], q[1], q[2], q[3], q[4], q[5]);
      lc.fillStyle = LOC_TUNE.eyeWhite;
      lc.beginPath(); lc.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); lc.fill();
      lc.globalCompositeOperation = 'destination-out';
      // Lid edges are curves: `curve` sags or arches the top one, `smile` pushes the bottom one up.
      const sag = (inner + outer) / 2 + c.curve * 2.2;
      const rise = ry - lift - c.smile * ry * 1.3;
      lc.fill(new Path2D(`M${xo},${-far} L${xi},${-far} L${xi},${inner} Q0,${sag * 2 - (inner + outer) / 2} ${xo},${outer} Z`));
      lc.fill(new Path2D(`M${xo},${ry - lift} Q0,${rise * 2 - (ry - lift)} ${xi},${ry - lift} L${xi},${far} L${xo},${far} Z`));
      lc.globalCompositeOperation = 'source-atop';
      const swell = Math.max(0.3, c.swell) * (right ? Math.max(0.2, c.swellR) : 1);
      const pr = c.pupils > 0.5 ? Math.min(LOC_TUNE.pupil * (c.pupilR / 11.5) * swell * (size / (LOC_TUNE.button * grow)), 0.7 * size) : 0;
      // Squashed nearly flat (mid-blink), the white reads cleaner as a plain pill.
      if (pr > 0 && ry / size > 0.4) {
        // Under a heavy lid the pupil sinks, so it still peeks out below it.
        let px = gaze[0] + jit[0], py = 4 + lidded * ry * 0.45 + gaze[1] + jit[1];
        // Keep the pupil in the white however far he looks. Never bigger than 70% of it, so the white always shows.
        const n = Math.hypot(px / Math.max(1, rx - pr * 0.6), py / Math.max(1, ry - pr * 0.6));
        if (n > 1) { px /= n; py /= n; }
        // The pupil is part of the jelly: it squashes and stretches with the white around it.
        const psx = clamp(rx / size, 0.7, 1.5), psy = clamp(ry / size, 0.15, 1.5);
        lc.translate(px, py); lc.scale(psx, psy);
        lc.fillStyle = INK;
        lc.beginPath(); lc.arc(0, 0, pr, 0, Math.PI * 2); lc.fill();
        // Catchlights only when the eyes are open enough to show them; in a glare or under heavy
        // lids they read as specks. Both eyes go by the same rule, so they never disagree.
        if (pr >= 8 && sparkle) {
          lc.fillStyle = LOC_TUNE.eyeWhite;
          lc.beginPath(); lc.arc(-pr * 0.36, -pr * 0.4, Math.min(7.5, pr * 0.3), 0, Math.PI * 2); lc.fill();
          lc.beginPath(); lc.arc(pr * 0.32, pr * 0.3, pr * 0.1, 0, Math.PI * 2); lc.fill();
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(layer, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    }
    if (LOC_TUNE.hands) this.drawHands(view);
    ctx.restore();
  }

  /** One hand's channels. */
  private handPose(side: 'L' | 'R'): HandPose {
    const c = this.cur, k = (n: string) => c[`h${side}${n}` as Channel];
    return { x: k('x'), y: k('y'), a: k('a'), s: k('s'), c: k('c'), z: k('z'), f: k('f'), b: k('b'), t: k('t'), w: k('w') };
  }

  /** A contact for one hand: its fingers kick open, then settle. */
  splat(side: 'L' | 'R', amount: number) { splat(this.hands[side], amount); }

  /** His hands (loc-hands.ts). Where one crosses him, a thin gap is cut round it first. */
  private drawHands(view: Mat) {
    const { ctx } = this;
    const [root, body] = this.bones, head = this.head;
    const headAngle = (Math.atan2(head[1], head[0]) * 180) / Math.PI;
    const built = (['L', 'R'] as const).map((side) => buildHand(side, this.handPose(side), this.hands[side], root, body, head, headAngle));
    ctx.save();
    ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
    for (const h of built) if (h.gap > 0.01) traceHand(ctx, h, 6 * h.gap);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.inkHex; ctx.strokeStyle = this.inkHex;
    for (const h of built) traceHand(ctx, h, 0);
    ctx.restore();
  }

  step(dt: number) {
    this.simulate(dt);
    this.render(dt);
  }

  /** Move him on by `dt` without drawing. */
  simulate(dt: number) {
    this.animate(dt);
    this.pose(dt);
  }

  /** Draw where he is now. */
  render(dt: number) {
    this.draw();
    this.drawLump(dt);
  }

  /** His body's colour, `#RRGGBB`. */
  setInk(ink: string) {
    this.inkHex = ink;
    const rgb = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(ink)?.slice(1).map((h) => parseInt(h, 16) / 255) ?? [0, 0, 0];
    this.gl?.uniform3f(this.inkLoc, rgb[0], rgb[1], rgb[2]);
  }

  // ---- Dev only: the Loc studio (src/features/dev/loc-studio) ----

  /** No random blinks, glances or habits: only what's asked for plays. */
  quiet = false;

  /** Jump straight to `mood`, up on the edge or out of sight, with nothing playing. */
  place(present: boolean, mood: LocMood) {
    this.mood = mood;
    this.hidden = !present;
    this.bit = null;
    this.pending = [];
    this.blinkAt = -1;
    this.squeezing = false;
    const away = present || this.reduced ? { sink: 0, paw: 0 } : HIDDEN;
    Object.assign(this.cur, TARGET[mood], away);
    Object.assign(this.goal, TARGET[mood], away);
    for (const k of KEYS) this.vel[k] = 0;
    this.lag = { tilt: this.cur.tilt, earL: this.cur.earL, earR: this.cur.earR, gazeTurn: 0 };
    if (this.reduced) this.canvas.style.opacity = present ? '1' : '0';
  }

  /** After `retuneLoc()`: spring to the current mood's new pose. */
  refit() {
    for (const k of KEYS) if (k !== 'sink' && k !== 'paw') this.goal[k] = TARGET[this.mood][k];
  }

  /** The current mood's habit, now. */
  playHabit() {
    const habit = HABITS[this.mood];
    if (habit) this.play(habit);
  }

  blinkNow() { this.blinkAt = this.clock; }

  /** One of the studio's explorations (LOC_EXPLORE). */
  playExplore(id: string) {
    const bit = LOC_EXPLORE[id];
    if (bit) this.play(bit);
  }

  /** Any bit, now: the studio's expressions. */
  playBit(bit: Bit) { this.play(bit); }

  /** Something is still playing: a bit, a staggered mood change or a blink. */
  get busy() { return !!this.bit || this.pending.length > 0 || this.blinkAt >= 0; }

  get currentMood() { return this.mood; }

  /** Every channel's value right now. */
  get channels(): Record<LocChannel, number> { return { ...this.cur }; }

  /** Everything that moves him, copied, so a frame can be drawn again later (`restore`, then `render`). */
  snapshot(): LocSnapshot {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(this)) if (!NOT_STATE.has(key)) out[key] = copyState((this as unknown as Record<string, unknown>)[key]);
    return out as LocSnapshot;
  }

  restore(snap: LocSnapshot) {
    for (const [key, value] of Object.entries(snap)) (this as unknown as Record<string, unknown>)[key] = copyState(value);
  }

  /** Frees the WebGL context. */
  dispose() {
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
  }

  /** Where a tap lands, in rig units, is on him (so the area around him stays free). */
  hits(px: number, py: number) {
    const v = this.view();
    const x = (px - v[4]) / v[0], y = (py - v[5]) / v[0];
    return !this.hidden && !this.burrowing && x > 60 && x < 760 && y > 60 && y < LEDGE;
  }
}
