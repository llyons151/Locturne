import { useSegments } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Pages that open over the tabs as a transparent overlay but cover them completely. Home stays mounted
 * and drawing under them, so its live Metal sky (30 fps) and the Sleep orb (60 fps) kept running behind
 * a page you can't see through; with the moons page's cards on top that read as lag (user 2026-11-19).
 * The morning payoff is one too: it draws its own sky and moon over Home, so Home's ran twice over under it.
 */
const COVERING = new Set(['moon-page', 'settings', 'morning-won']);

// Covers that aren't routes (the nap clock's Modal), counted, as two could overlap for a frame.
let covers = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const readCovers = () => covers > 0;
const tell = () => listeners.forEach((listener) => listener());

/** While `on`, the tabs count as covered: for a full-screen Modal over them, which isn't a route. */
export function useCoverTabs(on: boolean) {
  useEffect(() => {
    if (!on) return;
    covers += 1;
    tell();
    return () => {
      covers -= 1;
      tell();
    };
  }, [on]);
}

/** True while a page that hides the tabs entirely is on top: their live views hold their last frame. */
export function useTabsCovered(): boolean {
  const segments = useSegments() as string[];
  const modal = useSyncExternalStore(subscribe, readCovers, readCovers);
  return modal || COVERING.has(segments[0] ?? '');
}
