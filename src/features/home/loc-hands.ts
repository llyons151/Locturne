/**
 * Loc's raccoon hands (LOC_TUNE.hands in loc-rig.ts): the arm, hand and fingers, their secondary
 * motion, and how they're drawn. Plain web code like the rig.
 *
 * What makes them move like hands and not like stickers (docs/LOC_HANDS.md):
 * - A two-bone arm (shoulder below the ledge, elbow, wrist) solved with soft IK, so the elbow
 *   bends out to his side and never snaps straight.
 * - Raccoon hands, not human ones (Iwaniuk & Whishaw 1999): the fingers barely move on their
 *   own. They open and close as one fan, the expression is in the shoulder, elbow and wrist, and
 *   things are rolled between both palms. So each finger has its own spring, but the ripple
 *   across the hand is under about 100 ms (pinky side first closing, index side first opening).
 * - The wrist drags: moving fast sideways the hand tips the other way, and the fingers fan
 *   further than the wrist (successive breaking of joints), then settle.
 * - Fingers bend at the knuckle and hook in toward the middle of the hand, so a curled hand is
 *   a cupped claw. Claws curve the same way.
 * - Contact splays: a slap or grab kicks the fingers open, then they settle (`splat`).
 * - Left alone on the ledge, a finger now and then lifts and taps, or the claws flex in a slow
 *   ripple. Never both hands at once.
 */

export type Vec = [number, number];
export type Mat = [number, number, number, number, number, number];
export type Side = 'L' | 'R';

/** One hand's channels from the rig (rig units and degrees). */
export type HandPose = {
  /** Wrist position, in the ledge's frame. */
  x: number;
  y: number;
  /** 0 fingers up, 180 fingers down (gripping the ledge). */
  a: number;
  /** Finger spread and curl, 0..1. */
  s: number;
  c: number;
  /** Size: above 1 the hand comes toward you. */
  z: number;
  /** The gap cut round it where it crosses him, 0..1. */
  f: number;
  /** How much it rides his head instead of the ledge, 0..1. */
  b: number;
  /** Tap: the index finger straightens and the rest curl, 0..1. */
  t: number;
  /** Drum: the fingers lift and drop in a running wave, 0..1. */
  w: number;
};

export type HandSim = {
  curl: number[];
  curlV: number[];
  /** The wrist's drag, radians. */
  lag: number;
  lagV: number;
  /** Extra spread from a contact. */
  splay: number;
  splayV: number;
  prev: Vec | null;
  /** Per-finger idle offsets (negative lifts the finger), and the queue that drives them. */
  fidget: number[];
  queue: { at: number; finger: number; amount: number }[];
  nextFidget: number;
  clock: number;
  /** Which way the elbow bends (+1 or -1); kept until the other way is clearly better. */
  bend: number;
};

/** Still fidgeting (a finger is up, or more is queued). */
export const fidgeting = (sim: HandSim) => sim.queue.length > 0 || sim.fidget.some((f) => f < -0.08);

export const newHandSim = (curl: number, firstFidget: number): HandSim => ({
  curl: [curl, curl, curl, curl, curl],
  curlV: [0, 0, 0, 0, 0],
  lag: 0,
  lagV: 0,
  splay: 0,
  splayV: 0,
  prev: null,
  fidget: [0, 0, 0, 0, 0],
  queue: [],
  nextFidget: firstFidget,
  clock: 0,
  bend: 1,
});

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const apply = (m: Mat, p: Vec): Vec => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

/** The base scale of a hand, in rig units per hand unit. */
const HAND = 2.1;

// Hand space: wrist at 0,0, fingers up the -y axis. Digit 0 is the thumb side, 4 the pinky.
const BASE_X = [-15, -7.5, 0, 7.5, 15];
const BASE_Y = [-17, -24, -26, -24, -21];
const LEN = [17, 30, 34, 31, 22];
const FAN = [-0.75, -0.3, 0, 0.3, 0.62];

/** Where each shoulder sits, below the ledge, in his body's frame. */
const SHOULDER: Record<Side, Vec> = { L: [225, 810], R: [593, 810] };
const UPPER = 265;
const FORE = 255;

/** The wrist on screen (rig units), riding the ledge or his head. */
export function wristAt(pose: HandPose, root: Mat, head: Mat): Vec {
  const w: Vec = [pose.x, pose.y];
  const onLedge = apply(root, w), onHead = apply(head, w);
  const b = clamp(pose.b, 0, 1);
  return [onLedge[0] + (onHead[0] - onLedge[0]) * b, onLedge[1] + (onHead[1] - onLedge[1]) * b];
}

/**
 * How much of the forearm shows, 0..1. Gripping the ledge it goes back away from you, out of
 * sight behind the hand; lifted off the ledge or turned fingers-up, it comes into view from
 * below.
 */
