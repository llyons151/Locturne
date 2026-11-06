import { router } from 'expo-router';

import { currentProof, readLock, routineAt } from '@/lib/lock-controller';
import { getMorningsWon } from '@/lib/morning-proof';
import type { WakeMethod } from '@/lib/routine';
import { sharedGet, sharedSet } from '@/lib/screen-time';

import { getWakePreview } from '../dev/wake-lab/wake-preview';
import { markLocSaid } from '../home/loc';

/** The morning key whose payoff was last shown: each morning's opens once. */
const PAYOFF_KEY = 'locturne.payoffShown';

/** The pretend morning's win last opened (its `won.at`): each opens the payoff once. */
let pretendShown = 0;

/**
 * `replace`: from a camera over Home (a scan), which the payoff takes the place of, so the morning
 * goes straight from the camera to the payoff with no Home in between (user 2026-10-28), and Done
 * still lands on Home. `cut` drops the payoff's fade in, as the camera is already showing.
 */
type How = 'push' | 'replace';

/** The morning key whose payoff was opened this launch, before it's on screen: Home re-focusing doesn't open a second. */
let opening: string | null = null;

/**
 * Opens the payoff for the real morning keyed `key`, once. False if it was already shown.
 * `cut`: no fade in. Always for `replace` (a camera already covers Home); also when the app is
 * just opening or coming back to the front (`openDuePayoff`), so it starts on the payoff.
 */
export function openPayoff(key: string, how: How = 'push', cut = how === 'replace'): boolean {
  if (opening === key || sharedGet<string>(PAYOFF_KEY) === key) return false;
  // Saved only once it's on screen (`markPayoffShown`): an app killed in between gets it next launch.
  opening = key;
  router[how]({ pathname: '/morning-won', params: cut ? { cut: '1' } : {} });
  return true;
}

/** A wake-up older than this, found on opening the app, gets Home's done look but no payoff. */
export const PAYOFF_FOR = 15 * 60_000;

/** The real morning won in the last `PAYOFF_FOR` (not a pass) whose payoff hasn't shown, or null. */
export function duePayoffKey(now = new Date()): string | null {
  const proof = currentProof(now);
  if (!proof || proof.kind === 'pass' || proof.kind === 'emergency' || now.getTime() - proof.at > PAYOFF_FOR) return null;
  return opening === proof.morningKey || sharedGet<string>(PAYOFF_KEY) === proof.morningKey ? null : proof.morningKey;
}

/**
 * At launch, or back to the front, after a wake-up done away from Home (the shield's "I'm up",
 * or the app killed mid-walk): straight onto the payoff with no fade, so Home never shows first
 * and then cuts to it (user 2026-11-05). True if it opened.
 */
export function openDuePayoff(): boolean {
  const key = duePayoffKey();
  return !!key && openPayoff(key, 'push', true);
}

/** The payoff for the real morning keyed `key` is on screen (morning-won.tsx): it never opens again. */
export function markPayoffShown(key: string) {
  if (sharedGet<string>(PAYOFF_KEY) === key) return;
  sharedSet(PAYOFF_KEY, key);
  // Loc's wake-up line on Home counts as said: the payoff is the moment.
  markLocSaid(`woke:${key}`);
}

/** The payoff for the real morning under way, as the camera closes on its win. */
export function openPayoffNow(how: How = 'replace'): boolean {
  return openPayoff(readLock().morningKey, how);
}

/**
 * Dev: the payoff for a pretend morning's win (the wake preview records nothing), with made-up
 * facts for the method that won, the time now and the real count plus this one. Once per win.
 */
export function openPretendPayoff(how: How = 'push'): boolean {
  const { won } = getWakePreview();
  if (!won || pretendShown === won.at) return false;
  pretendShown = won.at;
  const at = new Date(won.at);
  const upAt = at.getHours() * 60 + at.getMinutes();
  // A pretend morning runs at any hour: past three hours after the real morning start, call it on time.
  const start = routineAt(at).morningStart;
  router[how]({
    pathname: '/morning-won',
    params: {
      demo: '1',
      method: won.method satisfies WakeMethod,
      at: String(upAt),
      start: String(upAt >= start && upAt - start <= 180 ? start : upAt),
      mornings: String(getMorningsWon() + 1),
      ...(how === 'replace' ? { cut: '1' } : {}),
    },
  });
  return true;
}
