/**
 * The You tab's status line once a lapse is found but the night or morning under way still
 * finishes (`settleSubscription`): no subscription, yet apps can still be asleep right now.
 * `covers` is `lapseStillCovers()` (lock-controller.ts): the lapse's last night or morning if
 * it's the one under way, else null (a later night or morning, which nothing holds). Pure, so
 * it's tested (`lapse-line.test.ts`).
 */
export function lapseLine(covers: 'night' | 'morning' | 'day' | null): string {
  const lead = 'Screen Time access is on, but there’s no subscription';
  if (covers === 'night') return `${lead}. Tonight still counts. After this morning, nothing sleeps.`;
  if (covers === 'morning') return `${lead}. This morning still counts. After it, nothing sleeps.`;
  if (covers === 'day') return `${lead}. From the next bedtime, nothing sleeps.`;
  return `${lead}, so nothing sleeps.`;
}
