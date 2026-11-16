/**
 * The You tab's "Fire Loc" row, after CARROT Weather's Self-Destruct (docs/SETTINGS_INSPIRATION.md,
 * round 2): it asks, you confirm, and he refuses. Nothing changes; it's a joke with a button.
 * Same voice as his Home lines (loc-lines.ts, from docs/locs-lore): his own life, cartoon stakes, never anything real.
 */

import { t, tList } from '@/lib/i18n/core';

/** His answer: a title and a line. */
export type Refusal = { title: string; line: string; ok: string };

/** In the language in use (lib/i18n/locales, `fireLoc.refusals`). */
export const refusals = (): readonly Refusal[] => tList('fireLoc.refusals');

let next = Math.floor(Math.random() * 8);

/** The next refusal, in turn, so a second try gets a new one. */
export function refusal(): Refusal {
  const all = refusals();
  const r = all[next % all.length];
  next += 1;
  return r;
}

/** The footer under everything. */
export const signOff = () => t('fireLoc.signOff');
