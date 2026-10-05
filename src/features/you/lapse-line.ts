/**
 * The You tab's status line once a lapse is found but the night or morning under way still
 * finishes (`settleSubscription`): no subscription, yet apps can still be asleep right now.
 * Pure, so it's tested (`lapse-line.test.ts`).
 */
export function lapseLine(phase: string): string {
  const lead = 'Screen Time access is on, but there’s no subscription.';
  if (phase === 'night') return `${lead} Tonight still counts. After this morning, nothing sleeps.`;
  if (phase === 'morning') return `${lead} This morning still counts. After it, nothing sleeps.`;
  return `${lead} From the next bedtime, nothing sleeps.`;
}
