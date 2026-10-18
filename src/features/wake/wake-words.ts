import { formatPreset } from '../../lib/text.ts';

/**
 * The day's status line under an opener (the exits and scan pages): a Block now running is
 * what's asleep, so it leads, as on Home. Otherwise `awake` ("Apps awake until 11 pm."), with a
 * full stop. Pure, so it's tested (`wake-words.test.ts`).
 */
export function dayStatus(blockNowUntil: Date | null, awake: string): string {
  const line = blockNowUntil
    ? `Block now: apps asleep until ${formatPreset(blockNowUntil.getHours() * 60 + blockNowUntil.getMinutes())}`
    : awake;
  return line.endsWith('.') ? line : `${line}.`;
}
