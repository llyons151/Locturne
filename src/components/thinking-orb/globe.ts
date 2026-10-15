/**
 * The "searching" thought-orb: a dotted globe, honestly 3D (rotated, depth-shaded, drawn far to
 * near), with a scan meridian sweeping it as a ripple of bigger, brighter dots. The math is
 * ported from thinking-orbs' `frameGlobe` and its two tuned presets; only the drawing differs:
 * dots are pooled into a few layers by depth and scan so a frame is ~24 SVG paths, not ~200
 * circles.
 *
 * Ported from thinking-orbs (https://github.com/Jakubantalik/thinking-orbs)
 * MIT License, Copyright (c) Jakub Antalik
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or substantial portions of
 * the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

export type OrbSize = 20 | 64;

/** The upstream presets with their count and radius multipliers already applied. */
const PRESETS = {
  64: { speed: 2.015, latRings: 11, lonDensity: 29, rBase: 0.69, rDepth: 1.955, scanMul: 4.08 },
  20: { speed: 2.665, latRings: 6, lonDensity: 14, rBase: 1.05, rDepth: 2.975, scanMul: 4.335 },
} as const;

const SPIN = 0.5;
const R_BOOST = 1;
const INK_FAR = 0.62;
const INK_SPAN = 0.54;
/** Un-scanned dots fade to this, so the meridian reads. */
const DIM_BASE = 0.45;
const R_MIN = 0.3;

/** Layers: far to near, then dim to scanned within each. Drawn in this order. */
const DEPTHS = 8;
const SCANS = 3;
export const LAYERS = DEPTHS * SCANS;

/** One layer of dots: an SVG path of circles and how much ink it carries (0–1). */
export type OrbLayer = { d: string; opacity: number };

/** Clock seconds scaled by the preset's tuned speed: the `t` a frame takes. */
export function orbTime(size: OrbSize, seconds: number): number {
  return seconds * PRESETS[size].speed;
}

/** The globe at time `t`, as `LAYERS` layers in draw order (empty ones have `d: ''`). */
export function globeFrame(size: OrbSize, t: number): OrbLayer[] {
  const p = PRESETS[size];
  const c = size / 2;
  const radius = c * 0.82;
  const tilt = 0.4 + 0.06 * Math.sin(t * 0.35);
  const yaw = t * SPIN;
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  // The scan sweeps relative to the spin; scanMul scales that relative rate.
  const scan = t * (SPIN + (1.7 - SPIN) * p.scanMul);
  // Radii were tuned for a 300pt frame; sub-linear so a small orb stays legible.
  const rs = (size / 300) ** 0.6;

  const paths: string[] = Array.from({ length: LAYERS }, () => '');
  const ink = new Array<number>(LAYERS).fill(0);
  const count = new Array<number>(LAYERS).fill(0);

  for (let li = 0; li <= p.latRings; li++) {
    const lat = -Math.PI / 2 + (li / p.latRings) * Math.PI;
    const cosLat = Math.cos(lat);
    const y = Math.sin(lat);
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * p.lonDensity));
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = (lj / lonCount) * 2 * Math.PI;
      const x = cosLat * Math.cos(lon);
      const z = cosLat * Math.sin(lon);
      // Spin, tilt, orthographic projection.
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y1 = y * ct - z1 * st;
      const z2 = y * st + z1 * ct;
      const depth = (z2 + 1) / 2;
      // The scan: a moving meridian read as a size ripple, not a shine.
      const d = Math.atan2(Math.sin(lon + yaw - scan), Math.cos(lon + yaw - scan));
      const boost = Math.exp(-(d * d) / 0.18) * Math.max(0, z2);
      const a = DIM_BASE + (1 - DIM_BASE) * Math.min(1, boost);
      const r = Math.max(R_MIN, (p.rBase + p.rDepth * depth + R_BOOST * boost) * rs);
      // On a dark ground the ink is mirrored, so near dots read bright.
      const lit = 1 - Math.min(1, Math.max(0, INK_FAR - INK_SPAN * depth));

      const layer =
        Math.min(DEPTHS - 1, Math.floor(depth * DEPTHS)) * SCANS + Math.min(SCANS - 1, Math.floor(((a - DIM_BASE) / (1 - DIM_BASE)) * SCANS));
      paths[layer] += circle(c + x1 * radius, c - y1 * radius, r);
      ink[layer] += lit * a;
      count[layer]++;
    }
  }
  return paths.map((d, i) => ({ d, opacity: count[i] ? ink[i] / count[i] : 0 }));
}

function circle(x: number, y: number, r: number): string {
  const r2 = (r * 2).toFixed(2);
  const rr = r.toFixed(2);
  return `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${rr} ${rr} 0 1 0 ${r2} 0a${rr} ${rr} 0 1 0 -${r2} 0`;
}
