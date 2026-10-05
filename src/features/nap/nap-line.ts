/**
 * Which of Loc's lines the Nap tab shows. Pure, so it's tested (`nap-line.test.ts`).
 */

export type NapLine = 'idle' | 'napping' | 'ended' | 'woken';

/**
 * The line follows the nap, not just this tab's own buttons: a nap that's running reads as
 * napping (one started before the tab mounted too), and one that ended some other way (a
 * pass, an emergency unlock, a lapse, iOS while the tab was away) reads as ended.
 */
export function shownLine(line: NapLine, napping: boolean): NapLine {
  if (napping) return 'napping';
  return line === 'napping' ? 'ended' : line;
}