export function armShown(_pose: HandPose) {
  // The hands are only ever ledge grips (user, October 14, 2026): no arm ever shows.
  return 0;
}

/** The least a finger is curled: grips stay grips, they never open into long fingers. */
const MIN_CURL = 0.5;

/** Each finger's curl target, before springs: the hand's curl, a tap, a drum wave, a fidget. */
function curlTargets(pose: HandPose, sim: HandSim) {
  const c = clamp(pose.c, 0, 1), t = clamp(pose.t, 0, 1), w = clamp(pose.w, 0, 1);
  return [0, 1, 2, 3, 4].map((j) => {
    let v = c;
    // Tap: the index and middle fingers stay out together, the others tuck in (a raccoon taps
    // with a pair, never one human pointing finger).
    if (j === 1 || j === 2) v = c * (1 - t);
    else v = Math.max(c, 0.85 * t);
    // A contact flattens the hand: the fingers straighten as they splay.
    v -= Math.max(0, sim.splay) * 0.6;
    // Drum: a wave runs pinky to index, each finger lifting in turn.
    if (w > 0) v -= w * 0.55 * Math.max(0, Math.sin(sim.clock * 15 - (4 - j) * 0.95));
    return clamp(v + sim.fidget[j], -0.2, 1);
  });
}

/**
 * Moves the springs on by `dt`. `P` is the wrist on screen, for the drag. `life`: idle fidgets
 * are allowed (nothing is playing, motion isn't reduced).
 */
export function stepHand(sim: HandSim, pose: HandPose, P: Vec, dt: number, life: boolean, rand: () => number, otherBusy = false) {
  if (dt <= 0) return;
  sim.clock += dt;
  const targets = curlTargets(pose, sim);
  for (let j = 0; j < 5; j++) {
    // Closing, the pinky side leads; opening, the index side leads (a ripple, not a snap).
    const closing = targets[j] > sim.curl[j];
    const order = closing ? 4 - j : j;
    const k = 470 - order * 30, z = 0.6;
    const a = k * (targets[j] - sim.curl[j]) - 2 * Math.sqrt(k) * z * sim.curlV[j];
    sim.curlV[j] += a * dt;
    sim.curl[j] += sim.curlV[j] * dt;
  }
  // Drag: the hand tips against how fast the wrist moves across it, then swings back.
  const v: Vec = sim.prev ? [(P[0] - sim.prev[0]) / dt, (P[1] - sim.prev[1]) / dt] : [0, 0];
  sim.prev = P;
  const ang = (pose.a * Math.PI) / 180;
  const across = v[0] * Math.cos(ang) + v[1] * Math.sin(ang);
  const lagTarget = clamp(-across / 1500, -0.5, 0.5) * armShown(pose);
  const lk = 150, lz = 0.45;
  sim.lagV += (lk * (lagTarget - sim.lag) - 2 * Math.sqrt(lk) * lz * sim.lagV) * dt;
  sim.lag += sim.lagV * dt;
  // Splay settles back after a contact.
  const sk = 260, sz = 0.35;
  sim.splayV += (sk * -sim.splay - 2 * Math.sqrt(sk) * sz * sim.splayV) * dt;
  sim.splay += sim.splayV * dt;
  // Fidgets: queued finger lifts, each easing back down.
  for (const q of sim.queue) if (q.at <= sim.clock) sim.fidget[q.finger] = q.amount;
  sim.queue = sim.queue.filter((q) => q.at > sim.clock);
  for (let j = 0; j < 5; j++) sim.fidget[j] *= Math.exp(-dt / 0.11);
  if (!life) return;
  // A very slow breath through the curl, so a resting hand is never frozen.
  for (let j = 0; j < 5; j++) sim.fidget[j] += Math.sin(sim.clock * 1.3 + j * 1.7) * 0.0009;
  sim.nextFidget -= dt;
  if (sim.nextFidget > 0) return;
  sim.nextFidget = 2.5 + rand() * 4.5;
  // Only one hand fidgets at a time.
  if (otherBusy) return;
  if (pose.c < 0.6 || armShown(pose) > 0.1) return;
  if (rand() < 0.7) {
    // One finger lifts and taps down: a middle one, most often.
    const finger = [1, 2, 2, 3, 3, 4][Math.floor(rand() * 6)];
    sim.queue.push({ at: sim.clock, finger, amount: -0.75 });
    if (rand() < 0.4) sim.queue.push({ at: sim.clock + 0.24, finger, amount: -0.6 });
  } else {
    // The claws flex in a slow ripple, pinky to index.
    for (let j = 0; j < 5; j++) sim.queue.push({ at: sim.clock + (4 - j) * 0.07, finger: j, amount: -0.45 });
  }
}

