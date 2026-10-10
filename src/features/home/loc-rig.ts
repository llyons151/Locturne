/**
 * Loc, rigged: his traced silhouette on a skinned skeleton with physics, drawn with WebGL and
 * a 2D canvas. Ported from the browser study (docs/LOC_SILHOUETTE.md,
 * docs/design-references/loc-animation/loc-in-motion.html); runs inside the `loc-stage` DOM
 * component, so it's plain web code.
 *
 * How it moves (rounds 3 and 4 of the study):
 * - Channels (posture, tilt, ears, lids, mask...) have a resting value per mood and spring
 *   between them. Short "habits" and the poke are keyframed on top.
 * - The silhouette is a mesh weighted to seven bones (paws, body, head, two ears, two cheek
 *   fluffs), so he bends where bones meet instead of hinging.
 * - Moves travel down the chain (body, then head, then ears), and the head, ears and fluff
 *   have spring physics, so they lag, overshoot and settle on their own.
 * - The face rides the head bone: white eyes with black pupils, and a sleep mask that's a
 *   window cut through him, so the real moon behind shows in it.
 */
import { LOC_HEIGHT, LOC_PATH } from './loc-path';

export type LocMood = 'asleep' | 'groggy' | 'awake' | 'smug' | 'betrayed';

type Vec = [number, number];
type Mat = [number, number, number, number, number, number];
type Key = [number, number | 'S' | 'T', Ease?];
type Ease = keyof typeof E;
type Bit = {
  ms: number;
  every?: [number, number];
  tracks: Partial<Record<Channel, Key[]>>;
  events?: [number, (r: LocRig) => void][];
  /** A lump in the blanket while he's under it: height (0..1) and offset along the edge (share of width). */
  lump?: { h: Key[]; x: Key[] };
};

// ---- Geometry, in the traced path's 818 x 552 box; the ledge is y = 552 ----
const LEDGE = LOC_HEIGHT;
const EYE_L: Vec = [352, 312];
const EYE_R: Vec = [538, 338];
const FACE = 8; // the head is drawn tilted; the face follows it
const MASK_DOWN: Vec = [446, 326];
const MASK_UP: Vec = [436, 200];
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
/** The view box around him: room for his ears to swing above the path. */
export const LOC_VIEW = { x: -40, y: -60, width: 898, height: 612 };

const INK = '#000000';
/** Solid white eyes (user, October 10, 2026), not holes, with black pupils. */
const EYE_WHITE = '#FFFFFF';

