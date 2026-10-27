import { SKIPPED_WEEKLY_MINUTES, weeklyAmount } from '../estimate';

/**
 * The paywall's box for a light user or one who skipped (`AverageCompare`): no night of theirs
 * worth comparing, so the average week on the phone in bed, without Locturne and with it
 * (user, 2026-10-27). Shared by the SwiftUI box and the web one: an .ios.tsx importing its own
 * name would get itself.
 */
export const AVERAGE_COMPARE = {
  columns: [
    { label: 'Without', amount: weeklyAmount(SKIPPED_WEEKLY_MINUTES) },
    // The picked apps are asleep from bed to up: that's the product, not an estimate.
    { label: 'With Locturne', amount: '0 hours' },
  ],
  caption: 'The average week on the phone in bed',
};

/** What VoiceOver reads for the box, as one element. */
export const averageCompareLabel = `${AVERAGE_COMPARE.caption}: ${AVERAGE_COMPARE.columns.map((c) => `${c.label.toLowerCase()}, ${c.amount}`).join('; ')}.`;
