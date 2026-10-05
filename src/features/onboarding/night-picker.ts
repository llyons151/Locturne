import { looserEditsStart } from '../../lib/daily-limits.ts';
import {
  beginListEdit,
  finishListEdit,
  getArmedNight,
  isNightHeld,
  listChangeStarts,
  peekNap,
  reapplyStandingBlocks,
  type SelectionId,
} from '../../lib/screen-time.ts';

/*
 * Onboarding's bedtime-apps picker. iOS's shield is one stored set of apps: shielding a list
 * adds its apps, unshielding takes away the apps the list holds *then*. So while anything has
 * the bedtime list asleep or on its way to sleep (an armed night, a held night, a Block now on
 * it, removals already waiting), the picker edits a draft, as the Apps tab does: an app taken
 * off the live list there would never be unshielded again. With none of that (a first run),
 * the picker writes the list itself, so the picks are there for the arm after purchase.
 */

/** Something holds or will hold the bedtime list, so edits go through its draft. */
function nightListInUse(now: Date): boolean {
  return getArmedNight() !== null || isNightHeld() || peekNap(now)?.list === 'night' || listChangeStarts('night') !== null;
}

/** The list Apple's picker should write: the bedtime list, or its draft. Only on a tap. */
export function openNightPicker(now = new Date()): SelectionId {
  return nightListInUse(now) ? beginListEdit('night') : 'night';
}

/**
 * The picker closed on `list`. A draft is applied: added apps join now, removed ones wait
 * for bedtime (`finishListEdit`), and newly added apps are shielded if the list is asleep.
 */
export function closeNightPicker(list: SelectionId, now = new Date()): void {
  if (list === 'night') return;
  finishListEdit('night', looserEditsStart(now, getArmedNight()));
  reapplyStandingBlocks();
}
