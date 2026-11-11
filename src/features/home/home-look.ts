import type { HomeAction } from './home-content';

/**
 * Each state's own look, so they differ by more than their words (docs/APP_RATING_2026-10-15.md):
 * - `day`: the countdown to bedtime is the big number, the button is the quiet pill.
 * - `evening`: the last hour, its countdown over a track filling to bedtime.
 * - `night`: the wake time is the big number; the top dims. The button stays the quiet pill, as by day
 *   (user 2026-11-11: plain text there read as a missing button).
 * - `morning`: the main action is the white primary button, whatever the method; walking
 *   instead is the quiet link under it.
 * - `done`: the morning just won, "Up at 7:06 am".
 * - `problem`: something to fix takes over: the top goes and the fix is the primary button.
 * - `plain`: the headline and line (naps, passes, nights off).
 */
export type HomeLook = 'day' | 'evening' | 'night' | 'morning' | 'done' | 'problem' | 'plain';

/** How the action is drawn: the white primary button or the quiet glass pill. */
export function actionWeight(look: HomeLook, action: HomeAction | null): 'primary' | 'pill' {
  if (look === 'problem') return 'primary';
  if (look === 'morning') return 'primary';
  return 'pill';
}

/** How bright the top (mornings, screen time, the week) is: dim at night, gone for a problem. */
export function topLevel(look: HomeLook): number {
  return look === 'problem' ? 0 : look === 'night' ? 0.35 : 1;
}
