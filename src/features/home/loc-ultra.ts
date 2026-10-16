import type { Bit } from './loc-rig.ts';
import { NAV_KNOCK } from './nav-knock-tune.ts';
import { rimMarks, rimPoint, type Rim } from './rim.ts';

type Lump = NonNullable<Bit['lump']>;

/** The lump's run round the rim, every `dt` seconds: where (pt round it), how high, how wide, how hard it trembles. */
export type UltraRun = {
  rim: Rim;
  dt: number;
  u: number[];
  h: number[];
  w: number[];
  shake: number[];
  /** When he's back home in the middle of the bottom edge (ms), and Loc's own canvas takes the lump over. */
  home: number;
  /** When he bursts out (ms). */
  pop: number;
  /** Buzzes on the way round (ms): a tick rounding a top corner, a thud landing back on the bottom. */
  taps: [number, 'tick' | 'thud'][];
};

/** The same random numbers from the same seed, so the webview and the app plan the same run. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The integrator's step, ms: four to each recorded frame. */
const STEP = 1000 / 240;
/** Recorded 60 times a second, for the overlay and the nav strip to play back. */
const FRAME = 4;

/**
 * The ultra zoomies (user, October 15, 2026: "after 6 hits in a short span he gets ultra zoomies
 * and the black hump dooms around the whole screen up the edges and over the top"; then 5). Hidden: it
 * takes `NAV_KNOCK.ultraAfter` burrows inside `zoomWindow` seconds, and the count starts over
 * after, so it stays a thing you stumble on.
 *
 * Not keyframed: the lump is run by a little physics, so it moves like something with weight.
 * It speeds up and brakes, slows climbing a wall in big straining hops, slides down the far side
 * faster and stretched flat, and lands back on the bottom with a bump. The route is new every
 * time: a revving spaz on the spot, then off one way, sometimes slipping back down the first wall
 * and taking a run-up, sometimes stopping dead at the top of the screen to listen (right under
 * the Dynamic Island) or faking a turn back, now and then a second lap, and home in a skid.
 * Much faster than the zoomies on purpose: round a whole phone in about a second flat out.
 */
