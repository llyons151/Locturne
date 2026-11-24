import { AppState } from 'react-native';
import { router } from 'expo-router';

import { getMorningsWon } from '@/lib/morning-proof';
import { sharedGet, sharedSet } from '@/lib/screen-time';

import { getWornMoon } from './moon-theme';

/**
 * Dev and preview builds: make a payoff play the shiny reveal without catching anything (user, 2026-11-23).
 * - `payoff`: the next payoff that opens (a real morning, a test lock's or the wake preview's) reveals the worn
 *   moon's shiny. Shown only: nothing is caught or switched on.
 * - `onOpen`: the next time the app opens (or comes back from the background), a pretend payoff with a shiny plays.
 */
const KEY = 'locturne.dev.shinyNext';
type Next = { payoff?: boolean; onOpen?: boolean };
const read = (): Next => sharedGet<Next>(KEY) ?? {};
const write = (next: Next) => sharedSet(KEY, next.payoff || next.onOpen ? next : null);

export function setShinyNext(part: Next) {
  write({ ...read(), ...part });
}
export const shinyNextOn = (): Next => read();

/** For the payoff's facts: the worn moon's id when the next payoff should be shiny. Read, not cleared (renders repeat). */
export function peekShinyPayoff(): string | null {
  return read().payoff ? getWornMoon().id : null;
}
/** Once the payoff that used it is on screen. */
export function clearShinyPayoff() {
  if (read().payoff) write({ ...read(), payoff: false });
}

let started = false;
/** Once, at launch: watches for the app opening while `onOpen` is set. */
export function startShinyDev() {
  if (started) return;
  started = true;
  const check = () => {
    if (!read().onOpen) return;
    write({ ...read(), onOpen: false });
    router.push({
      pathname: '/morning-won',
      params: { demo: '1', over: '1', newShiny: getWornMoon().id, mornings: String(getMorningsWon() + 1) },
    });
  };
  // After the first screen is up, then each time the app comes back.
  setTimeout(check, 1500);
  AppState.addEventListener('change', (s) => {
    if (s === 'active') setTimeout(check, 400);
  });
}
