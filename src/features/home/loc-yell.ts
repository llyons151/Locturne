import type { Bit, Key, LocChannel, LocRig } from './loc-rig';

/**
 * Loc's yell parts: arms and a mouth for the rig, which has neither, and the takes that use them.
 * Made in the Loc studio's Moonrise section (src/features/dev/loc-studio/moonrise.ts, 20 takes);
 * the user picked take 4, Champion (October 27, 2026), and it's his yell on the morning payoff
 * (LocRig.yell).
 *
 * - His head, eyes, ears, lean and shake are the rig's own channels, driven by a Bit.
 * - The arms and mouth are drawn on top in his ink, riding his bones: two short, fluffy raccoon
 *   arms on two-bone IK (the paws on the ledge let go and become the hands), and a mouth on the
 *   head. Hands and mouth have their own springs (PartsSim), so they drag, overshoot and settle.
 * - A take is written with a `Score` from the same few phases (notice, look up, wind up, arms up,
 *   yell, settle).
 */

type Vec = [number, number];
type Mat = [number, number, number, number, number, number];
type Ease = 'lin' | 'in' | 'out' | 'io' | 'in3' | 'back' | 'out3';

const E: Record<Ease, (t: number) => number> = {
  lin: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  in3: (t) => t * t * t,
  back: (t) => { const c = 1.9, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  out3: (t) => 1 - Math.pow(1 - t, 3),
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ---- The parts the rig doesn't have: arms and a mouth ----

/** Hands (body frame, rig units), fists (1 a paw, 0 fingers spread), wrist turns (deg), mouth. */
export const REST = { lx: 67, ly: 524, lf: 1, lw: 0, rx: 748, ry: 526, rf: 1, rw: 0, mo: 0, mw: 0.6, shout: 0 };
export type Part = keyof typeof REST;
export const PARTS = Object.keys(REST) as Part[];
const isPart = (k: string): k is Part => k in REST;

/** Where the arms come out of him (inside his outline, under the cheek fluff), and their bones. */
const SHOULDER = { L: [160, 468] as Vec, R: [700, 478] as Vec };
const UPPER = 190;
const FORE = 175;
/** Half-widths: thick and fluffy, like his paws (never long and thin: user, October 14, 2026). */
const ARM_W = { shoulder: 50, elbow: 37, wrist: 30 };
const PALM = { across: 47, along: 40 };
/**
 * The traced paws, rubbed out while their hand is lifted (in the studio; the rig draws a texture
 * without them instead). Their tops are weighted partly to his
 * body, so the cut is made in both the paws' frame and the body's (the flank below fills it back).
 */
export const PAW_CUT = { L: [-90, 470, 240, 170], R: [670, 470, 240, 170] };
/**
 * With a paw gone, the bottom of his outline is straight up and down where it met the paw, so a
 * fluffy flank is drawn there instead (body frame): from under the cheek fluff out to the ledge.
 */
const FLANK = {
  L: 'M206,432 C170,446 132,470 112,506 C102,526 96,546 92,600 L230,600 Z',
  R: 'M654,446 C690,460 726,484 744,518 C752,536 758,556 760,600 L620,600 Z',
};
const FLANK_TUFTS = { L: [[150, 462], [118, 494], [102, 530]] as Vec[], R: [[706, 476], [738, 508], [752, 544]] as Vec[] };
/** The mouth sits under his eyes, on the head bone. */
const MOUTH: Vec = [436, 438];
const FACE = 8;

/** Hand poses, in his body's frame. Every one keeps the hands clear of his head, so they read in silhouette. */
export const POSES = {
  rest: { L: [REST.lx, REST.ly] as Vec, R: [REST.rx, REST.ry] as Vec },
  /** Up and a little out, so there's sky between his arms and his head. */
  up: { L: [20, 146] as Vec, R: [842, 156] as Vec },
  /** A wide victory V. */
  v: { L: [-40, 196] as Vec, R: [902, 206] as Vec },
  /** Out to the sides at head height, elbows bent: flexing, or a shrug. */
  wide: { L: [-34, 312] as Vec, R: [894, 322] as Vec },
  /** Halfway: the lift on its way up, or the low point of a pump. */
  half: { L: [-6, 286] as Vec, R: [866, 298] as Vec },
  /** Reaching high and in, toward the moon over his head. */
  reach: { L: [92, 138] as Vec, R: [770, 148] as Vec },
};
export type PoseName = keyof typeof POSES;

/** Keys for the parts: like the rig's, but numbers only. */
export type PartKey = [number, number, Ease?];

export function sample(track: (Key | PartKey)[], t: number, rest: number): number | null {
  const val = (v: Key[1]) => (typeof v === 'number' ? v : rest);
  if (t <= track[0][0]) return val(track[0][1]);
  for (let i = 1; i < track.length; i++) {
    const [t1, v1, ease = 'io'] = track[i];
    const [t0, v0] = track[i - 1];
    if (t <= t1) {
      const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      const a = val(v0), b = val(v1);
      return a + (b - a) * E[ease as Ease](p);
    }
  }
  return null;
}

// ---- Writing a take ----

type Target = number | 'T';

/**
 * One take, written phase by phase. `to` moves a channel (the rig's or a part) from what it had at
 * `t0` to `v` by `t1`, so every channel holds still between moves; a move that overlaps the last one
 * cuts in from wherever that had got to.
 */
export class Score {
  rig: Partial<Record<LocChannel, Key[]>> = { gx: [[0, 0]], gy: [[0, 0]] };
  parts: Partial<Record<Part, PartKey[]>> = {};
  events: [number, (r: LocRig) => void][] = [];
  end = 0;
  /** When the moon starts up, and the moment that sums the take up (its tile on the overview). */
  rise = 0;
  peak = 0;

  to(ch: LocChannel | Part, t0: number, t1: number, v: Target, ease: Ease = 'io') {
    const track: (Key | PartKey)[] = isPart(ch) ? (this.parts[ch] ??= [[0, REST[ch]]]) : (this.rig[ch as LocChannel] ??= [[0, 'S']]);
    // A move that starts before the last one has finished takes over from wherever it has got to.
    if (t0 < track[track.length - 1][0]) {
      const i = track.findIndex((k) => k[0] > t0);
      const [ta, va] = track[i - 1], [tb, vb, ease = 'io'] = track[i];
      const v0 = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * E[ease as Ease]((t0 - ta) / (tb - ta)) : va;
      track.length = i;
      track.push([t0, v0] as Key);
    }
    const last = track[track.length - 1];
    if (t0 > last[0]) track.push([t0, last[1]] as Key);
    const value = v === 'T' && isPart(ch) ? REST[ch] : v;
    // The rig doesn't know out3: its channels take the nearest it has.
    track.push([t1, value, !isPart(ch) && ease === 'out3' ? 'out' : ease] as Key);
    this.end = Math.max(this.end, t1);
    return this;
  }

  /** Several channels to their values over the same span. */
  pose(t0: number, t1: number, values: Partial<Record<LocChannel | Part, Target>>, ease: Ease = 'io') {
    for (const [ch, v] of Object.entries(values)) this.to(ch as LocChannel | Part, t0, t1, v as Target, ease);
    return this;
  }

  /** The value a channel was last given (a number, or the mood's rest). */
  last(ch: LocChannel | Part): number | 'T' | 'S' {
    const track = isPart(ch) ? this.parts[ch] : this.rig[ch as LocChannel];
    return track ? (track[track.length - 1][1] as number | 'T' | 'S') : isPart(ch) ? REST[ch] : 'S';
  }

  at(t: number, fn: (r: LocRig) => void) {
    this.events.push([t, fn]);
    return this;
  }

  /**
   * His body trembles from `t0` to `t1`: a quick uneven side to side through tilt and slide, about
   * 15 times a second, `amp` strong at first and easing to half.
   */
  shake(t0: number, t1: number, amp = 1, every = 64) {
    const tilt0 = this.last('tilt'), slide0 = this.last('slide');
    const tb = typeof tilt0 === 'number' ? tilt0 : 0, sb = typeof slide0 === 'number' ? slide0 : 0;
    let i = 0, last = t0;
    for (let t = t0 + every; t < t1; t += every, i++) {
      const k = amp * (1 - 0.5 * ((t - t0) / (t1 - t0))) * (i % 3 === 2 ? 0.7 : 1);
      const sign = i % 2 ? -1 : 1;
      this.to('tilt', last, t, tb + sign * 2.6 * k, 'io');
      this.to('slide', last, t, sb + sign * -4.5 * k, 'io');
      last = t;
    }
    const end = Math.max(t1, last + every * 0.6);
    this.to('tilt', last, end, tb, 'io');
    this.to('slide', last, end, sb, 'io');
    return this;
  }

  /** Both hands to a pose (or each to its own), fists at `fist`. */
  arms(t0: number, t1: number, pose: PoseName | { L: Vec; R: Vec }, fist: number, ease: Ease = 'out', only?: 'L' | 'R') {
    const p = typeof pose === 'string' ? POSES[pose] : pose;
    if (only !== 'R') this.pose(t0, t1, { lx: p.L[0], ly: p.L[1], lf: fist }, ease);
    if (only !== 'L') this.pose(t0, t1, { rx: p.R[0], ry: p.R[1], rf: fist }, ease);
    return this;
  }

  bit(): Bit {
    return { ms: this.end, tracks: this.rig, events: [...this.events].sort((a, b) => a[0] - b[0]) };
  }
}

// ---- The phases every take is made of ----

/** He catches something above him: a dart of the eyes up and a twitch of the ears. */
export function notice(s: Score, t: number) {
  s.to('gy', t, t + 90, -12, 'out').at(t, (r) => { r.flick('L', 10); r.flick('R', -10); r.pop(0.25); });
  return t + 90;
}

/** Head up: he rises tall, eyes widen and roll up to the sky, ears prick. */
export function lookUp(s: Score, t: number, ms = 420, o: { y?: number; stretch?: number; gy?: number; open?: number; swell?: number; ear?: number; tilt?: number } = {}) {
  const { y = -16, stretch = 0.06, gy = -26, open = 1.1, swell = 1.3, ear = 8, tilt = -2 } = o;
  s.pose(t, t + ms, { y, stretch, tilt }, 'io');
  s.to('gy', t, t + ms * 0.7, gy, 'out');
  s.pose(t, t + ms * 0.8, { open, openR: open, swell, slope: -4 }, 'back');
  s.pose(t, t + ms, { earL: ear, earR: -ear }, 'out');
  return t + ms;
}

/** The wind-up: down into a crouch, hands pressing on the ledge, eyes narrowing. */
export function windUp(s: Score, t: number, ms = 200, depth = 26) {
  s.pose(t, t + ms, { y: depth, stretch: -0.12 }, 'io');
  s.pose(t, t + ms, { ly: REST.ly + 6, ry: REST.ry + 6 }, 'io');
  s.pose(t, t + ms, { open: 0.7, openR: 0.7, squint: 0.3 }, 'io');
  return t + ms;
}

/** Up he goes: tall, stretched, lifted off the ledge a little. */
export function springUp(s: Score, t: number, ms = 150, o: { y?: number; stretch?: number; sink?: number } = {}) {
  const { y = -26, stretch = 0.1, sink = -18 } = o;
  s.pose(t, t + ms, { y, stretch, sink }, 'out');
  return t + ms;
}

type Yell = {
  /** Mouth: how open (up to 1.2) and how wide (0 an O, 1 a wide shout). */
  open?: number;
  wide?: number;
  /** Eyes slammed shut (> <) or wide open. */
  squeeze?: boolean;
  shake?: number;
  /** Ears blown back (out to the sides), degrees. */
  ears?: number;
};

/** The yell itself, from `t0` to `t1`: mouth flies open, eyes slam, ears blow back, he trembles. */
export function yell(s: Score, t0: number, t1: number, o: Yell = {}) {
  const { open = 1, wide = 0.85, squeeze = true, shake = 1, ears = 26 } = o;
  s.to('mo', t0, t0 + 90, open, 'out').to('mw', t0, t0 + 90, wide, 'out').to('shout', t0, t0 + 120, shake, 'out');
  s.pose(t0, t0 + 110, { earL: -ears, earR: ears }, 'out');
  if (squeeze) s.at(t0, (r) => { r.squeezing = true; });
  else s.pose(t0, t0 + 100, { open: 1.2, openR: 1.2, swell: 0.7, swellR: 0.7, squint: 0.12 }, 'back');
  s.at(t0, (r) => { r.flick('L', -14); r.flick('R', 14); });
  if (shake > 0) s.shake(t0 + 40, t1, shake);
  s.to('mo', t1 - 120, t1 + 80, open * 0.35, 'io').to('shout', t1 - 120, t1, 0, 'io');
  if (squeeze) s.at(t1, (r) => { r.squeezing = false; r.pop(0.6); });
  return t1;
}

/** Back down: arms lower and the paws grip the ledge again, mouth closes, he settles into his mood. */
export function settle(s: Score, t: number, ms = 700) {
  s.arms(t, t + ms * 0.75, 'rest', 1, 'io');
  s.pose(t, t + ms * 0.3, { mo: 0, mw: REST.mw, shout: 0 }, 'io');
  for (const ch of Object.keys(s.rig) as LocChannel[]) {
    if (ch === 'gx' || ch === 'gy') s.to(ch, t, t + ms, 0, 'io');
    else s.to(ch, t, t + ms, ch === 'sink' || ch === 'slide' ? 0 : 'T', 'io');
  }
  s.to('lw', t, t + ms * 0.5, 0).to('rw', t, t + ms * 0.5, 0);
  return t + ms;
}

// ---- Their secondary motion ----

/** The parts' state in one frame, after their springs. */
export type PartsFrame = Record<Part, number> & { t: number };

const PART_SPRING: Record<Part, [number, number]> = {
  lx: [230, 0.55], ly: [230, 0.55], rx: [230, 0.55], ry: [230, 0.55],
  lf: [420, 0.8], rf: [420, 0.8], lw: [200, 0.6], rw: [200, 0.6],
  mo: [520, 0.42], mw: [300, 0.8], shout: [300, 1],
};

export class PartsSim {
  cur = { ...REST };
  vel = Object.fromEntries(PARTS.map((k) => [k, 0])) as Record<Part, number>;
  t = 0;
  step(dt: number, goal: Partial<Record<Part, number>>) {
    this.t += dt;
    for (const k of PARTS) {
      const [kk, z] = PART_SPRING[k];
      const g = goal[k] ?? REST[k];
      const a = kk * (g - this.cur[k]) - 2 * Math.sqrt(kk) * z * this.vel[k];
      this.vel[k] += a * dt;
      this.cur[k] += this.vel[k] * dt;
    }
  }
  get settled() {
    return PARTS.every((k) => Math.abs(this.cur[k] - REST[k]) < 0.5 && Math.abs(this.vel[k]) < 2);
  }
  frame(): PartsFrame {
    return { ...this.cur, t: this.t };
  }
}

export function goalAt(score: Score, ms: number) {
  const goal: Partial<Record<Part, number>> = {};
  for (const [k, track] of Object.entries(score.parts) as [Part, PartKey[]][]) {
    const v = sample(track, ms, REST[k]);
    goal[k] = v ?? REST[k];
  }
  return goal;
}

/** A hand is off the ledge (so its traced paw comes out and the arm is drawn). */
export function lifted(parts: PartsFrame, side: 'L' | 'R') {
  const l = side === 'L';
  const hx = l ? parts.lx : parts.rx, hy = l ? parts.ly : parts.ry, fist = l ? parts.lf : parts.rf;
  return Math.hypot(hx - REST[l ? 'lx' : 'rx'], hy - REST[l ? 'ly' : 'ry']) >= 2.5 || fist <= 0.97;
}

// ---- Champion (take 4): his yell on the morning payoff ----

/**
 * Boxer at the bell. Up, then fists pumping overhead, left and right in turn, on every pump a yell.
 * At `rise` the payoff buzzes and the moon comes up (LocRig.onYell).
 */
export function writeChampion(s: Score) {
  lookUp(s, 200, 360);
  windUp(s, 800, 170);
  springUp(s, 970, 140);
  s.arms(970, 1110, 'up', 1, 'out');
  s.rise = 1050;
  s.peak = 1500;
  yell(s, 1050, 2900, { shake: 0.6, wide: 0.9 });
  for (let i = 0; i < 4; i++) {
    const t = 1260 + i * 380;
    const side = i % 2 ? 'R' : 'L';
    s.arms(t, t + 140, 'half', 1, 'in', side);
    s.arms(t + 140, t + 300, 'up', 1, 'out', side);
  }
  settle(s, 3100, 760);
  s.at(s.rise, (r) => r.onYell?.());
}

/** Champion, written once: the rig plays this Bit and drives the parts from this score. */
export const CHAMPION = (() => {
  const s = new Score();
  writeChampion(s);
  return { score: s, bit: s.bit() };
})();

// ---- Drawing ----

export type MouthStyle = 'white' | 'cut' | 'none';

const mul = (A: Mat, B: Mat): Mat => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const rot = (deg: number): Mat => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
const tr = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];

/** Two-bone IK: the elbow, bent outward (away from his head). */
function elbowOf(side: 'L' | 'R', s: Vec, h: Vec): { e: Vec; h: Vec } {
  let dx = h[0] - s[0], dy = h[1] - s[1];
  let d = Math.hypot(dx, dy) || 1;
  const max = UPPER + FORE - 0.5;
  // Past full reach, the hand stops where the arm runs out (a cartoon stretch of 4% first).
  const reach = Math.min(d, max * 1.04);
  const hand: Vec = [s[0] + (dx / d) * reach, s[1] + (dy / d) * reach];
  dx = hand[0] - s[0]; dy = hand[1] - s[1]; d = Math.max(Math.abs(UPPER - FORE) + 1, Math.hypot(dx, dy));
  const ux = dx / d, uy = dy / d;
  const scaleUp = Math.max(1, d / max);
  const u = UPPER * scaleUp, f = FORE * scaleUp;
  const a = (u * u - f * f + d * d) / (2 * d);
  const hgt = Math.sqrt(Math.max(0, u * u - a * a));
  const [px, py] = side === 'L' ? [uy, -ux] : [-uy, ux];
  return { e: [s[0] + ux * a + px * hgt, s[1] + uy * a + py * hgt], h: hand };
}

/** A tapered limb from `a` (half-width `wa`) to `b` (`wb`), with fur tufts swept back toward `a`. */
function limb(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, wa: number, wb: number, outward: 1 | -1, tufts: number[]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  ctx.beginPath();
  ctx.moveTo(a[0] + nx * wa, a[1] + ny * wa);
  ctx.lineTo(b[0] + nx * wb, b[1] + ny * wb);
  ctx.lineTo(b[0] - nx * wb, b[1] - ny * wb);
  ctx.lineTo(a[0] - nx * wa, a[1] - ny * wa);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); ctx.arc(a[0], a[1], wa, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(b[0], b[1], wb, 0, Math.PI * 2); ctx.fill();
  // Fur: little curved points on the outer edge, swept back the way the limb came from.
  tufts.forEach((at, i) => {
    const side = i % 3 === 2 ? -outward : outward;
    const w = wa + (wb - wa) * at;
    const px = a[0] + dx * at + nx * side * w * 0.8, py = a[1] + dy * at + ny * side * w * 0.8;
    const k = 13 + (i % 2) * 6;
    ctx.beginPath();
    ctx.moveTo(px + ux * k * 0.7, py + uy * k * 0.7);
    ctx.quadraticCurveTo(px + nx * side * k * 0.9, py + ny * side * k * 0.9, px + nx * side * k * 1.1 - ux * k * 1.5, py + ny * side * k * 1.1 - uy * k * 1.5);
    ctx.lineTo(px - ux * k * 0.8, py - uy * k * 0.8);
    ctx.closePath();
    ctx.fill();
  });
}

/** A rounded capsule, for fingers. */
function capsule(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, r: number) {
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 2;
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

/**
 * A raccoon hand, at `h`, fingers pointing `dir` (radians). At `fist` 1 it's the paw traced into his
 * outline: round, with knuckle bumps. Opening, the fingers grow out and spread, the thumb comes out.
 */
function hand(ctx: CanvasRenderingContext2D, h: Vec, dir: number, fist: number, side: 'L' | 'R') {
  const open = 1 - clamp(fist, 0, 1);
  const across = PALM.across * (1 + 0.06 * open), along = PALM.along;
  ctx.save();
  ctx.translate(h[0], h[1]);
  ctx.rotate(dir + Math.PI / 2);
  // In this frame, "up" (-y) is where the fingers point.
  ctx.beginPath(); ctx.ellipse(0, 0, across, along, 0, 0, Math.PI * 2); ctx.fill();
  const spread = 1 + 0.45 * open;
  for (const deg of [-50, -17, 17, 50]) {
    const a = ((deg * spread - 90) * Math.PI) / 180;
    const base = 26, len = 12 + 38 * open, r = 19 - 4 * open;
    const b0: Vec = [Math.cos(a) * base, Math.sin(a) * base * (along / across + 0.12)];
    const tip: Vec = [Math.cos(a) * (base + len), Math.sin(a) * (base + len) * (along / across + 0.12)];
    capsule(ctx, b0, tip, r);
  }
  // The thumb, on the side toward his head; tucked in a fist.
  const inner = side === 'L' ? 1 : -1;
  const ta = ((inner > 0 ? 10 : 170) * Math.PI) / 180;
  const tl = 14 + 26 * open;
  capsule(ctx, [Math.cos(ta) * 24, Math.sin(ta) * 10], [Math.cos(ta - inner * 0.5 * open) * (24 + tl), Math.sin(ta - inner * 0.5 * open) * (10 + tl * 0.6) - 6], 13);
  ctx.restore();
}

/** The mouth, in the head's frame: a superellipse from a round O to a wide shout, heavier below, with a tongue. */
function mouthPath(open: number, wide: number) {
  const h = 16 + 92 * open, w = 70 + 68 * wide + 34 * open * (1 - 0.4 * wide);
  const n = 2 + 1.6 * wide;
  const p = new Path2D();
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const x = (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = (s < 0 ? h * 0.4 : h * 0.6) * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return { p, w, h };
}

let mouthLayer: HTMLCanvasElement | null = null;

/**
 * Draws the arms and mouth for `parts` on `ctx`, over his frame. `view` is rig units to pixels,
 * `bones` the rig's (paws, body, ...), `head` its head bone, `ledgePx` where the ledge is. With
 * `cutPaws`, the traced paws are rubbed out here (the rig instead draws with a texture without them).
 */
export function paintParts(
  ctx: CanvasRenderingContext2D, view: Mat, ledgePx: number, bones: Mat[], head: Mat, ink: string, eyeWhite: string,
  parts: PartsFrame, style: MouthStyle, cutPaws: boolean,
) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const t = parts.t;
  const shout = parts.shout;
  // While he yells, everything trembles a little: hands and mouth, fast and uneven.
  const quiver = (seed: number) => shout * (Math.sin(t * 71 + seed) * 0.6 + Math.sin(t * 43 + seed * 2) * 0.4);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath(); ctx.rect(0, 0, cw, ledgePx); ctx.clip();
  ctx.fillStyle = ink; ctx.strokeStyle = ink;

  for (const side of ['L', 'R'] as const) {
    const l = side === 'L';
    const hx = (l ? parts.lx : parts.rx) + quiver(l ? 1 : 4) * 5, hy = (l ? parts.ly : parts.ry) + quiver(l ? 2 : 5) * 4;
    const fist = l ? parts.lf : parts.rf, turn = l ? parts.lw : parts.rw;
    const rest = l ? POSES.rest.L : POSES.rest.R;
    if (!lifted(parts, side)) continue;
    const away = Math.hypot(hx - rest[0], hy - rest[1]);
    // The traced paw lets go of the ledge: rubbed out (`cutPaws`, or by the rig's texture), and the hand drawn here takes its place.
    const bv = mul(view, bones[1]);
    if (cutPaws) {
      const cut = PAW_CUT[side];
      ctx.globalCompositeOperation = 'destination-out';
      for (const m of [mul(view, bones[0]), bv]) {
        ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
        ctx.fillRect(cut[0], cut[1], cut[2], cut[3]);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.setTransform(bv[0], bv[1], bv[2], bv[3], bv[4], bv[5]);
    ctx.fill(new Path2D(FLANK[side]));
    for (const [x, y] of FLANK_TUFTS[side]) {
      const o = l ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.quadraticCurveTo(x + o * 16, y - 2, x + o * 22, y + 16); ctx.lineTo(x - o * 4, y + 14); ctx.closePath(); ctx.fill();
    }
    const s = SHOULDER[side];
    const { e, h } = elbowOf(side, s, [hx, hy]);
    const out = l ? -1 : 1;
    limb(ctx, s, e, ARM_W.shoulder, ARM_W.elbow, out as 1 | -1, [0.35, 0.65, 0.5]);
    limb(ctx, e, h, ARM_W.elbow, ARM_W.wrist, out as 1 | -1, [0.25, 0.5, 0.72, 0.85, 0.62]);
    // Near the ledge the hand turns upright, like the paw it was; up high it follows the forearm.
    const along = Math.atan2(h[1] - e[1], h[0] - e[0]);
    const k = clamp(1 - away / 140, 0, 1);
    const up = -Math.PI / 2;
    let diff = up - along;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    hand(ctx, h, along + diff * k + (turn * Math.PI) / 180, fist, side);
  }

  if (style !== 'none' && parts.mo > 0.03) {
    const hv = mul(view, mul(head, mul(tr(MOUTH[0], MOUTH[1]), rot(FACE))));
    const open = Math.max(0, parts.mo) * (1 + quiver(7) * 0.06), wide = clamp(parts.mw, 0, 1);
    const { p, w, h } = mouthPath(open, wide);
    if (style === 'cut') {
      ctx.setTransform(hv[0], hv[1], hv[2], hv[3], hv[4], hv[5]);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(p);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // On its own layer, like the eyes: the white, then the tongue only where the white is.
      const layer = (mouthLayer ??= document.createElement('canvas'));
      if (layer.width < cw || layer.height < ch) { layer.width = cw; layer.height = ch; }
      const lc = layer.getContext('2d')!;
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.clearRect(0, 0, cw, ch);
      lc.setTransform(hv[0], hv[1], hv[2], hv[3], hv[4], hv[5]);
      lc.globalCompositeOperation = 'source-over';
      lc.fillStyle = eyeWhite;
      lc.fill(p);
      lc.globalCompositeOperation = 'source-atop';
      lc.fillStyle = ink;
      lc.beginPath(); lc.ellipse(0, h * 0.6, w * 0.34, h * 0.32, 0, 0, Math.PI * 2); lc.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(layer, 0, 0);
    }
  }
  ctx.restore();
}
