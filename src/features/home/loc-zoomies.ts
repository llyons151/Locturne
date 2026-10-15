import type { Bit, Key } from './loc-rig.ts';
import { NAV_KNOCK } from './nav-knock-tune.ts';

type Lump = NonNullable<Bit['lump']>;

/**
 * The zoomies (user, October 15, 2026): sent under too often (`NAV_KNOCK.zoomAfter` burrows
 * inside `zoomWindow` seconds), he loses it under the covers, then brakes in the middle,
 * crouches and bursts out like any burrow. `extra` is how many burrows past the trigger this
 * one is: the more he's pushed, the longer he goes (up to four more moves).
 *
 * Not laps: "too clean and consistent... I want it to not seem like it was pre-made, just that
 * he's going crazy" (user, same day). So it's a string of moves picked at random each time:
 * dashes at any speed that stop dead or skid past, fake-outs that turn back halfway, spazzing
 * on the spot, stutter steps, and freezes where the lump rises to listen or trembles. Some dash
 * hits each edge, so every button gets its bounce. Fast but always followable: at first it
 * crossed the screen in a fifth of a second, "like he's teleporting" (user, same day).
 */
export function zoomLump(rand: () => number = Math.random, fit = 1, extra = 0): { pop: number; lump: Lump } {
  const pace = Math.max(0.2, NAV_KNOCK.scurry) * Math.max(0.5, NAV_KNOCK.zoomSpeed);
  // Nearly to the screen's edges: past every button, the moon too.
  const edge = 0.45 * fit;
  const moves = Math.max(2, Math.round(NAV_KNOCK.zoomLaps)) * 2 + Math.min(4, Math.max(0, extra) * 2);
  const side = rand() < 0.5 ? -1 : 1;
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const clampX = (v: number) => Math.max(-edge, Math.min(edge, v));

  const x: Key[] = [[0, 0], [540, 0]];
  const h: Key[] = [[0, 0], [430, 0], [540, 1.25, 'out'], [600, 1.1, 'io']];
  const w: Key[] = [[0, 1], [600, 1]];
  const shake: Key[] = [[0, 0]];
  let t = 600, at = 0;
  let high = true;
  let left = false, right = false;
  /** A tremble from `from` to `to` (ms); never keyed before one already set. */
  const tremble = (from: number, to: number, level: number) => {
    const after = shake[shake.length - 1][0];
    from = Math.max(from, after);
    if (to - from < 80) return;
    shake.push([from, 0], [from + 35, level, 'out'], [to - 40, level], [to, 0, 'io']);
  };

  // Hops while he runs: quicker the faster he goes, never a metronome.
  const hops = (until: number, speed: number) => {
    while (t + 35 < until) {
      t += (45 + rand() * 40) / Math.sqrt(speed);
      h.push([t, high ? 1.2 + rand() * 0.2 : 0.82 + rand() * 0.12, 'io']);
      high = !high;
    }
  };
  /** Runs to `stop` at `speed` times his zoom pace; stretched long while he's flat out. */
  const dash = (stop: number, speed: number, ease: Key[2]) => {
    stop = clampX(stop);
    const travel = (60 + Math.abs(stop - at) * 1900) / (pace * speed);
    const start = t;
    hops(start + travel, speed);
    t = Math.max(t, start + travel);
    x.push([t, stop, ease]);
    w.push([start + travel * 0.5, 1 + Math.min(0.6, speed * Math.abs(stop - at) * 1.4), 'io'], [t, 1.05, 'io']);
    if (stop <= -edge * 0.85) left = true;
    if (stop >= edge * 0.85) right = true;
    at = stop;
  };
  /** Stops dead for `ms`: now and then the lump rises as if he's listening, or he trembles. */
  const freeze = (ms: number) => {
    const peek = ms > 150 && rand() < 0.5;
    h.push([t + 30, 1, 'io']);
    if (peek) h.push([t + ms * 0.45, 1.4 + rand() * 0.25, 'out']);
    else if (rand() < 0.6) tremble(t, t + ms, 1);
    h.push([t + ms, 1, 'io']);
    x.push([t + ms, at]);
    t += ms;
  };
  /** Thrashing on the spot: quick jerks either way, trembling. */
  const spaz = () => {
    const n = 4 + Math.floor(rand() * 5), from = t;
    for (let i = 0; i < n; i++) {
      t += 55 + rand() * 45;
      at = clampX(at + (i % 2 ? -1 : 1) * (0.012 + rand() * 0.03));
      x.push([t, at, pick<Key[2]>(['lin', 'out'])]);
      h.push([t, high ? 1.3 + rand() * 0.2 : 0.75, 'io']);
      high = !high;
    }
    tremble(from, t + 60, 0.9);
  };

  const far = () => (rand() < 0.5 ? -1 : 1) * edge * (0.45 + rand() * 0.55);
  const moveOnce = () => {
    const r = rand();
    if (r < 0.38) {
      // A dash: any speed, braking hard, skidding past and back, or flat out to the end.
      dash(far(), 0.7 + rand() * 0.6, pick<Key[2]>(['out', 'out', 'back', 'in', 'io']));
    } else if (r < 0.55) {
      // A fake-out: off one way, a split-second hold, then flat out the other way.
      const dir = at > 0 ? -1 : at < 0 ? 1 : pick([-1, 1]);
      dash(at + dir * edge * (0.2 + rand() * 0.3), 1.1 + rand() * 0.3, 'out');
      freeze(70 + rand() * 90);
      dash(-dir * edge * (0.6 + rand() * 0.4), 1 + rand() * 0.3, pick<Key[2]>(['out', 'back']));
    } else if (r < 0.72) {
      spaz();
    } else if (r < 0.86) {
      freeze(120 + rand() * 260);
    } else {
      // Stutter steps: a few short bursts the same way with dead stops between.
      const dir = at > 0 ? -1 : 1;
      for (let i = 0, n = 2 + Math.floor(rand() * 3); i < n; i++) {
        dash(at + dir * edge * (0.12 + rand() * 0.12), 1 + rand() * 0.3, 'out');
        freeze(80 + rand() * 110);
      }
    }
  };

  // Off like a shot to one edge; to the other somewhere in the middle of it all.
  dash(side * edge * (0.9 + rand() * 0.1), 1 + rand() * 0.3, pick<Key[2]>(['out', 'back']));
  const half = Math.floor(moves / 2);
  for (let i = 1; i < moves; i++) {
    if (i === half && !(side > 0 ? left : right)) dash(-side * edge * (0.9 + rand() * 0.1), 1 + rand() * 0.3, pick<Key[2]>(['out', 'back']));
    else moveOnce();
  }
  if (!left) dash(-edge, 1.1, 'out');
  if (!right) dash(edge, 1.1, 'out');
  // Back where he lives, braking, then the crouch and the burst.
  dash(0, 0.9 + rand() * 0.3, 'out');
  const pop = Math.round(t + 160 + rand() * 100);
  h.push([t + 20, 1, 'io'], [t + 100, 0.5, 'io'], [pop - 40, 0.5], [pop + 30, 1.8, 'out'], [pop + 100, 0, 'in']);
  w.push([pop, 1, 'io']);
  shake.push([Math.max(pop + 100, shake[shake.length - 1][0]), 0]);
  return { pop, lump: { h, x, w, shake } };
}
