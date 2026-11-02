import { Easing, withTiming } from 'react-native-reanimated';

import { MOON_SHOWS_FROM, moonSink } from '@/components/night-sky';

import { getWornMoon, setMoon } from './moon-theme';
import { locAway } from './moons-cover';

/** As long as coming back to Home from a tab that hid the moon (use-moon-sink.ts). */
const RISE_MS = 1600;

/**
 * Wears a moon picked in the collection, and the new one rises (user, 2026-11-01): the old moon
 * drops out of sight under the closing page, the moon is swapped, and it comes back up to where
 * it rested. Where the moon is already out of sight (the collection opened from You), it's just
 * swapped: it rises when you go back to Home. The moons page brings it back up itself, once it's down. Reduce Motion finishes the rise at once (Reanimated's default).
 */
export function wearAndRise(id: string) {
  if (getWornMoon().id === id) return;
  // The moons page took the moon away and brings it back as it closes (moons-page.tsx).
  if (locAway.get().away) return setMoon(id);
  const rest = moonSink.get();
  if (rest >= MOON_SHOWS_FROM) return setMoon(id);
  moonSink.set(MOON_SHOWS_FROM);
  setMoon(id);
  // No wait for the page to go, and no slow start: it moves the moment it's picked (user, 2026-11-01).
  moonSink.set(withTiming(rest, { duration: RISE_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) }));
}
