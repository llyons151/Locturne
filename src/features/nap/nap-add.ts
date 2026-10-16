import { closeNightPicker, openNightPicker } from '../onboarding/night-picker.ts';
import { beginBlockAdd, BLOCK_DRAFT, finishBlockAdd, peekNap, selectionSize, type SelectionId } from '../../lib/screen-time.ts';

/*
 * "Add apps" on a running Block now (user, 2026-10-15: started a block, then opened TikTok).
 * Adding only tightens, so it applies at once; taking an app off would loosen the nap, and
 * iOS would never wake an app unshielded that way, so removals wait for the nap to end.
 * - Picked apps (`block`): the picker edits a copy that's merged in on close (`finishBlockAdd`).
 * - Bedtime apps (`night`): the bedtime list's own draft, as the Apps tab and onboarding edit it
 *   while anything holds it (`openNightPicker`): added apps join now, removals wait for bedtime.
 */

/** The list Apple's picker should write to add apps to the running nap, or null with no nap. */
export function openNapAdd(now = new Date()): SelectionId | null {
  const nap = peekNap(now);
  if (!nap) return null;
  return nap.list === 'night' ? openNightPicker(now) : beginBlockAdd();
}

/**
 * The picker closed on `list` (from `openNapAdd`). Returns how many picks joined the nap, and
 * whether any were deselected (still asleep until the nap ends).
 */
export function closeNapAdd(list: SelectionId, now = new Date()): { added: number; dropped: boolean } {
  if (list === BLOCK_DRAFT) return finishBlockAdd();
  const before = selectionSize('night');
  // The draft's removals wait (`finishListEdit`); the live list only grows.
  const draftSize = selectionSize(list);
  closeNightPicker(list, now);
  const added = Math.max(0, selectionSize('night') - before);
  return { added, dropped: draftSize < before + added };
}
