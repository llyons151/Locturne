import { readLock } from '@/lib/lock-controller';
import { getMorningsWon, getProofs, onProofChange } from '@/lib/morning-proof';
import { getStreak } from '@/lib/streak';

import { ownsMoon } from './moon-collection';
import { DEFAULT_MOON, getWornMoon } from './moon-theme';
import { settleShinies } from './shiny-store';

/**
 * Rolls each morning for the worn moon's shiny (shiny.ts), once a morning: when a wake-up is recorded
 * with the app open, and when the payoff, Home or the moon page settles. Kept apart from the moon
 * store (moon-collection.ts) so that store's tests needn't know about the streak or the worn moon.
 */
export function settleShinyNow(now = Date.now()): string | null {
  const latest = getProofs()
    .filter((p) => p.kind !== 'pass' && p.kind !== 'emergency')
    .sort((a, b) => b.at - a.at)[0];
  if (!latest) return null;
  const worn = getWornMoon().id;
  return settleShinies({
    worn,
    // Moonlight you start with; every other moon only once it's unlocked.
    owned: worn === DEFAULT_MOON.id || ownsMoon(worn),
    mornings: getMorningsWon(),
    latest: latest.morningKey,
    streak: getStreak(readLock().morningKey),
    now,
  });
}

let started = false;
/** Once, at launch: a wake-up recorded while the app is open rolls at once. */
export function startShinyHunt() {
  if (started) return;
  started = true;
  onProofChange(() => void settleShinyNow());
  settleShinyNow();
}
