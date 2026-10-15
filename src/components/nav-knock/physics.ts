import type { BurrowPath, NavKnockTune } from '@/features/home/nav-knock-tune';

/**
 * The nav strip's buttons bouncing as Loc scurries under the covers (index.tsx), run on the UI
 * thread. Not a pinball: he never touches them (user, October 15, 2026: "wherever Loc's at, the
 * balls bounce"). Each button sits on its own springy spot in the covers, and the covers rise
 * over him and swell with each hop of the lump, so a bounce ripples along the row as he runs.
 * They lean aside as he passes under, trail a little behind him, and jiggle down to rest.
 *
 * Smooth by construction ("buttery", user, October 15, 2026): nothing is ever set or shoved in
 * one step. The springs chase a target that itself moves smoothly (the lump's eased height and
 * position), so speed changes without a jolt; neighbours ease apart with a soft push instead of
 * snapping; and the panel's edge is a cushion applied when drawing (`poseOf`), not a wall.
 * Points and seconds throughout; y grows down.
 */
export type Disc = {
  /** Offset from home. */
  x: number; y: number; vx: number; vy: number;
  /** Its own share of each bounce (0.85..1.15), so the row never moves in lockstep. */
  give: number;
};

export type Knock = { t: number; discs: Disc[]; lx: number; lh: number; popped: boolean; done: boolean };

export type KnockWorld = {
  /** Each disc's home centre, in the strip. */
  homes: { x: number; y: number }[];
  /** The strip's width. */
  W: number;
  /** The discs' radius. */
  R: number;
  path: BurrowPath;
  tune: NavKnockTune;
};

/** A fresh bounce: every disc at home, still. */
export function startKnock(count: number, rand: () => number = Math.random): Knock {
  'worklet';
  const discs: Disc[] = [];
  for (let i = 0; i < count; i++) discs.push({ x: 0, y: 0, vx: 0, vy: 0, give: 0.85 + rand() * 0.3 });
  return { t: 0, discs, lx: Number.NaN, lh: 0, popped: false, done: false };
}

/** Neighbours start easing apart when the gap between them closes to this, pt. */
const SOFT = 6;

/** How a disc this far (pt) from Loc feels him: 1 right over him, fading out over `width`. */
function near(dx: number, width: number) {
  'worklet';
  const d = dx / width;
  return Math.exp(-d * d);
}

/**
 * Moves the bounce on by `dt` seconds, in place. Returns how sharply the covers rose under the
 * nearest button this step (the lump's rise times how near), for the haptics; 0 when nothing rose.
 */
export function stepKnock(k: Knock, world: KnockWorld, dt: number): number {
  'worklet';
  const { homes, W, R, path, tune } = world;
  const discs = k.discs;
  k.t += dt;
  const t = k.t;
  let biggest = 0;

  // Where he is and how high the lump stands, from the planned run.
  const at = t / path.dt;
  const i0 = Math.floor(at);
  const last = path.x.length - 1;
  let lx = Number.NaN, lh = 0, lvx = 0, rise = 0;
  if (i0 <= last) {
    const i1 = Math.min(last, i0 + 1), f = at - i0;
    lx = W * (0.5 + path.x[i0] + (path.x[i1] - path.x[i0]) * f);
    lh = path.h[i0] + (path.h[i1] - path.h[i0]) * f;
    lvx = Number.isNaN(k.lx) ? 0 : (lx - k.lx) / dt;
    rise = Math.max(0, lh - k.lh);
  }
  k.lx = lx;
  k.lh = lh;
  // Bursting out is the biggest rise of all; `blast` sizes it apart from the hops.
  const popping = t >= path.pop - 0.05 && t < path.pop + 0.15;
  if (t >= path.pop) k.popped = true;

  // The springs: `tempo` is how quick a bounce is, `jiggle` how long it rings on.
  const w0 = Math.PI * 2 * tune.tempo, stiff = w0 * w0;
  const damp = 2 * w0 * Math.max(0.08, 1 - tune.jiggle);
  for (let i = 0; i < discs.length; i++) {
    const d = discs[i];
    let tx = 0, ty = 0;
    if (!Number.isNaN(lx) && lh > 0.02) {
      const dx = homes[i].x - lx;
      const feel = near(dx, tune.width);
      // The covers rise over him, and higher with each hop (the lump stands 0.75..1.35 running,
      // 1.8 bursting out).
      const swell = Math.max(0, lh - 0.75) * (popping ? tune.blast : 1);
      ty = -tune.bounce * d.give * feel * (3.2 * Math.min(1, lh) + 8 * swell);
      // Leaning away from him, and trailing the way he went.
      tx = tune.sway * feel * (Math.tanh(dx / 12) * 4 + Math.max(-1, Math.min(1, lvx / 900)) * 3);
      if (rise > 0) biggest = Math.max(biggest, rise * feel);
    }
    d.vx += (stiff * 0.6 * (tx - d.x) - damp * 0.8 * d.vx) * dt;
    d.vy += (stiff * (ty - d.y) - damp * d.vy) * dt;
  }

  // Neighbours ease apart before they'd touch: a soft push that grows as the gap closes.
  for (let i = 1; i < discs.length; i++) {
    const a = discs[i - 1], b = discs[i];
    const gap = homes[i].x + b.x - (homes[i - 1].x + a.x) - 2 * R;
    if (gap < SOFT) {
      const push = stiff * 4 * (SOFT - gap) * dt;
      a.vx -= push;
      b.vx += push;
    }
  }
  for (const d of discs) {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }

  // Done once he's out and the row has rung down: snapped exactly home, nothing left a hair off.
  if (k.popped && i0 > last) {
    let still = true;
    for (const d of discs) if (Math.abs(d.x) > 0.15 || Math.abs(d.y) > 0.15 || Math.abs(d.vx) > 3 || Math.abs(d.vy) > 3) still = false;
    if (still || t > path.pop + 6) {
      for (const d of discs) { d.x = 0; d.y = 0; d.vx = 0; d.vy = 0; }
      k.done = true;
    }
  }
  return biggest;
}

/**
 * A disc's pose to draw: its offset, with the panel's edge `up` points above as a cushion (it
 * slows into it and never crosses it, instead of stopping dead), a slight roll with its sideways
 * lean, and a squash and stretch with its speed (tall going up, wide coming down).
 */
export function poseOf(d: Disc, R: number, up: number, tune: NavKnockTune) {
  'worklet';
  const y = d.y < 0 ? -up * Math.tanh(-d.y / up) : d.y;
  const s = Math.max(-0.08, Math.min(0.08, -d.vy * 0.0004 * tune.squash));
  return { x: d.x, y, a: (d.x / R) * tune.spin, sx: 1 - s * 0.6, sy: 1 + s };
}
