import type { Fix } from '@/lib/place';
import { getMorningPlace, type MorningPlace } from '@/lib/place-spot';
import { getScanCode, type ScanCode } from '@/lib/scan-code';

import type { Located } from '../../place/locate';
import { getWakePreview, pretendPhase, type WakePreview } from './wake-preview';

/**
 * FAKE data for the wake preview's pretend morning: a code and a place, used only when none is
 * really set up (a browser never has one) and "Stand-in code and place" is on. Named so the
 * screen says it: "Get to Fake gym."
 */
const STAND_IN_CODE: ScanCode = { kind: 'qr', data: 'LOCTURNE-FAKE-PREVIEW', type: 'qr', registeredAt: 0 };
const STAND_IN_PLACE: MorningPlace = { name: 'Fake gym', latitude: 51.5246, longitude: -0.0918, savedAt: 0 };

const standing = () => pretendPhase() !== null && getWakePreview().standIns;

/** The scan code a morning screen should use: the real one, or in a pretend morning the stand-in. */
export const shownScanCode = (): ScanCode | null => getScanCode() ?? (standing() ? STAND_IN_CODE : null);

/** The place a morning screen should use: the real one, or in a pretend morning the stand-in. */
export const shownPlace = (): MorningPlace | null => getMorningPlace() ?? (standing() ? STAND_IN_PLACE : null);

/** About 700 m north of the place: clearly not there. */
const AWAY = 0.0063;

/** The fake walk: from about 900 m south-west to the place in this long (brisk, for a preview). */
const WALK_MS = 45_000;
const WALK_FROM = { north: -0.0064, east: -0.0092 };
let walkStarted: number | null = null;

/** Starts the fake walk over, from the far end. */
export const startFakeWalk = () => {
  walkStarted = Date.now();
};

/**
 * FAKE live location for the morning's map (place-screen.tsx), now, or null when this fake
 * gives no fix. `walking` heads for the place and stops just inside its circle.
 */
export function fakeLiveFix(mode: Exclude<WakePreview['place'], 'real'>): Fix | null {
  const { latitude, longitude } = shownPlace() ?? STAND_IN_PLACE;
  const at = (north: number, east: number, accuracy: number): Fix => ({
    latitude: latitude + north,
    longitude: longitude + east,
    accuracy,
    timestamp: Date.now(),
  });
  switch (mode) {
    case 'walking': {
      const left = 1 - Math.min(1, (Date.now() - (walkStarted ?? Date.now())) / WALK_MS);
      // Ends about 40 m short of the middle: inside the circle.
      const share = 0.05 + 0.95 * left;
      return at(WALK_FROM.north * share, WALK_FROM.east * share, 8);
    }
    case 'there':
    case 'slow':
      return at(0.0002, 0, 12);
    case 'notThere':
      return at(AWAY, 0, 10);
    case 'unsure':
      return at(0.0015, 0, 400);
    default:
      return null;
  }
}

/**
 * FAKE location read for `readFix`, after a beat like a real GPS fix ('slow' spins for 4 s,
 * then lands there). Fixes are relative to the place shown, or the stand-in place's spot.
 */
export async function fakeFix(mode: Exclude<WakePreview['place'], 'real'>): Promise<Located> {
  await new Promise((resolve) => setTimeout(resolve, mode === 'slow' ? 4000 : 900));
  const { latitude, longitude } = shownPlace() ?? STAND_IN_PLACE;
  const fix = (lat: number, accuracy: number): Located => ({
    ok: true,
    fix: { latitude: lat, longitude, accuracy, timestamp: Date.now() } satisfies Fix,
  });
  switch (mode) {
    case 'walking': {
      // Wherever the fake walk has got to.
      const live = fakeLiveFix(mode)!;
      return { ok: true, fix: live };
    }
    case 'there':
    case 'slow':
      return fix(latitude + 0.0002, 12);
    case 'notThere':
      return fix(latitude + AWAY, 10);
    case 'unsure':
      // Vague and close: can't say yes, can't say no.
      return fix(latitude + 0.0015, 400);
    default:
      return { ok: false, why: mode };
  }
}