// ---- Channels and moods ----
const BASE = {
  y: 0, tilt: 0, earL: 0, earR: 0, open: 0.8, openR: 0.8, slope: 2, squint: 0.12, mask: 1, maskY: 0, maskTilt: 0,
  breathe: 0.45, pupils: 1, pupilR: 11.5, stretch: 0, gx: 0, gy: 0, pupilJit: 0, sink: 0, paw: 0,
};
type Channel = keyof typeof BASE;
const KEYS = Object.keys(BASE) as Channel[];
const MOODS: Record<LocMood, { set: Partial<Record<Channel, number>>; rate: number; blinks: false | 'slow' | 'normal' }> = {
  asleep: { set: { y: 46, tilt: 5, earL: -22, earR: 22, open: 0, openR: 0, mask: 0, breathe: 1, pupils: 0 }, rate: 0.19, blinks: false },
  groggy: { set: { y: 20, tilt: 7, earL: -10, earR: 13, open: 0.34, openR: 0.27, squint: 0.15, mask: 0.86, maskTilt: 9, breathe: 0.7 }, rate: 0.24, blinks: 'slow' },
  awake: { set: {}, rate: 0.3, blinks: 'normal' },
  smug: { set: { y: -8, tilt: -6, earL: 7, earR: -7, open: 0.42, openR: 0.6, slope: 16, squint: 0.35, maskTilt: -5, maskY: 6 }, rate: 0.3, blinks: 'normal' },
  betrayed: { set: { y: -12, earL: -34, earR: 34, open: 1.2, openR: 1.2, slope: -12, maskY: -26, pupilR: 8, breathe: 0.25, pupilJit: 0.35 }, rate: 0.5, blinks: false },
};
const TARGET = Object.fromEntries(Object.entries(MOODS).map(([k, m]) => [k, { ...BASE, ...m.set }])) as Record<LocMood, typeof BASE>;
// Stiffness and damping ratio: head firm, eyes fast, pupils fastest.
const SPRING: Record<Channel, [number, number]> = {
  y: [90, 0.9], tilt: [90, 0.85], earL: [150, 0.42], earR: [150, 0.42], open: [280, 1], openR: [280, 1], slope: [220, 1], squint: [220, 1],
  mask: [70, 0.95], maskY: [140, 0.7], maskTilt: [140, 0.7], breathe: [40, 1], pupils: [160, 1], pupilR: [220, 1], stretch: [220, 0.4],
  gx: [700, 1], gy: [700, 1], pupilJit: [90, 1], sink: [60, 0.95], paw: [160, 0.6],
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
  }, events: [[1560, (r) => r.kick(0.05)]] },
  asleep: { every: [6, 4], ms: 1400, tracks: { stretch: [[0, 0], [260, 0.025, 'out'], [700, 0, 'io']] },
    events: [[300, (r) => r.flick('L', -10)], [650, (r) => r.flick('R', 8)]] },
  smug: { every: [5, 3], ms: 1800, tracks: {
    open: [[0, 'S'], [380, 0.06, 'io'], [700, 0.06], [1100, 'T', 'io']],
    openR: [[0, 'S'], [420, 0.08, 'io'], [720, 0.08], [1120, 'T', 'io']],
    tilt: [[0, 'S'], [600, -10, 'io'], [1500, 'T', 'io']],
    y: [[0, 'S'], [600, -12, 'io'], [1500, 'T', 'io']],
  }, events: [[900, (r) => r.flick('R', 12)]] },
  awake: { every: [7, 4], ms: 2400, tracks: {
    gx: [[0, 0], [160, -20, 'out'], [700, -20], [860, 18, 'out'], [1400, 18], [1560, 0, 'out'], [2400, 0]],
    gy: [[0, 0], [2400, 0]],
    tilt: [[0, 'S'], [500, -3, 'io'], [1200, 3, 'io'], [2000, 'T', 'io']],
  }, events: [[900, (r) => r.flick('R', 10)]] },
};

// Tap: a flinch with his eyes squeezed shut, then a glare with the mask pressed down like a frown.
const POKE: Bit = { ms: 1700, tracks: {
  stretch: [[0, 0], [80, -0.1, 'out'], [260, 0.02, 'back'], [500, 0, 'io']],
  y: [[0, 'S'], [80, 14, 'out'], [260, 'S', 'back']],
  open: [[0, 'S'], [260, 'S'], [380, 0.34, 'out'], [1350, 0.34], [1700, 'T', 'io']],
  openR: [[0, 'S'], [260, 'S'], [380, 0.42, 'out'], [1350, 0.42], [1700, 'T', 'io']],
  squint: [[0, 'S'], [380, 0.4, 'out'], [1350, 0.4], [1700, 'T', 'io']],
  slope: [[0, 'S'], [380, 24, 'out'], [1350, 24], [1700, 'T', 'io']],
  maskY: [[0, 'S'], [380, 22, 'out'], [1350, 22], [1700, 'T', 'io']],
  mask: [[0, 'S'], [200, 1, 'out']], pupils: [[0, 'S'], [100, 1]],
  earL: [[0, 'S'], [90, -30, 'out'], [600, -12, 'io'], [1700, 'T', 'io']],
  earR: [[0, 'S'], [90, 30, 'out'], [600, 12, 'io'], [1700, 'T', 'io']],
}, events: [[0, (r) => { r.squeezing = true; }], [260, (r) => { r.squeezing = false; }]] };

