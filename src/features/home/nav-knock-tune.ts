/**
 * The nav strip bouncing as Loc burrows (user, October 15, 2026): tapped twice, he scurries under
 * the covers fast, and wherever he is the buttons bounce, like things on a blanket with something
 * running about under it. He never shoves them; they ride his hops and jiggle back to rest.
 * Plain numbers, read by Loc's rig (in the webview) and by the tab bar, and tuned live in the
 * knock lab (/knock-lab). Scurry, reach, width, bounce, tempo and jiggle are the user's picks
 * from the lab (October 15, 2026).
 *
 * - `scurry`: how fast the lump runs, times the old burrow's pace.
 * - `reach`: how far it runs either way, as a share of a phone's width.
 * - `width`: how far either side of him (pt) the buttons feel him.
 * - `bounce`: how high the buttons over him rise, and swell with each of his hops.
 * - `jiggle`: 0..1, how long a bounce rings on before it settles.
 * - `tempo`: bounces a second: how quick and light each one is.
 * - `sway`: how far they lean aside as he passes under and trail behind him.
 * - `spin`: how much they roll with that lean.
 * - `squash`: stretched tall going up, wide coming down; 0 keeps them round.
 * - `blast`: how hard they jump when he bursts out.
 * - `haptics`: a light tick on the bigger bounces (iPhone only).
 * - `zoomAfter`, `zoomWindow`: this many burrows inside this many seconds and he gets the
 *   zoomies, tearing along the bottom edge to edge (loc-zoomies.ts), and again on each
 *   burrow after while they keep coming that fast.
 * - `zoomSpeed`: how fast he tears about, times `scurry`.
 * - `zoomLaps`: how long he goes on: this many wild moves.
 * - `ultraAfter`: this many burrows inside `zoomWindow` and he gets the ultra zoomies, the
 *   lump tearing round the whole screen, up its sides and over the top (loc-ultra.ts). Hidden;
 *   the count starts over after.
 * - `ultraSpeed`: how fast he goes round, times his ultra pace (about 2 pt a millisecond).
 */
export const NAV_KNOCK = {
  scurry: 2.2, reach: 0.43, width: 46, bounce: 2.05, jiggle: 0.5, tempo: 2.8, sway: 1, spin: 0.25,
  squash: 1, blast: 1, haptics: true, zoomAfter: 3, zoomWindow: 60, zoomSpeed: 1.2, zoomLaps: 3,
  ultraAfter: 5, ultraSpeed: 1,
};

export type NavKnockTune = typeof NAV_KNOCK;

/** The lump's whole run, planned when he dives: where it is (share of width from the middle) and how high, every `dt` seconds. */
export type BurrowPath = {
  dt: number; x: number[]; h: number[]; pop: number;
  /** The ultra zoomies' seed: the app plans the same run round the screen from it (loc-ultra.ts) and draws it (components/loc-rim). */
  ultra?: number;
  /** With `ultra`: when he dove (ms since 1970, the same clock in the webview and the app). */
  at?: number;
};
