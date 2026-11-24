import type { MoonDef } from './moon-types.ts';

/**
 * How a shiny moon looks. NOT DESIGNED YET (user, 2026-11-23: "don't design them yet"): until each moon
 * gets its own shiny colours in the moon studio, a shiny is its moon with the sky's, halo's and orb's
 * colours turned round the colour wheel by `PLACEHOLDER_TURN`. The moon's own picture is unchanged.
 * When the studio bakes shiny colours, put them on the moon as `shinyColors` and they win.
 */
export const PLACEHOLDER_TURN = 150;

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase();
}

/** Pure: a colour turned `deg` round the wheel, its lightness and saturation kept. */
export function turnHue(hex: string, deg: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex((h + deg + 360) % 360, s, l);
}

type Four = [string, string, string, string];
const turn4 = (c: Four, deg: number) => c.map((x) => turnHue(x, deg)) as Four;

const cache = new Map<string, MoonDef>();

/** Pure: a moon's shiny version. Same id (so everything keyed by moon still finds it), `shiny: true`. */
export function shinyOf(moon: MoonDef): MoonDef {
  const hit = cache.get(moon.id);
  if (hit) return hit;
  const set = moon.shinyColors;
  const shiny: MoonDef = {
    ...moon,
    shiny: true,
    glow: set?.glow ?? turnHue(moon.glow, PLACEHOLDER_TURN),
    orb: set?.orb ?? turn4(moon.orb, PLACEHOLDER_TURN),
    skyColors: set?.skyColors ?? turn4(moon.skyColors, PLACEHOLDER_TURN),
  };
  cache.set(moon.id, shiny);
  return shiny;
}

/** A key that tells a moon and its shiny apart (React keys, crossfades). */
export const lookKey = (moon: MoonDef) => (moon.shiny ? `${moon.id}~shiny` : moon.id);
