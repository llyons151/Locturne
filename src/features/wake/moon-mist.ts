/**
 * The mist pouring off the payoff's moon: the same Stable Fluids solver as the week strip's mist
 * dots (modules/mist-dot/ios/MistFluid.swift, after Stam 1999), on a coarse grid over the whole
 * screen instead of a little round jar. The moon is a solid disc moving through it, and its rim
 * gives off mist that's heavier than the air: it rolls round the moon, drips off the bottom in
 * curling plumes and thins away, like dry ice. A moving moon drags the air with it, so the rise
 * leaves a trail.
 *
 * Plain TypeScript, no DOM, so it's tested on its own (moon-mist.test.ts). Grid units throughout:
 * cell (i, j) is centred on (i + 0.5, j + 0.5), y down, velocities in cells a second.
 */

/** The moon this step, in grid units, and how fast it's moving. */
export type MistMoon = { x: number; y: number; r: number; vx: number; vy: number };

export class MoonMist {
  readonly nx: number;
  readonly ny: number;
  /** The mist, row by row from the top, 0 to 1. */
  density: Float32Array;
  private u: Float32Array;
  private v: Float32Array;
  private a: Float32Array;
  private b: Float32Array;
  private pressure: Float32Array;
  private divergence: Float32Array;
  private curl: Float32Array;
  /** 1 where the moon is. */
  private solid: Uint8Array;
  private moon: MistMoon = { x: -1e3, y: -1e3, r: 0, vx: 0, vy: 0 };
  private time = 0;

  // Tuning, in cells and seconds.
  /** How hard gravity pulls the mist down, per unit of density. */
  sink = 75;
  /** How much the rim gives off a second, at its thickest. */
  emit = 1.4;
  /** How fast it leaves the rim, outward. */
  kick = 30;
  /** How thick a band round the rim gives it off, in cells. */
  shell = 5;
  vorticity = 9;
  /** Fraction of velocity kept per second. */
  damping = 0.3;
  /** Seconds for the mist to thin to a third: it fades as it falls. */
  fade = 1.1;
  breath = 5;
  pressureIterations = 18;

  constructor(nx: number, ny: number) {
    this.nx = nx;
    this.ny = ny;
    const make = () => new Float32Array(nx * ny);
    this.density = make();
    this.u = make();
    this.v = make();
    this.a = make();
    this.b = make();
    this.pressure = make();
    this.divergence = make();
    this.curl = make();
    this.solid = new Uint8Array(nx * ny);
  }

