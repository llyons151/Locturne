import { router } from 'expo-router';

import { getMorningsWon } from '@/lib/morning-proof';
import { sharedGet, sharedSet } from '@/lib/screen-time';

import { devEarnNext } from './moon-collection';
import { LADDER } from './moon-data';
import { LADDER_MORNINGS, RARE_MOONS } from './moon-ladder';

/**
 * Dev: "Unlock a moon, with the payoff" arms this, and the payoff plays the next time the app
 * opens (cold, or back from the background), so it feels like a real morning (user 2026-11-03:
 * "after I close out and reopen the app… not just a panel in settings"). The moon is earned when
 * it plays, not when it's armed.
 */
const KEY = 'locturne.dev.moonSimArmed';

export function armMoonSim() {
  sharedSet(KEY, true);
}

export function isMoonSimArmed(): boolean {
  return sharedGet<boolean>(KEY) === true;
}

/** Earns the next moon and opens its payoff over Home, if armed. Returns whether it did. */
export function playArmedMoonSim(): boolean {
  if (!isMoonSimArmed()) return false;
  sharedSet(KEY, false);
  const id = devEarnNext() ?? RARE_MOONS[0];
  const rung = LADDER.indexOf(id);
  const mornings = rung >= 0 && rung < LADDER_MORNINGS.length ? LADDER_MORNINGS[rung] : getMorningsWon() + 1;
  router.push({ pathname: '/morning-won', params: { demo: '1', over: '1', newMoon: id, mornings: String(mornings), method: 'steps' } });
  return true;
}