/** How far down he goes to be out of sight: his body, and his paws (which only need to clear the edge). */
const HIDDEN = { sink: 720, paw: 80 };

// Entrances and exits are acted, not slid (docs/LOC_SILHOUETTE.md, round 5). Peeking up: ear
// tips first, listening; the eyes rise just over the edge and check left and right; a beat;
// then he pops up, stretching, overshoots and settles, and his paws slap onto the edge last.
const ARRIVE: Bit = { ms: 1650, tracks: {
  sink: [[0, HIDDEN.sink], [380, 470, 'out'], [520, 470], [900, 232, 'io'], [1000, 232], [1200, -18, 'out'], [1450, 0, 'io']],
  paw: [[0, HIDDEN.paw], [1160, HIDDEN.paw], [1260, -8, 'out'], [1400, 0, 'io']],
  stretch: [[0, 0], [1000, 0], [1100, 0.1, 'out'], [1260, -0.05, 'io'], [1450, 0, 'io']],
  open: [[0, 'T'], [520, 'T'], [600, 1.05, 'out'], [1000, 1.05], [1500, 'T', 'io']],
  openR: [[0, 'T'], [520, 'T'], [600, 1.05, 'out'], [1000, 1.05], [1500, 'T', 'io']],
  gx: [[0, 0], [700, 0], [760, -22, 'out'], [900, -22], [960, 22, 'out'], [1050, 22], [1110, 0, 'out'], [1650, 0]],
  gy: [[0, 0], [1650, 0]],
  earL: [[0, 'S'], [380, 6, 'out'], [1000, 6], [1150, -12, 'out'], [1350, 'T', 'back']],
  earR: [[0, 'S'], [380, -6, 'out'], [1000, -6], [1150, 12, 'out'], [1350, 'T', 'back']],
}, events: [[380, (r) => r.flick('L', -14)], [520, (r) => r.flick('R', 14)], [1260, (r) => r.kick(-0.05)]] };
// Asleep, he doesn't check the room: one slow rise, paws last.
const ARRIVE_ASLEEP: Bit = { ms: 1400, tracks: {
  sink: [[0, HIDDEN.sink], [1300, 0, 'io']],
  paw: [[0, HIDDEN.paw], [1000, HIDDEN.paw], [1300, 0, 'io']],
} };
// Ducking down: a little rise first, then a drop that speeds up, stretching as he falls; the
// ears flip up behind him and the paws let go a beat after the body.
const LEAVE: Bit = { ms: 560, tracks: {
  sink: [[0, 'S'], [120, -10, 'out'], [440, HIDDEN.sink, 'in3']],
  paw: [[0, 'S'], [260, 'S'], [440, HIDDEN.paw, 'in']],
  stretch: [[0, 0], [120, 0.04, 'out'], [300, 0.12, 'in'], [440, 0.02, 'out'], [560, 0, 'io']],
  earL: [[0, 'S'], [120, 8, 'out'], [380, 22, 'out']],
  earR: [[0, 'S'], [120, -8, 'out'], [380, -22, 'out']],
} };

