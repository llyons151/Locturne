/**
 * The payoff's entrance timings (payoff-screen.tsx), in one place so the browser lab
 * (/morning-won?demo=1&lab=1, payoff-lab.web.tsx) can change them live and replay. The app reads the
 * defaults; the lab keeps its own in the browser's storage. To keep a set, copy it from the lab
 * into DEFAULTS.
 */
export type PayoffTuning = {
  /** The screen fading in over Home, which reads as Home's pieces fading out (the stack's fade; iOS's default is 350). */
  screenFadeMs: number;
  /** A pause after that before the black strip starts rising. */
  bandDelayMs: number;
  /** The strip rising to the payoff's height, Done and Share fading in with it. */
  bandMs: number;
  /** The strip's curve, a cubic bezier. */
  band: [number, number, number, number];
  /** A new moon's colours running in over the worn moon's, from when the strip starts up. */
  moonFadeMs: number;
  /** Loc's yell, after the strip starts up; the moon rises on it. */
  yellAtMs: number;
  /** The moon's rise once Loc yells. */
  riseMs: number;
  /** The rise's curve, a cubic bezier. */
  rise: [number, number, number, number];
  /** How far into the rise the page starts coming into focus. */
  pageAtMs: number;
  /** One step between the page's pieces coming into focus. */
  stepMs: number;
  /** Loc's line, after the page starts coming in. */
  lineAtMs: number;
};

export const PAYOFF_DEFAULTS: PayoffTuning = {
  // Picked in the payoff lab (user 2026-11-05): slower, so the build-up makes the payoff feel bigger.
  // A beat after Home's pieces go, the strip eases up and the sky turns with it; he yells as it
  // settles, and the moon comes up on the yell's peak, about a second later.
  screenFadeMs: 630,
  bandDelayMs: 200,
  bandMs: 960,
  band: [0.45, 0, 0.2, 1],
  moonFadeMs: 2000,
  yellAtMs: 450,
  riseMs: 2200,
  rise: [0.16, 1, 0.3, 1],
  pageAtMs: 2550,
  stepMs: 160,
  lineAtMs: 1600,
};

/** Read at the moment each piece starts, so the lab's changes apply on the next replay. */
export const payoffTuning: PayoffTuning = { ...PAYOFF_DEFAULTS, rise: [...PAYOFF_DEFAULTS.rise], band: [...PAYOFF_DEFAULTS.band] };

export function setPayoffTuning(next: PayoffTuning) {
  Object.assign(payoffTuning, next, { rise: [...next.rise], band: [...next.band] });
}