export function ultraRun(rim: Rim, rand: () => number = Math.random): { run: UltraRun; lump: Lump } {
  const { flat, wallUp, cornerT, topIn, L } = rimMarks(rim);
  // Flat out: he's lost it (user, October 15, 2026: "he should go faster, it should look crazy").
  const V = 2 * Math.max(0.4, NAV_KNOCK.ultraSpeed);
  const VMAX = 2.9 * Math.max(0.4, NAV_KNOCK.ultraSpeed);
  const ACC = 0.013, DEC = 0.015;

  const run: UltraRun = { rim, dt: 1 / 60, u: [], h: [], w: [], shake: [], home: 0, pop: 0, taps: [] };
  let t = 0, n = 0, u = 0, v = 0;
  // Smoothed toward their targets every step, so nothing ever jumps; hops ride on top of `h`.
  let h = 0, w = 1, shake = 0, hop = 0, phase = 0;
  let hT = 0, wT = 1, sT = 0, hopT = 0;
  const record = (always = false) => {
    if (n++ % FRAME && !always) return;
    run.u.push(Math.round(u * 10) / 10);
    run.h.push(Math.round(Math.max(0, h + hop * Math.sin(phase * Math.PI * 2)) * 1000) / 1000);
    run.w.push(Math.round(w * 1000) / 1000);
    run.shake.push(Math.round(shake * 100) / 100);
  };
  const ease = (from: number, to: number, ms: number) => from + (to - from) * (1 - Math.exp(-STEP / ms));
  const tick = () => {
    t += STEP;
    // Off the bottom edge the lump swells: up the sides and over the top it's the whole show,
    // and it has to read against the dark sky. Back to size on the bottom, for the hand-off.
    const under = Math.max(0, -rimPoint(u, rim)[3]);
    h = ease(h, hT * (1.45 - 0.45 * under), 45); w = ease(w, wT, 70); shake = ease(shake, sT, 40); hop = ease(hop, hopT, 60);
    record();
  };

  // Where on the rim he is, for the buzzes: bottom, a bend, a wall or the top.
  const zone = (at: number) => {
    let m = ((at % L) + L) % L;
    if (m > L / 2) m = L - m;
    return m <= flat ? 'bottom' : m <= wallUp ? 'bendB' : m <= cornerT ? 'wall' : m <= topIn ? 'bendT' : 'top';
  };
  let was = zone(0);
  const buzz = (kind: 'tick' | 'thud') => {
    const last = run.taps[run.taps.length - 1];
    if (!last || t - last[0] > 120) run.taps.push([Math.round(t), kind]);
  };

  /**
   * Runs to `to` going `dir` (+1 is right along the bottom). `brake` stops him dead on it;
   * otherwise he arrives at speed and the next move carries on. `boost` is how fired up he is.
   */
  const go = (dir: number, to: number, brake = false, boost = 1) => {
    // Never more than ten seconds of running, whatever the tuning.
    for (let guard = 0; guard < 2400; guard++) {
      const left = (to - u) * dir;
      if (!(left > 0.05)) break;
      const [x0, y0, , ny] = rimPoint(u, rim);
      const [x1, y1] = rimPoint(u + dir * 2, rim);
      const down = (y1 - y0) / Math.max(1e-6, Math.hypot(x1 - x0, y1 - y0));
      const top = ny > 0.5;
      // Gravity: slower climbing, faster coming down; loose across the top.
      let vT = Math.min(VMAX, V * boost * (1 + 0.42 * down) * (top ? 1.12 : 1));
      if (brake) vT = Math.min(vT, Math.sqrt(2 * DEC * left));
      v += Math.max(-DEC * STEP, Math.min(ACC * STEP, vT - v));
      v = Math.max(v, brake ? 0.015 : 0.05);
      u += dir * Math.min(v * STEP, left);
      // Climbing: big slow straining hops, narrow. Sliding down: flat out and stretched, no hops.
      // Along the bottom and the top: quick hops, wider the faster he goes.
      const climb = Math.max(0, -down), fall = Math.max(0, down);
      hT = 1.08 + 0.12 * climb - 0.2 * fall;
      hopT = Math.min(1, v / 0.5) * (0.22 + 0.12 * climb - 0.2 * fall);
      wT = 1 + Math.min(0.75, v * (0.45 + 0.3 * fall - 0.25 * climb));
      sT = 0.25 * climb;
      phase += (v * STEP) / (40 + 30 * climb);
      const now = zone(u);
      if (now !== was) {
        if (now === 'bendT') buzz('tick');
        if (now === 'bottom' && was === 'bendB' && fall > 0) buzz('thud');
        was = now;
      }
      tick();
    }
    u = to;
    if (brake) v = 0;
  };
  /** Stops for `ms`; `pose` sets what the lump does meanwhile (0..1 through the stop). */
  const hold = (ms: number, pose: (p: number) => void) => {
    v = 0;
    hopT = 0;
    for (let s = 0; s < ms; s += STEP) {
      pose(s / ms);
      tick();
    }
  };
  /** Revving on the spot: quick jerks either way, trembling. */
  const spaz = () => {
    const home = u;
    for (let i = 0, k = 4 + Math.floor(rand() * 3); i < k; i++) {
      const to = home + (i % 2 ? -1 : 1) * (5 + rand() * 7);
      const from = u, ms = 55 + rand() * 40;
      for (let s = 0; s < ms; s += STEP) {
        const p = s / ms;
        u = from + (to - from) * (1 - (1 - p) * (1 - p));
        hT = i % 2 ? 0.85 : 1.3; wT = 1.15; sT = 1;
        tick();
      }
    }
    // Back on the spot, ready to go.
    const from = u;
    for (let s = 0; s < 60; s += STEP) {
      u = from + (home - from) * (s / 60);
      hT = 0.8; wT = 1.3; sT = 0.6;
      tick();
    }
    u = home;
  };

  const side = rand() < 0.5 ? -1 : 1;
  // He dives: no lump while he goes under, then it rises where he went.
  hold(430, () => { hT = 0; });
  h = 0;
  hold(170, () => { hT = 1.25; wT = 1; });
  spaz();

  // Up the first wall. Sometimes he doesn't make it: he slows, hangs there trembling, slides
  // back down, backs off for a run-up and charges it.
  if (rand() < 0.33) {
    const reach = side * (wallUp + (cornerT - wallUp) * (0.28 + rand() * 0.27));
    go(side, reach, true, 0.95);
    buzz('tick');
    hold(100 + rand() * 100, (p) => { hT = 1.25 + 0.1 * Math.sin(p * Math.PI); wT = 0.95; sT = 1; });
    go(-side, side * (flat - 40 - rand() * 90), true);
    buzz('thud');
    hold(110 + rand() * 90, () => { hT = 0.75; wT = 1.35; sT = 0.7; });
    go(side, side * (flat + 10), false, 1.25);
  }
  go(side, side * (L / 2 - 140), false, 1.1);

  // The top of the screen: a dead stop to listen, a fake turn back, or straight past.
  const top = rand();
  if (top < 0.5) {
    go(side, side * (L / 2 + (rand() - 0.5) * 40), true);
    buzz('tick');
    hold(220 + rand() * 160, (p) => {
      hT = p < 0.2 ? 1.15 : p < 0.75 ? 1.75 : 1.1;
      wT = p < 0.75 ? 0.9 : 1.1;
      sT = p > 0.3 && p < 0.75 ? 0.8 : 0;
    });
  } else if (top < 0.75) {
    go(side, side * (L / 2 - 30), true);
    go(-side, side * (L / 2 - 90 - rand() * 50), true, 1.1);
    hold(80 + rand() * 80, () => { hT = 1.2; sT = 0.6; });
  }
  // Down the far side and along the bottom; now and then he blows straight through home and
  // goes round again (not on a big screen, where a lap is long enough).
  let end = side * L;
  if (L < 3000 && rand() < 0.15) {
    go(side, end + side * 60, false, 1.15);
    end += side * L;
  }
  // Home in a skid: past the middle, braking hard, and back.
  go(side, end + side * (16 + rand() * 14), true, 1.1);
  go(-side, end, true, 0.35);
  hold(130, () => { hT = 1; wT = 1; sT = 0; });
  // Exactly where the canvas picks the lump up.
  u = end; h = 1; w = 1; shake = 0; hop = 0;
  record(true);
  run.home = Math.round(t);
  run.pop = Math.round(t + 160 + rand() * 100);
  run.taps.push([run.pop, 'thud']);

  // Loc's own canvas draws nothing until he's home, then the crouch and the burst as usual.
  const pop = run.pop, home = run.home;
  const lump: Lump = {
    h: [[0, 0], [home, 0], [home + 1, 1], [home + 20, 1, 'io'], [home + 100, 0.5, 'io'], [pop - 40, 0.5], [pop + 30, 1.8, 'out'], [pop + 100, 0, 'in']],
    x: [[0, 0]],
    w: [[0, 1], [pop, 1]],
    shake: [[0, 0], [home + 100, 0], [home + 130, 0.8, 'out'], [pop - 20, 0.8], [pop, 0]],
  };
  return { run, lump };
}

/** Where the lump is along the nav strip at each of the run's frames, for its bounce: off the bottom, it's nowhere near the buttons. */
export function ultraNav(run: UltraRun): { x: number[]; h: number[] } {
  const x: number[] = [], h: number[] = [];
  for (let i = 0; i < run.u.length; i++) {
    const [px, , , ny] = rimPoint(run.u[i], run.rim);
    const under = Math.max(0, -ny);
    x.push(under > 0.01 ? Math.round((px / run.rim.W - 0.5) * 1e4) / 1e4 : 2);
    h.push(Math.round(run.h[i] * under * under * 1000) / 1000);
  }
  return { x, h };
}
