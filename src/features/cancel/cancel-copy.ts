/**
 * The cancel flow's words and its one decision: which reasons get a fix before the discount.
 * Pure, so it runs under `npm test`. The research behind it is docs/CANCEL_FLOW.md.
 *
 * Rules it keeps (Apple 3.1.2, California's auto-renewal law, the FTC's Amazon case):
 * "Continue to cancel" is on every screen, the reason is skippable, there's one offer and it
 * says what it costs and that it renews, and Loc never guilts anyone. The joke is on him.
 */

import type { PlanId, SaveOffer } from '@/lib/purchases';

export type CancelReason = 'price' | 'hard' | 'unused' | 'fixed' | 'broken' | 'other';

/** Most common first (Churnkey 2025: budget 33%, not using it 31%). */
export const REASONS: { value: CancelReason; label: string }[] = [
  { value: 'price', label: 'It costs too much' },
  { value: 'unused', label: 'I’m not using it' },
  { value: 'hard', label: 'Mornings are too hard' },
  { value: 'fixed', label: 'My sleep is sorted' },
  { value: 'broken', label: 'Something isn’t working' },
  { value: 'other', label: 'Something else' },
];

/** Where a fix sends them: the Routine tab, or an email to us. */
export type FixAction = 'routine' | 'email';

/** A save that isn't money, for a reason money doesn't answer. */
export type Fix = { title: string; body: string; action: string; to: FixAction };

/**
 * Price and "something else" go straight to the offer: a fix can't answer either. The rest
 * get one fix first (tailored saves beat generic ones: 15–30% against under 5%).
 */
export const FIXES: Partial<Record<CancelReason, Fix>> = {
  hard: {
    title: 'Make it easier. Don’t make it gone.',
    body: 'Fewer steps, a code stuck by the kettle, or weekends off. The apps still sleep; you just get up a softer way.',
    action: 'Make mornings easier',
    to: 'routine',
  },
  unused: {
    title: 'I only work if I’m on.',
    body: 'If bedtime never starts, nothing ever sleeps. Check the nights are right, or pick just the worst ones.',
    action: 'Check my nights',
    to: 'routine',
  },
  fixed: {
    title: 'Proud of you. Gross.',
    body: 'Habits slip back when the guard leaves. Keep me for the nights that go wrong: Sundays, say.',
    action: 'Keep just a few nights',
    to: 'routine',
  },
  broken: {
    title: 'Tell me what broke.',
    body: 'I read every email and I fix things fast. If it’s the lock, it’s usually one setting.',
    action: 'Email me',
    to: 'email',
  },
};

export function fixFor(reason: CancelReason | null): Fix | null {
  return reason ? (FIXES[reason] ?? null) : null;
}

/** The first screen's headline: their record, or a gentler line before there is one. */
export function recordLine(mornings: number): string {
  if (mornings <= 0) return 'Leaving before the first morning?';
  return mornings === 1 ? 'You got up 1 morning with me.' : `You got up ${mornings} mornings with me.`;
}

/** What actually stops, said plainly ("effect of cancellation"). */
export const WHAT_STOPS = [
  'Your apps stay up all night again.',
  'Nothing waits for you to get out of bed.',
  'Your mornings and record stop counting.',
];

/** The offer's headline price and its terms, in full, from the store's prices. */
export function offerTerms(offer: SaveOffer): { price: string; unit: string; terms: string } {
  if (offer.plan === 'annual') {
    return {
      price: offer.priceString,
      unit: offer.cycles === 1 ? 'for your next year' : `a year for ${offer.cycles} years`,
      terms: `Instead of ${offer.fullPriceString}. It starts at your next renewal, so nothing is charged today. After that it renews at ${offer.fullPriceString} a year unless you cancel.`,
    };
  }
  return {
    price: offer.priceString,
    unit: offer.cycles === 1 ? 'for your next month' : `a month for ${offer.cycles} months`,
    terms: `Instead of ${offer.fullPriceString} a month. It starts at your next renewal, so nothing is charged today. After that it renews at ${offer.fullPriceString} a month unless you cancel.`,
  };
}

/** A made-up offer for the preview when the store has none to price (DEV_CATALOG's numbers). */
export function sampleOffer(plan: PlanId = 'annual'): SaveOffer {
  return plan === 'annual'
    ? { plan, priceString: '$29.99', fullPriceString: '$59.99', percentOff: 50, cycles: 1 }
    : { plan, priceString: '$4.99', fullPriceString: '$9.99', percentOff: 50, cycles: 3 };
}
