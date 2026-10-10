/**
 * Leave the house (GAME_PLAN, "Wake-up methods"): the person picks a place in the day (the
 * gym, campus, the café on the corner), and in the morning the apps wake once they're there.
 * An in-app check reads the location once, when they tap. When-In-Use permission only: no
 * background geofence, no tracking, and the location never leaves the phone.
 *
 * Rules:
 * - Only a fresh, accurate enough fix counts (`judgeFix`). A vague one (indoors, cell towers
 *   only) is "not sure yet", never a yes: from bed, a 1 km circle could cover the café.
 * - The place can only be picked or changed while the apps are awake (`day` or `off`), like
 *   the scan code: otherwise someone could pick their bedroom at 7am. Any change made in the
 *   day is in place before the next morning, so this is the next-bedtime rule.
 * - A check only unlocks in `morning`: bedtime wins.
 *
 * Judging is pure; the bottom of the file applies it. Reading the location is the screen's
 * job (features/place/locate.ts), so this file runs in the tests.
 */
import { judgedAt, pastLastPaid, readLock, syncLock } from './lock-controller.ts';
import { recordProof } from './morning-proof.ts';
import { getMorningPlace, PLACE_KEY, PLACE_RADIUS_M, type MorningPlace } from './place-spot.ts';
import { editRefusal } from './scan.ts';
import { sharedSet } from './screen-time.ts';

export type { MorningPlace } from './place-spot.ts';
export { getMorningPlace };

export { PLACE_RADIUS_M };
/** The vaguest fix that can say yes, in metres. iOS's Wi-Fi fixes indoors are usually 10-65. */
export const MAX_ACCURACY_M = 80;
/** How old a fix can be. iOS can hand back a cached one; an old fix may be from bed. */
export const MAX_FIX_AGE_MS = 60_000;

export type Fix = {
  latitude: number;
  longitude: number;
  /** The radius iOS is confident of, in metres; null when it didn't say. */
  accuracy: number | null;
  /** When iOS took the fix, in ms. */
  timestamp: number;
};

export type Judgement =
  | { kind: 'there'; distance: number }
  | { kind: 'notThere'; distance: number }
  /** Too vague or too old to tell. Try again, ideally outside. */
  | { kind: 'unsure'; distance: number | null };

/** Pure: great-circle distance between two points, in metres. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6_371_000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Pure: real coordinates, not the 0,0 a failed lookup can return. */
export function validSpot(spot: { latitude: number; longitude: number }): boolean {
  const { latitude, longitude } = spot;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/**
 * Pure: is this fix at the place? A vague fix can still say no when even its far edge is
 * outside the circle (you're clearly 3 km away), but only a sharp one can say yes.
 */
export function judgeFix(place: Pick<MorningPlace, 'latitude' | 'longitude'>, fix: Fix, now: Date): Judgement {
  if (!validSpot(fix)) return { kind: 'unsure', distance: null };
  const distance = distanceMeters(place, fix);
  const age = now.getTime() - fix.timestamp;
  // A few seconds into the future is clock skew between the GPS and the phone; more is odd.
  if (age > MAX_FIX_AGE_MS || age < -5_000) return { kind: 'unsure', distance };
  const accuracy = fix.accuracy;
  const sharp = accuracy !== null && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= MAX_ACCURACY_M;
  if (sharp) return distance <= PLACE_RADIUS_M ? { kind: 'there', distance } : { kind: 'notThere', distance };
  if (accuracy !== null && Number.isFinite(accuracy) && distance - accuracy > PLACE_RADIUS_M) return { kind: 'notThere', distance };
  return { kind: 'unsure', distance };
}

/** Pure: the trimmed name to save, or null when there's nothing usable. */
export function placeName(name: string): string | null {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return trimmed.length === 0 ? null : trimmed.slice(0, 60);
}

/* Applying it. */

/** Can the place be picked or changed right now? */
export function getPlaceEditRefusal(now = new Date()): 'asleep' | null {
  return editRefusal(readLock(now).phase);
}

/** Saves the place, unless the apps are asleep. Returns the refusal, or null once saved. */
export function saveMorningPlace(
  place: Omit<MorningPlace, 'savedAt'>,
  now = new Date(),
): 'asleep' | 'unusable' | null {
  const refusal = getPlaceEditRefusal(now);
  if (refusal) return refusal;
  const name = placeName(place.name);
  if (!name || !validSpot(place)) return 'unusable';
  sharedSet(PLACE_KEY, { name, latitude: place.latitude, longitude: place.longitude, savedAt: now.getTime() });
  // Tonight's shield said "walk" while there was no place; it now names the place.
  syncLock(now);
  return null;
}

export type PlaceCheck =
  | { kind: 'unlocked' }
  | { kind: 'notThere'; distance: number }
  | { kind: 'unsure'; distance: number | null }
  | { kind: 'noPlace' | 'notMorning' };

/** A morning check. A fix at the place records this morning's proof and wakes the apps. */
export function submitPlaceFix(fix: Fix, now = new Date()): PlaceCheck {
  const place = getMorningPlace();
  if (!place) return { kind: 'noPlace' };
  const state = readLock(now);
  // A morning after the last one a lapsed subscription covers holds nothing (`pastLastPaid`).
  if (state.phase !== 'morning' || pastLastPaid(state.morningKey)) return { kind: 'notMorning' };
  const judged = judgeFix(place, fix, now);
  if (judged.kind !== 'there') return judged;
  recordProof({ morningKey: state.morningKey, kind: 'place', at: now.getTime() }, judgedAt(now));
  syncLock(now);
  return { kind: 'unlocked' };
}
