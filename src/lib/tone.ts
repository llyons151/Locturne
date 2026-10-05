/**
 * How grumpy Loc is: picked on onboarding's `voice` step, changed on the You tab. It only
 * changes his words (the shield's title and button, the bedtime and morning notifications),
 * never a rule, so unlike a schedule edit it applies at once: nothing about it loosens a lock.
 * Grumpy is the voice the copy was written in, so it's the default.
 */
import { sharedGet, sharedSet } from './screen-time.ts';

export type Tone = 'mild' | 'grumpy' | 'unbearable';

export const TONES: readonly Tone[] = ['mild', 'grumpy', 'unbearable'];
export const DEFAULT_TONE: Tone = 'grumpy';

export const TONE_LABEL: Record<Tone, string> = { mild: 'Mild', grumpy: 'Grumpy', unbearable: 'Unbearable' };

const TONE_KEY = 'locturne.tone';

export const isTone = (value: unknown): value is Tone => TONES.includes(value as Tone);

export function getTone(): Tone {
  const saved = sharedGet<string>(TONE_KEY);
  return isTone(saved) ? saved : DEFAULT_TONE;
}

export function setTone(tone: Tone): void {
  sharedSet(TONE_KEY, tone);
}
