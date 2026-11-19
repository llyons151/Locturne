import { useSegments } from 'expo-router';

/**
 * Pages that open over the tabs as a transparent overlay but cover them completely. Home stays mounted
 * and drawing under them, so its live Metal sky (30 fps) and the Sleep orb (60 fps) kept running behind
 * a page you can't see through; with the moons page's cards on top that read as lag (user 2026-11-19).
 */
const COVERING = new Set(['moon-page', 'settings']);

/** True while a page that hides the tabs entirely is on top: their live views hold their last frame. */
export function useTabsCovered(): boolean {
  const segments = useSegments() as string[];
  return COVERING.has(segments[0] ?? '');
}
