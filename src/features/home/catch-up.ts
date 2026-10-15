import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** How long after coming back to the foreground Home's changes land without animating. */
const CATCH_UP_MS = 1500;

/**
 * True while the app is away and for a moment after it comes back. Home's first frames on
 * return are what it showed when it left (the countdown, even the state, as of hours ago);
 * the new minute, the health check and the lock sync then land one after another. Animated,
 * that read as the words glitching on open (user, 2026-10-15): the old state fading out, digits
 * rolling from the old countdown. While this is true they change in place instead.
 */
export function useCatchingUp(): boolean {
  const [catching, setCatching] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = AppState.addEventListener('change', (state) => {
      clearTimeout(timer);
      if (state === 'active') timer = setTimeout(() => setCatching(false), CATCH_UP_MS);
      else setCatching(true);
    });
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, []);
  return catching;
}