  /** A burst off the whole rim, for the moment the moon lands. */
  puff(amount = 0.5, speed = 18) {
    const { nx, ny, density, u, v } = this;
    const { x: mx, y: my, r } = this.moon;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const dx = i + 0.5 - mx;
        const dy = j + 0.5 - my;
        const d = Math.hypot(dx, dy);
        if (d < r || d > r + 3.5) continue;
        const k = j * nx + i;
        const w = 1 - (d - r) / 3.5;
        density[k] = Math.min(1, density[k] + amount * w);
        u[k] += (dx / d) * speed * w;
        v[k] += (dy / d) * speed * w;
      }
    }
  }

  step(dt: number, moon: MistMoon) {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    this.moon = moon;
    const { nx, ny, density, u, v, solid } = this;
    const t = this.time;

    // Where the moon is now: its cells hold its velocity and no mist.
    const r2 = moon.r * moon.r;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const dx = i + 0.5 - moon.x;
        const dy = j + 0.5 - moon.y;
        solid[j * nx + i] = dx * dx + dy * dy < r2 ? 1 : 0;
      }
    }

    // Forces: the mist's weight, the rim giving off more, and a faint stir.
    const s = t * 0.35;
    // Moving, it gives off mist behind it and none ahead, so it leaves a trail instead of
    // ploughing into its own mist and piling it on top.
    const speed = Math.hypot(moon.vx, moon.vy);
    const moving = Math.min(1, speed / 50);
    const bx = speed > 0 ? -moon.vx / speed : 0;
    const by = speed > 0 ? -moon.vy / speed : 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (solid[k]) continue;
        const x = i + 0.5;
        const y = j + 0.5;
        const dx = x - moon.x;
        const dy = y - moon.y;
        const dist = Math.hypot(dx, dy);
        const rim = dist - moon.r;
        if (rim < this.shell) {
          // Lumpy, and the lumps wander round the rim, so it pours in tongues rather than a sheet.
          const ang = Math.atan2(dy, dx);
          const lumps = 0.5 + 0.5 * Math.sin(ang * 5 + t * 1.1 + 2 * Math.sin(ang * 3 - t * 0.6));
          const behind = ((dx / dist) * bx + (dy / dist) * by) * moving;
          const w = (1 - rim / this.shell) * (0.35 + 0.65 * lumps) * Math.max(0, 1 + 1.6 * behind);
          density[k] = Math.min(1, density[k] + this.emit * w * dt);
          u[k] += (dx / dist) * this.kick * w * dt;
          v[k] += (dy / dist) * this.kick * w * dt;
        }
        const m = density[k];
        u[k] += this.breath * (Math.sin(y * 0.31 + s * 1.7) + 0.6 * Math.sin(x * 0.23 - s * 1.1)) * m * dt;
        v[k] += (this.sink * m + this.breath * 0.5 * Math.sin(x * 0.27 + s * 1.3) * m) * dt;
      }
    }

    this.confineVorticity(dt);
    const keep = Math.pow(this.damping, dt);
    for (let k = 0; k < nx * ny; k++) {
      if (solid[k]) {
        u[k] = moon.vx;
        v[k] = moon.vy;
      } else {
        u[k] *= keep;
        v[k] *= keep;
      }
    }

    this.advect(this.u, this.a, dt);
    this.advect(this.v, this.b, dt);
    [this.u, this.a] = [this.a, this.u];
    [this.v, this.b] = [this.b, this.v];
    this.smooth(this.u);
    this.smooth(this.v);
    this.project();
    this.advectSharp(dt);

    const thin = Math.exp(-dt / this.fade);
    const d = this.density;
    for (let k = 0; k < nx * ny; k++) d[k] = solid[k] ? 0 : d[k] * thin;
  }

  /** Bilinear sample in cell units, clamped to the grid. */
  private sample(f: Float32Array, x: number, y: number) {
    const { nx, ny } = this;
    const fx = Math.min(nx - 1.001, Math.max(0, x - 0.5));
    const fy = Math.min(ny - 1.001, Math.max(0, y - 0.5));
    const i = fx | 0;
    const j = fy | 0;
    const tx = fx - i;
    const ty = fy - j;
    const k = j * nx + i;
    const top = f[k] * (1 - tx) + f[k + 1] * tx;
    const bottom = f[k + nx] * (1 - tx) + f[k + nx + 1] * tx;
    return top * (1 - ty) + bottom * ty;
  }

  /** Semi-Lagrangian: each cell takes the value from where its flow came from. */
  private advect(field: Float32Array, out: Float32Array, dt: number) {
    const { nx, ny, u, v, solid } = this;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        out[k] = solid[k] ? field[k] : this.sample(field, i + 0.5 - u[k] * dt, j + 0.5 - v[k] * dt);
      }
    }
  }

  /** MacCormack, as the dots do: forward, back, and half the round trip's error added back, kept in bounds. */
  private advectSharp(dt: number) {
    const { nx, ny, density, a, b } = this;
    this.advect(density, a, dt);
    this.advect(a, b, -dt);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const corrected = a[k] + 0.5 * (density[k] - b[k]);
        // Clamped to what the plain step could have produced nearby, so it can't ring.
        const lo = Math.min(a[k], density[k]) - 0.02;
        const hi = Math.max(a[k], density[k]) + 0.02;
        b[k] = Math.min(1, Math.max(0, Math.min(hi, Math.max(lo, corrected))));
      }
    }
    this.density = b;
    this.b = density;
  }

  /**
   * Incompressible: solve for pressure and subtract its gradient. The moon's cells are walls
   * moving at its velocity; the screen's edges are open (zero pressure), so mist can leave.
   */
  private project() {
    const { nx, ny, u, v, solid, pressure, divergence, a: next } = this;
    const { vx, vy } = this.moon;
    const U = (k: number) => (solid[k] ? vx : u[k]);
    const V = (k: number) => (solid[k] ? vy : v[k]);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (solid[k]) {
          divergence[k] = 0;
          continue;
        }
        const r = i < nx - 1 ? U(k + 1) : u[k];
        const l = i > 0 ? U(k - 1) : u[k];
        const dn = j < ny - 1 ? V(k + nx) : v[k];
        const up = j > 0 ? V(k - nx) : v[k];
        divergence[k] = 0.5 * (r - l + dn - up);
      }
    }
    pressure.fill(0);
    // Out of the grid: zero. Into the moon: the cell's own (no flow through it).
    const P = (k: number, inside: boolean, self: number) => (!inside ? 0 : solid[k] ? self : pressure[k]);
    for (let it = 0; it < this.pressureIterations; it++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          if (solid[k]) continue;
          const p = pressure[k];
          const sum = P(k - 1, i > 0, p) + P(k + 1, i < nx - 1, p) + P(k - nx, j > 0, p) + P(k + nx, j < ny - 1, p);
          next[k] = (sum - divergence[k]) / 4;
        }
      }
      for (let k = 0; k < nx * ny; k++) if (!solid[k]) pressure[k] = next[k];
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (solid[k]) continue;
        const p = pressure[k];
        u[k] -= 0.5 * (P(k + 1, i < nx - 1, p) - P(k - 1, i > 0, p));
        v[k] -= 0.5 * (P(k + nx, j < ny - 1, p) - P(k - nx, j > 0, p));
      }
    }
  }

  /**
   * A touch of viscosity: each cell eased toward its neighbours. The pressure solve on a plain
   * grid lets alternate cells drift apart, which shows as combed stripes (a fast moon stirs them
   * up; the dots' little jar never did); this damps them without blurring the curls away.
   */
  private smooth(f: Float32Array) {
    const { nx, ny, solid, pressure: out } = this;
    const a = 0.22;
    out.set(f);
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        if (solid[k]) continue;
        out[k] = (1 - a) * f[k] + a * 0.25 * (f[k - 1] + f[k + 1] + f[k - nx] + f[k + nx]);
      }
    }
    f.set(out);
  }

  /** Keeps each little eddy spinning, so it reads as mist instead of syrup. */
  private confineVorticity(dt: number) {
    const { nx, ny, density, u, v, curl, solid } = this;
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        curl[k] = 0.5 * (v[k + 1] - v[k - 1] - (u[k + nx] - u[k - nx]));
      }
    }
    for (let j = 2; j < ny - 2; j++) {
      for (let i = 2; i < nx - 2; i++) {
        const k = j * nx + i;
        if (solid[k]) continue;
        let gx = 0.5 * (Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]));
        let gy = 0.5 * (Math.abs(curl[k + nx]) - Math.abs(curl[k - nx]));
        const len = Math.hypot(gx, gy) + 1e-5;
        gx /= len;
        gy /= len;
        // Weighted by the mist, so clear air stays calm.
        const w = this.vorticity * curl[k] * (0.15 + density[k]);
        u[k] += gy * w * dt;
        v[k] -= gx * w * dt;
      }
    }
  }
}