/** A contact: the fingers kick open, then settle. */
export function splat(sim: HandSim, amount: number) {
  sim.splayV += amount * 9;
}

type Built = {
  P: Vec;
  S: number;
  arm: number;
  gap: number;
  curl: number;
  shoulder: Vec;
  elbow: Vec;
  at: (x: number, y: number) => Vec;
  fingers: { base: Vec; mid: Vec; tip: Vec; claw: [Vec, Vec, Vec]; w0: number; w1: number }[];
  palm: { c: Vec; rx: number; ry: number; tilt: number };
  side: Side;
};

/** Lays out one hand: arm by soft IK, palm, and five two-joint fingers with hooked claws. */
export function buildHand(side: Side, pose: HandPose, sim: HandSim, root: Mat, body: Mat, head: Mat, headAngle: number): Built {
  const P = wristAt(pose, root, head);
  const b = clamp(pose.b, 0, 1);
  const mirror = side === 'L' ? 1 : -1;
  const S = HAND * Math.max(0.3, pose.z);
  const angle = ((pose.a + headAngle * b) * Math.PI) / 180 + sim.lag;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const at = (x: number, y: number): Vec => [P[0] + mirror * x * S * cos - y * S * sin, P[1] + mirror * x * S * sin + y * S * cos];
  const curl = clamp(pose.c, 0, 1);
  const spread = Math.max(0, pose.s + sim.splay);

  // The arm: shoulder below the ledge, elbow bent out to his side.
  const shoulder = apply(body, SHOULDER[side]);
  const dx = P[0] - shoulder[0], dy = P[1] - shoulder[1];
  const d = Math.hypot(dx, dy) || 1;
  // Soft IK: near full reach the bones stretch a little instead of locking straight.
  const reach = UPPER + FORE;
  const stretch = d > reach * 0.9 ? 1 + ((d - reach * 0.9) / reach) * 0.85 : 1;
  const l1 = UPPER * stretch, l2 = FORE * stretch;
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ux = dx / d, uy = dy / d;
  const elbowFor = (sign: number): Vec => {
    const bend = Math.acos(cosA) * sign;
    return [shoulder[0] + (ux * Math.cos(bend) - uy * Math.sin(bend)) * l1, shoulder[1] + (ux * Math.sin(bend) + uy * Math.cos(bend)) * l1];
  };
  // Elbows point out and down. Of the two ways the arm can bend, take the one that scores
  // better on that, and only switch when the other is clearly better, so it never flips mid-move.
  const out = side === 'L' ? -1 : 1;
  const score = (e: Vec) => (e[1] - shoulder[1]) + (e[0] - shoulder[0]) * out * 0.6;
  const keep = elbowFor(sim.bend), other = elbowFor(-sim.bend);
  if (score(other) > score(keep) + 40) sim.bend = -sim.bend;
  const elbow = elbowFor(sim.bend);

  const fingers = [0, 1, 2, 3, 4].map((j) => {
    const cf = clamp(sim.curl[j], MIN_CURL, 1);
    const fan = FAN[j] * spread * (1 - 0.35 * cf);
    // Successive breaking: the fingers trail the wrist's drag further than the hand does. (Hand
    // space is mirrored for the right hand, so the same turn on screen flips sign here.)
    const trail = sim.lag * 0.7 * mirror;
    const bx = BASE_X[j] * (1 + 0.6 * curl), by = BASE_Y[j];
    const l0 = LEN[j] * 0.55 * (1 - 0.45 * Math.max(0, cf));
    const l1f = LEN[j] * 0.45 * (1 - 0.7 * Math.max(0, cf));
    // Curling hooks the finger in toward the middle of the hand: a cupped claw.
    const inward = j === 2 ? 0 : -Math.sign(BASE_X[j]);
    const d0 = fan + trail;
    const d1 = d0 + inward * Math.max(0, cf) * 0.85;
    const midL: Vec = [bx + Math.sin(d0) * l0, by - Math.cos(d0) * l0];
    const tipL: Vec = [midL[0] + Math.sin(d1) * l1f, midL[1] - Math.cos(d1) * l1f];
    const dc = d1 + inward * 0.35;
    const clawTipL: Vec = [tipL[0] + Math.sin(dc) * 8, tipL[1] - Math.cos(dc) * 8];
    const half = 3.1;
    const clawA: Vec = [tipL[0] + Math.cos(d1) * half, tipL[1] + Math.sin(d1) * half];
    const clawB: Vec = [tipL[0] - Math.cos(d1) * half, tipL[1] - Math.sin(d1) * half];
    return {
      base: at(bx, by),
      mid: at(midL[0], midL[1]),
      tip: at(tipL[0], tipL[1]),
      claw: [at(clawA[0], clawA[1]), at(clawTipL[0], clawTipL[1]), at(clawB[0], clawB[1])] as [Vec, Vec, Vec],
      w0: (9 + 2.5 * curl) * S,
      w1: (7.2 + 2 * curl) * S,
    };
  });
  const tilt = Math.atan2(at(1, 0)[1] - at(0, 0)[1], at(1, 0)[0] - at(0, 0)[0]);
  const palm = { c: at(0, -14), rx: 17 * S * (1 + 0.3 * curl), ry: 18 * S * (1 - 0.3 * curl), tilt };
  return { P, S, arm: armShown(pose), gap: clamp(pose.f, 0, 1), curl, shoulder, elbow, at, fingers, palm, side };
}

