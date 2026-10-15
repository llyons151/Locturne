/**
 * The exits screen's words for a night or morning the clock names but nothing holds
 * (`heldPhase` reads it as day: no lock armed, a pass already used tonight, or after a
 * lapse's last paid morning). No pass, no "Rough morning": there's nothing to wake.
 *
 * Pure, so it's tested (`unheld-words.test.ts`).
 */

const when = (phase: 'night' | 'morning') => (phase === 'morning' ? 'this morning' : 'tonight');

/** The sentence under his line. Stood down, Block now is gone too, so it isn't offered. */
export function unheldBody(phase: 'night' | 'morning', stoodDown: boolean): string {
  if (stoodDown) return `Nothing is asleep ${when(phase)}.`;
  return `Your bedtime apps are awake ${when(phase)}. A pass can still end a Block now session.`;
}

/**
 * The sentence under his line on a night that's switched off (phase 'off'). Only the bedtime
 * apps are off: the always list still sleeps unless it's empty or stood down (as Home's
 * `offHero`), and a Block now running keeps its apps asleep until its end (`napUntil`, a clock
 * label). "Nothing is locked" only when that's true.
 */
export function offBody({ alwaysSleeps, napUntil }: { alwaysSleeps: boolean; napUntil: string | null }): string {
  if (!alwaysSleeps && !napUntil) return 'Nothing is locked tonight. A pass can still end a Block now session.';
  const always = alwaysSleeps ? ' Always-asleep apps still sleep.' : '';
  const nap = napUntil
    ? ` Block now: apps asleep until ${napUntil}. A pass can end it.`
    : ' A pass can still end a Block now session.';
  return `Bedtime apps awake tonight.${always}${nap}`;
}
