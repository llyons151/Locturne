/**
 * Smooths the lump's run under the covers: it follows the planned route on a critically damped
 * spring, so its speed never changes in one frame. Planned straight from keys, a dash stopped dead
 * or snapped into reverse between two frames, up to 3000 pt/s at once ("he zooms right and
 * glitches back... it just looks choppy", user, October 16, 2026). Followed like this, every stop
 * eases out and every turn is rounded, with no overshoot and the route as planned.
 *
 * `target(ms)` is the planned position; returns where the lump is every `frame` ms, from 0 to
 * `until`. `hz` is how tightly it follows: higher keeps closer to the plan, lower is smoother.
 */
export function glide(target: (ms: number) => number, until: number, hz = 5, frame = 1000 / 60): number[] {
  const sub = 4, step = frame / sub, w = (2 * Math.PI * hz) / 1000;
  let x = target(0), v = 0;
  const out = [x];
  for (let n = 1; n * step <= until + 1e-6; n++) {
    v += (w * w * (target(n * step) - x) - 2 * w * v) * step;
    x += v * step;
    if (n % sub === 0) out.push(x);
  }
  return out;
}

/** The value `ms` into `frames` sampled every `frame` ms, read straight between them; past the end, the last. */
export function frameAt(frames: number[], ms: number, frame = 1000 / 60): number {
  const f = Math.max(0, ms / frame), i = Math.floor(f);
  if (i >= frames.length - 1) return frames[frames.length - 1];
  return frames[i] + (frames[i + 1] - frames[i]) * (f - i);
}