/** A tapered limb from a to b, half-widths wa and wb, with round ends. */
function limb(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, wa: number, wb: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  ctx.beginPath();
  ctx.moveTo(a[0] + nx * wa, a[1] + ny * wa);
  ctx.lineTo(b[0] + nx * wb, b[1] + ny * wb);
  ctx.lineTo(b[0] - nx * wb, b[1] - ny * wb);
  ctx.lineTo(a[0] - nx * wa, a[1] - ny * wa);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); ctx.arc(a[0], a[1], wa, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(b[0], b[1], wb, 0, Math.PI * 2); ctx.fill();
}

/** Fur: small tufts pointing back along the outer edge of a limb. */
function tufts(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, wa: number, wb: number, outward: number, at: number[], size: number, grow: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  let nx = -uy, ny = ux;
  if (Math.sign(nx) !== Math.sign(outward) && Math.abs(nx) > 0.05) { nx = -nx; ny = -ny; }
  for (const t of at) {
    const half = wa + (wb - wa) * t - size * 0.2;
    const bx = a[0] + dx * t + nx * half, by = a[1] + dy * t + ny * half;
    ctx.beginPath();
    ctx.moveTo(bx - ux * size, by - uy * size);
    ctx.lineTo(bx + nx * size - ux * size * 1.1, by + ny * size - uy * size * 1.1);
    ctx.lineTo(bx + ux * size * 0.5, by + uy * size * 0.5);
    ctx.closePath();
    ctx.fill();
    if (grow) ctx.stroke();
  }
}

/** Traces one hand. With `grow`, every shape is widened by it (for cutting the gap round it). */
export function traceHand(ctx: CanvasRenderingContext2D, h: Built, grow: number) {
  const { P, S, arm, elbow, shoulder, fingers, palm } = h;
  const k = S / HAND;
  ctx.lineWidth = grow * 2;
  if (arm > 0.02) {
    const out = h.side === 'L' ? -1 : 1;
    // Upper arm, then forearm: thick and fluffy, narrowing to the wrist. The upper arm is beside
    // and behind him, so no gap is cut for it; only the forearm and hand come in front.
    if (!grow) limb(ctx, shoulder, elbow, 34 * arm, 30 * arm);
    limb(ctx, elbow, P, 29 * arm + grow, 18 * k * arm + grow);
    if (arm > 0.5 && !grow) {
      tufts(ctx, elbow, P, 29 * arm, 18 * k * arm, out, [0.25, 0.45, 0.65, 0.82], 15 * Math.min(1.2, k), 0);
      // A tuft at the elbow, pointing out and down.
      if (!grow) tufts(ctx, shoulder, elbow, 34 * arm, 30 * arm, out, [0.9], 22, 0);
    }
  }
  ctx.beginPath(); ctx.ellipse(palm.c[0], palm.c[1], palm.rx + grow, palm.ry + grow, palm.tilt, 0, Math.PI * 2); ctx.fill();
  for (const f of fingers) {
    // Two bones per finger, a knuckle bump where it leaves the palm, and a hooked claw.
    ctx.lineCap = 'round';
    ctx.lineWidth = f.w0 + grow * 2;
    ctx.beginPath(); ctx.moveTo(f.base[0], f.base[1]); ctx.lineTo(f.mid[0], f.mid[1]); ctx.stroke();
    ctx.lineWidth = f.w1 + grow * 2;
    ctx.beginPath(); ctx.moveTo(f.mid[0], f.mid[1]); ctx.lineTo(f.tip[0], f.tip[1]); ctx.stroke();
    ctx.beginPath(); ctx.arc(f.base[0], f.base[1], f.w0 * 0.62 + grow, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = grow * 2;
    ctx.beginPath(); ctx.moveTo(f.claw[0][0], f.claw[0][1]); ctx.lineTo(f.claw[1][0], f.claw[1][1]); ctx.lineTo(f.claw[2][0], f.claw[2][1]); ctx.closePath(); ctx.fill();
    if (grow) ctx.stroke();
  }
}
