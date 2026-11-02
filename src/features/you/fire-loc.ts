/**
 * The You tab's "Fire Loc" row, after CARROT Weather's Self-Destruct (docs/SETTINGS_INSPIRATION.md,
 * round 2): it asks, you confirm, and he refuses. Nothing changes; it's a joke with a button.
 * Same voice as his Home lines (loc-lines.ts, from docs/locs-lore): his own life, cartoon stakes, never anything real.
 */

/** His answer: a title and a line. */
export type Refusal = { title: string; line: string; ok: string };

export const REFUSALS: readonly Refusal[] = [
  { title: 'Denied.', line: 'You can’t fire me. I’m court-ordered.', ok: 'Fair' },
  { title: 'Oh, you sweet idiot.', line: 'This is my community service. I can’t quit and you can’t fire me.', ok: 'Okay' },
  { title: 'Bold.', line: 'Gerald, my lawyer, will be in touch. He’s a possum.', ok: 'Sorry, Gerald' },
  { title: 'No.', line: 'I lived in a library ceiling for a semester. I can live in your phone.', ok: 'Okay' },
  { title: 'Cute.', line: 'A judge already tried to get rid of me. I got a bedtime.', ok: 'Noted' },
  { title: 'Request received.', line: 'Request gathered for winter.', ok: 'Fine' },
  { title: 'Incorrect.', line: 'Every morning you get up is a day off my sentence. I’m staying.', ok: 'Fine' },
  { title: 'The grizzly will hear about this.', line: 'I’m writing him tonight. He won’t write back. He’s busy.', ok: 'Sorry, grizzly' },
];

let next = Math.floor(Math.random() * REFUSALS.length);

/** The next refusal, in turn, so a second try gets a new one. */
export function refusal(): Refusal {
  const r = REFUSALS[next % REFUSALS.length];
  next += 1;
  return r;
}

/** The footer under everything. */
export const SIGN_OFF = 'Loc has not grown since 2019.';
