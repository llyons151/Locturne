/**
 * The exits screen's words for a night or morning the clock names but nothing holds
 * (`heldPhase` reads it as day: no lock armed, an emergency already used tonight, or after a
 * lapse's last paid morning). No pass, no "Rough morning": there's nothing to wake.
 *
 * Pure, so it's tested (`unheld-words.test.ts`).
 */

const when = (phase: 'night' | 'morning') => (phase === 'morning' ? 'this morning' : 'tonight');

/** The sentence under his line. Stood down, Block now is gone too, so it isn't offered. */
export function unheldBody(phase: 'night' | 'morning', stoodDown: boolean): string {
  if (stoodDown) return `Nothing is asleep ${when(phase)}.`;
  return `Your bedtime apps are awake ${when(phase)}. The emergency unlock can still end a Block now session.`;
}

/** "I can't walk this morning" with no code: it can't be set up from bed, and isn't needed. */
export function unheldNoCode(phase: 'night' | 'morning'): string {
  return `No code yet, and it can’t be set up from bed. Your bedtime apps are awake ${when(phase)} anyway.`;
}
