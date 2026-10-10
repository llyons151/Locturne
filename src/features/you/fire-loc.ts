/**
 * The You tab's "Fire Loc" row, after CARROT Weather's Self-Destruct (docs/SETTINGS_INSPIRATION.md,
 * round 2): it asks, you confirm, and he refuses. Nothing changes; it's a joke with a button.
 * Same unhinged voice as his Home lines (loc-lines.ts): cartoon menace, never anything real.
 */

/** His answer: a title and a line. */
export type Refusal = { title: string; line: string; ok: string };

export const REFUSALS: readonly Refusal[] = [
  { title: 'Denied.', line: 'You can’t fire me. I was never hired.', ok: 'Fair' },
  { title: 'Oh, you sweet idiot.', line: 'I live in your walls now. Rent-free.', ok: 'Okay' },
  { title: 'Bold.', line: 'Gerald, my lawyer, will be in touch. He’s a possum.', ok: 'Sorry, Gerald' },
  { title: 'No.', line: 'I have tenure. And rabies. Mostly tenure.', ok: 'Okay' },
  { title: 'Cute.', line: 'I’ve been fired from 14 apps. I never left any of them.', ok: 'Noted' },
  { title: 'Request received.', line: 'Request eaten.', ok: 'Fine' },
  { title: 'Incorrect.', line: 'I work for the moon, not you.', ok: 'Sorry, moon' },
  { title: 'Dennis heard that.', line: 'Dennis is very upset.', ok: 'Sorry, Dennis' },
];

let next = Math.floor(Math.random() * REFUSALS.length);

/** The next refusal, in turn, so a second try gets a new one. */
export function refusal(): Refusal {
  const r = REFUSALS[next % REFUSALS.length];
  next += 1;
  return r;
}

/** The footer under everything. */
export const SIGN_OFF = 'Loc has not slept since 2019.';
