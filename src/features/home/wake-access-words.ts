import type { WakeMethod } from '../../lib/routine.ts';

/**
 * The iOS permission a wake-up can't work without: Motion & Fitness for the walk and Step away,
 * the camera for a scan, push-ups or dance, location for getting to your place.
 */
export type WakeNeed = 'motion' | 'camera' | 'location';

export function wakeNeedFor(method: WakeMethod): WakeNeed {
  if (method === 'steps' || method === 'downtime') return 'motion';
  if (method === 'place') return 'location';
  return 'camera';
}

const SETTING: Record<WakeNeed, string> = {
  motion: 'Motion & Fitness is off.',
  camera: 'Camera access is off.',
  location: 'Location is off.',
};

/**
 * Home's button: asks iOS while it still can, else opens Settings (`useWakeAccess`). Continue when it leads to
 * Apple's prompt, never "Turn on …" (App Review 5.1.1(iv), 2026-11-16, said so of Screen Time's button).
 */
export const wakeFixLabel = (settings: boolean) => (settings ? 'Open Settings' : 'Continue');

/** What the morning can't do without it. Short: the buttons under it say the fix (user 2026-11-08). */
const CANT: Record<WakeMethod, string> = {
  steps: 'I can’t count your steps',
  downtime: 'I can’t count your steps',
  place: 'I can’t see where you are',
  scan: 'I can’t see your code',
  pushups: 'I can’t see your push-ups',
  dance: 'I can’t see you dance',
};

/**
 * Home's problem hero while the wake-up's permission is refused (user 2026-11-08: Home acted
 * all set up with Motion off, and the morning would never wake the apps). Pure, for tests.
 */
export function wakeAccessHero(method: WakeMethod): { title: string; body: string } {
  return { title: SETTING[wakeNeedFor(method)], body: `${CANT[method]}, so your apps won’t wake.` };
}
