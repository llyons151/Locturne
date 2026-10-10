import { sharedGet } from './screen-time.ts';

/**
 * The saved morning place, apart from place.ts so the lock controller can read it (place.ts
 * imports the lock controller), as scan-code.ts does for the scan code.
 */
export type MorningPlace = {
  /** What the person called it, or the address it was found by ("Gym", "12 Mill Road"). */
  name: string;
  latitude: number;
  longitude: number;
  savedAt: number;
};

export const PLACE_KEY = 'locturne.morningPlace';

/** How close counts as there, in metres. Big enough for a campus gate or a gym's car park. */
export const PLACE_RADIUS_M = 120;

export function getMorningPlace(): MorningPlace | null {
  return sharedGet<MorningPlace>(PLACE_KEY) ?? null;
}