// Tapped twice: he dives under the covers (the nav strip), the blanket lumps up where he is and
// wanders along the edge with a ripple behind it, then he bursts back out (user, October 10, 2026).
const BURROW: Bit = { ms: 5900, tracks: {
  stretch: [[0, 0], [150, -0.08, 'out'], [300, 0.12, 'in'], [460, 0, 'out'], [5050, 0], [5190, 0.13, 'out'], [5380, -0.05, 'io'], [5700, 0, 'io']],
  sink: [[0, 'S'], [150, -6, 'out'], [460, HIDDEN.sink, 'in3'], [5050, HIDDEN.sink], [5280, -20, 'out'], [5600, 0, 'io']],
  paw: [[0, 'S'], [300, 'S'], [460, HIDDEN.paw, 'in'], [5250, HIDDEN.paw], [5370, -8, 'out'], [5550, 0, 'io']],
  earL: [[0, 'S'], [150, -18, 'out'], [460, 16, 'in'], [5050, 16], [5300, -12, 'out'], [5700, 'T', 'back']],
  earR: [[0, 'S'], [150, 18, 'out'], [460, -16, 'in'], [5050, -16], [5300, 12, 'out'], [5700, 'T', 'back']],
  open: [[0, 'S'], [5050, 'S'], [5200, 1.1, 'back'], [5800, 'T', 'io']],
  openR: [[0, 'S'], [5050, 'S'], [5200, 1.1, 'back'], [5800, 'T', 'io']],
  mask: [[0, 'S'], [200, 1, 'out']], pupils: [[0, 'S'], [100, 1]],
}, events: [
  [0, (r) => { r.squeezing = true; }], [460, (r) => { r.squeezing = false; }],
  [5370, (r) => { r.kick(-0.04); r.flick('L', -18); r.flick('R', 18); }],
], lump: {
  h: [[0, 0], [430, 0], [700, 1, 'back'], [4650, 1], [4900, 0.4, 'io'], [5040, 0, 'in']],
  x: [[0, 0], [700, 0], [1500, -0.32, 'io'], [2500, 0.3, 'io'], [3300, -0.18, 'io'], [4000, 0.22, 'io'], [4600, -0.06, 'io'], [4800, 0, 'io']],
} };

// ---- Small math ----
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (e0: number, e1: number, x: number) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const mul = (A: Mat, B: Mat): Mat => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const tr = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
const rot = (deg: number): Mat => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
const scale = (x: number, y: number): Mat => [x, 0, 0, y, 0, 0];
const about = (o: Vec, m: Mat) => mul(tr(o[0], o[1]), mul(m, tr(-o[0], -o[1])));
const apply = (m: Mat, p: Vec): Vec => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
const chain = (...ms: Mat[]) => ms.reduce((a, b) => mul(a, b));
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

// ---- Face shapes ----
function eyePath(o: number, squint: number, slope: number, side: 1 | -1, w = 39) {
  const t = 22 - 76 * o;
  const b = Math.max((30 + 14 * Math.min(o, 1) + 10 * Math.max(0, o - 1)) * (1 - 0.72 * squint), t + 6);
  const inner = Math.min(t + slope, b - 3), outer = Math.min(t - slope * 0.55, b - 3);
  const iy = clamp(slope * 0.22, -6, 10);
  const ix = side * w, ox = -side * w, s = 0.56;
  return `M${fmt(ox)},0 C${fmt(ox * s)},${fmt(outer)} ${fmt(ix * s)},${fmt(inner)} ${fmt(ix)},${fmt(iy)} C${fmt(ix * s)},${fmt(b)} ${fmt(ox * s)},${fmt(b)} ${fmt(ox)},0 Z`;
}
const MASK_PATH = 'M-150,-30 C-60,-46 60,-46 150,-30 C170,-26 174,20 150,28 C100,42 42,40 16,22 Q0,12 -16,22 C-42,40 -100,42 -150,28 C-174,20 -170,-26 -150,-30 Z';

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

// ---------------------------------------------------------------------------
export class LocRig {
  private ctx: CanvasRenderingContext2D;
  private gl: WebGLRenderingContext | null;
  private glCanvas = document.createElement('canvas');
  private posBuf: WebGLBuffer | null = null;
  private resLoc: WebGLUniformLocation | null = null;
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
  private bit: { def: Bit; t: number; start: typeof BASE; fired: Set<number> } | null = null;
  private gaze: Vec = [0, 0];
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
  squeezing = false;
  /** His view box's width as a share of the canvas: the canvas is wider, so the lump can travel. */
  private share = 1;
  /** Starts out of sight; `setPresent(true)` brings him up. */
  private hidden = true;
  private lumpX = 0;

  constructor(private canvas: HTMLCanvasElement, mood: LocMood, private reduced = false) {
    this.ctx = canvas.getContext('2d')!;
    this.gl = this.glCanvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.setupGL();
    this.mood = mood;
    Object.assign(this.cur, TARGET[mood], HIDDEN);
    Object.assign(this.goal, TARGET[mood], HIDDEN);
    this.lag = { tilt: this.cur.tilt, earL: this.cur.earL, earR: this.cur.earR, gazeTurn: 0 };
  }

  private setupGL() {
    const gl = this.gl;
    if (!gl) return;
    const m = buildMesh();
    const tex = document.createElement('canvas');
    const T = 2048;
    tex.width = T; tex.height = T;
    const t = tex.getContext('2d')!;
    const sx = T / (MESH.x1 - MESH.x0), sy = T / (MESH.y1 - MESH.y0);
    t.setTransform(sx, 0, 0, sy, -MESH.x0 * sx, -MESH.y0 * sy);
    t.fillStyle = INK;
    t.fillRect(2, LEDGE - 14, 814, MESH.y1 - LEDGE + 20); // his base continues below the ledge
    t.translate(0, 552); t.scale(0.1, -0.1);
    t.fill(new Path2D(LOC_PATH));
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 p; attribute vec2 uv; uniform vec2 res; varying vec2 v; void main(){ v = uv; gl_Position = vec4(p.x / res.x * 2.0 - 1.0, 1.0 - p.y / res.y * 2.0, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision mediump float; uniform sampler2D t; varying vec2 v; void main(){ float a = texture2D(t, v).a; gl_FragColor = vec4(0.0, 0.0, 0.0, a); }'));
    gl.linkProgram(prog); gl.useProgram(prog);
    this.posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf); gl.bufferData(gl.ARRAY_BUFFER, NV * 8, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    const uvBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, m.uvs, gl.STATIC_DRAW);
    const uvLoc = gl.getAttribLocation(prog, 'uv'); gl.enableVertexAttribArray(uvLoc); gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.resLoc = gl.getUniformLocation(prog, 'res');
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  /** Change mood. Parts move in sequence: going to sleep the eyes close, then the mask, then he sinks. */
  setMood(mood: LocMood) {
    if (mood === this.mood) return;
    const prev = this.mood;
    this.mood = mood;
    let delay: Partial<Record<Channel, number>> = { earL: 50, earR: 110, mask: 40, maskY: 30, maskTilt: 30 };
    if (mood === 'asleep') delay = { open: 0, openR: 40, pupils: 0, mask: 260, y: 430, tilt: 430, earL: 520, earR: 600, breathe: 650 };
    else if (prev === 'asleep') delay = { mask: 0, maskTilt: 120, open: 320, openR: 380, pupils: 300, y: 120, tilt: 160, earL: 180, earR: 240 };
    this.pending = KEYS.map((key) => ({ key, value: TARGET[mood][key], at: this.clock + (delay[key] ?? 0) / 1000 }));
    if (mood === 'betrayed') { this.kick(-0.06); this.flick('L', -12); this.flick('R', 12); }
    if (prev === 'asleep') this.blinkAt = this.clock + 0.55;
  }

  setShare(share: number) { this.share = share; }
  /** Busy under the covers: taps wait until he's out. */
  get burrowing() { return this.bit?.def === BURROW; }
  burrow() { if (!this.hidden) this.play(BURROW); }
  /** Off Home he ducks out of sight; back on Home he peeks up. */
  setPresent(present: boolean) {
    if (present === !this.hidden) return;
    this.hidden = !present;
    this.play(present ? (this.mood === 'asleep' ? ARRIVE_ASLEEP : ARRIVE) : LEAVE);
  }
  poke() { this.play(POKE); }
  kick(v: number) { this.vel.stretch += v * 14; }
  flick(side: 'L' | 'R', deg: number) { this.flicks[side] += deg; }

  private play(def: Bit) { this.bit = { def, t: 0, start: { ...this.cur }, fired: new Set() }; }

  private sample(track: Key[], t: number, key: Channel): number | null {
    const rest = (k: Channel) => (k === 'sink' || k === 'paw' ? this.goal[k] : TARGET[this.mood][k]);
    const val = (v: Key[1]) => (v === 'S' ? this.bit!.start[key] : v === 'T' ? rest(key) : v);
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
    this.goal.sink = this.hidden ? HIDDEN.sink : 0;
    this.goal.paw = this.hidden ? HIDDEN.paw : 0;
    const driven: Partial<Record<Channel, number>> = {};
    if (this.bit) {
      const b = this.bit;
      b.t += dt * 1000;
      for (const [key, track] of Object.entries(b.def.tracks) as [Channel, Key[]][]) {
        const v = this.sample(track, b.t, key);
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
        const a = kk * ((k === 'stretch' ? 0 : this.goal[k]) - this.cur[k]) - 2 * Math.sqrt(kk) * z * this.vel[k];
        this.vel[k] += a * dt; this.cur[k] += this.vel[k] * dt;
      }
    }
    this.flicks.L *= Math.pow(0.004, dt); this.flicks.R *= Math.pow(0.004, dt);

    const mood = MOODS[this.mood];
    if (!this.bit && !this.reduced && !this.hidden) {
      if (mood.blinks) {
        this.nextBlink -= dt;
        if (this.nextBlink <= 0) { this.blinkAt = this.clock; this.nextBlink = mood.blinks === 'slow' ? 3 + Math.random() * 3 : Math.random() < 0.2 ? 0.3 : 2 + Math.random() * 3; }
      }
      this.nextGlance -= dt;
      if (this.nextGlance <= 0) {
        this.glance = Math.random() < 0.45 ? [0, 0] : [(Math.random() - 0.5) * 24, (Math.random() - 0.4) * 10];
        this.nextGlance = 1.2 + Math.random() * 2.6;
        if (Math.random() < 0.2) this.flick(Math.random() < 0.5 ? 'L' : 'R', Math.random() < 0.5 ? -16 : 16);
      }
      this.nextHabit -= dt;
      if (this.nextHabit <= 0) {
        const habit = HABITS[this.mood];
        if (habit) this.play(habit);
        this.nextHabit = habit?.every ? habit.every[0] + Math.random() * habit.every[1] : 6;
      }
    }
    this.blink = 0;
    if (this.blinkAt >= 0) {
      const len = mood.blinks === 'slow' ? 0.55 : 0.19;
      const p = (this.clock - this.blinkAt) / len;
      if (p >= 1) this.blinkAt = -1;
      else if (p >= 0) this.blink = p < 0.4 ? E.out(p / 0.4) : 1 - E.io((p - 0.4) / 0.6);
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
    const k = Math.min(1, dt * 22);
    this.gaze[0] += (gx - this.gaze[0]) * k; this.gaze[1] += (gy - this.gaze[1]) * k;
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
    const body = mul(tr(0, c.sink), about(BONE.base, mul(rot(c.tilt * 0.38 + sway * 0.5), scale(sx, sy))));
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
    if (!lump) { this.lumpX = 0; return; }
    const { ctx, canvas } = this;
    const cw = canvas.width, ch = canvas.height;
    const t = this.bit!.t;
    const h = this.sample(lump.h, t, 'sink') ?? 0;
    const x = this.sample(lump.x, t, 'sink') ?? 0;
    const vx = dt > 0 ? (x - this.lumpX) / dt : 0;
    this.lumpX = x;
    if (h <= 0.001) return;
    const dpr = cw / (canvas.clientWidth || cw);
    // Low and wide (user, October 10, 2026): about 9 pt high, roughly a fifth of the width across.
    const top = 9 * dpr * h * (1 + (this.reduced ? 0 : Math.sin(this.clock * 6) * 0.08));
    const cx = cw * (0.5 + x), w = cw * 0.085;
    // A ripple trails whichever way he's moving, so it flows like a wave.
    const dir = Math.sign(vx);
    const ripple = this.reduced ? 0 : top * 0.42 * Math.min(1, Math.abs(vx) * 1.6) * (0.65 + 0.35 * Math.sin(this.clock * 10));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(0, ch);
    for (let px = 0; px <= cw; px += Math.max(1, dpr)) {
      const d = (px - cx) / w, r = (px - (cx - dir * 1.7 * w)) / (0.7 * w);
      ctx.lineTo(px, ch - top * Math.exp(-d * d) - ripple * Math.exp(-r * r));
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

    // Face: rides the head bone.
    const c = this.cur;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, cw, ledgePx); ctx.clip();
    const H = mul(view, this.head);
    const at = (local: Mat) => { const q = mul(H, local); ctx.setTransform(q[0], q[1], q[2], q[3], q[4], q[5]); };
    const quiver = this.mood === 'betrayed' && !this.bit ? Math.sin(this.clock * 31) * 0.035 : 0;
    const eyes = [
      { pos: EYE_L, path: new Path2D(eyePath(Math.max(0, (c.open + quiver) * (1 - this.blink)), c.squint, c.slope, 1)), squeeze: 'M-24,-21 L18,0 L-24,21' },
      { pos: EYE_R, path: new Path2D(eyePath(Math.max(0, (c.openR + quiver) * (1 - this.blink)), c.squint, c.slope, -1)), squeeze: 'M24,-21 L-18,0 L24,21' },
    ];
    const jit = c.pupilJit > 0.01 && !this.reduced ? [Math.sin(this.clock * 97) * 2.2 * c.pupilJit, Math.cos(this.clock * 83) * 1.6 * c.pupilJit] : [0, 0];
    const pr = c.pupils > 0.5 && !this.squeezing ? Math.max(2, c.pupilR) : 0;
    for (const e of eyes) {
      at(mul(tr(e.pos[0], e.pos[1]), rot(FACE)));
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = EYE_WHITE; ctx.strokeStyle = EYE_WHITE;
      if (this.squeezing) { ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(e.squeeze)); }
      else ctx.fill(e.path);
      if (pr > 0) {
        ctx.save();
        ctx.clip(e.path);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = INK;
        at(tr(e.pos[0] + this.gaze[0] + jit[0], e.pos[1] + 6 + this.gaze[1] + jit[1]));
        ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
        if (pr >= 7) {
          ctx.fillStyle = EYE_WHITE;
          ctx.beginPath(); ctx.arc(-pr * 0.36, -pr * 0.4, Math.min(4.2, pr * 0.3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
    // Sleep mask: over the eyes (0) to the forehead (1), where it doubles as his brows. It's a
    // window cut through him (user's pick, October 10, 2026, docs/design-references/
    // loc-animation/headband-study.html option 2), so the moon behind shows in it.
    const mk = clamp(c.mask, -0.05, 1.05);
    const mx = MASK_DOWN[0] + (MASK_UP[0] - MASK_DOWN[0]) * mk;
    const my = MASK_DOWN[1] + (MASK_UP[1] - MASK_DOWN[1]) * mk + c.maskY * mk;
    at(chain(tr(mx, my), rot(FACE + c.maskTilt * mk), scale(1 - 0.12 * mk, 1 - 0.12 * mk)));
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill(new Path2D(MASK_PATH));
    ctx.restore();
  }

  step(dt: number) {
    this.animate(dt);
    this.pose(dt);
    this.draw();
    this.drawLump(dt);
  }

  /** Where a tap lands, in rig units, is on him (so the area around him stays free). */
  hits(px: number, py: number) {
    const v = this.view();
    const x = (px - v[4]) / v[0], y = (py - v[5]) / v[0];
    return !this.hidden && !this.burrowing && x > 60 && x < 760 && y > 60 && y < LEDGE;
  }
}
