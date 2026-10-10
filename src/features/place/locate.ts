/**
 * The device half of Leave the house (src/lib/place.ts has the rules): one location read when
 * the person taps, and Apple Maps search for finding a place by name. When-In-Use only; nothing
 * here runs in the background or leaves the phone except Apple's own lookups (and, in the web
 * preview only, OpenStreetMap's Photon, since browsers have no MapKit).
 */
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { PLACE_RADIUS_M, validSpot, type Fix } from '@/lib/place';

import { PlaceSearch } from '../../../modules/place-search';

/** Why a read gave nothing: permission refused, Location Services off, or no answer in time. */
export type NoFix = 'denied' | 'off' | 'failed';

export type Located = { ok: true; fix: Fix } | { ok: false; why: NoFix };

/** A place found by search or by "use where I am now". */
export type Candidate = { name: string; address: string; latitude: number; longitude: number };

/** iOS can take a while for a first GPS fix outside; past this, say so instead of spinning. */
const READ_TIMEOUT_MS = 20_000;

/** Asks for When-In-Use if it hasn't been asked yet. True once granted. */
async function allowed(): Promise<boolean> {
  const now = await Location.getForegroundPermissionsAsync();
  if (now.granted) return true;
  if (!now.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

/** One fresh, precise read. Asks for permission the first time. */
export async function readFix(): Promise<Located> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, why: 'off' };
    if (!(await allowed())) return { ok: false, why: 'denied' };
    const read = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS));
    const position = await Promise.race([read, timeout]);
    if (!position) return { ok: false, why: 'failed' };
    const { latitude, longitude, accuracy } = position.coords;
    return { ok: true, fix: { latitude, longitude, accuracy, timestamp: position.timestamp } };
  } catch {
    return { ok: false, why: 'failed' };
  }
}

/** "12 Mill Road, Leeds", from what the geocoder knows. Empty when it knows nothing. */
function addressOf(found: Location.LocationGeocodedAddress | undefined): string {
  if (!found) return '';
  const street = [found.streetNumber, found.street].filter(Boolean).join(' ');
  return [street || found.name, found.city ?? found.subregion].filter(Boolean).join(', ');
}

/** Names a spot: the geocoder's name for it (a business, a building) or its street. */
export async function describe(spot: { latitude: number; longitude: number }): Promise<Omit<Candidate, 'latitude' | 'longitude'>> {
  try {
    // No reverse geocoder on the web: the preview asks Photon, as search does.
    if (Platform.OS === 'web') {
      const response = await fetch(`https://photon.komoot.io/reverse?lat=${spot.latitude}&lon=${spot.longitude}&lang=en`);
      const [first] = response.ok ? ((await response.json()) as { features: PhotonFeature[] }).features : [];
      return first ? photonCandidate(first) : { name: '', address: '' };
    }
    const [found] = await Location.reverseGeocodeAsync(spot);
    const address = addressOf(found);
    // A bare house number is what iOS calls a name when it has nothing better.
    const name = found?.name && !/^\d+$/.test(found.name) ? found.name : (found?.street ?? '');
    return { name, address };
  } catch {
    return { name: '', address: '' };
  }
}

/** Where they're standing now, named. For "use where I am now" in setup. */
export async function here(): Promise<{ ok: true; candidate: Candidate; fix: Fix } | { ok: false; why: NoFix }> {
  const located = await readFix();
  if (!located.ok) return located;
  const { latitude, longitude } = located.fix;
  return { ok: true, fix: located.fix, candidate: { ...(await describe(located.fix)), latitude, longitude } };
}

/** Where they last were, if location is already allowed: search ranks places near it first. Never asks. */
async function near(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 });
    return last ? { latitude: last.coords.latitude, longitude: last.coords.longitude } : null;
  } catch {
    return null;
  }
}

/**
 * Places matching what they typed: names ("Planet Fitness", "the library") as well as
 * addresses. On iOS it's Apple Maps search (modules/place-search). The web preview has no
 * MapKit, so it asks OpenStreetMap's Photon instead; an iOS build from before the module falls
 * back to Apple's geocoder, which only knows addresses.
 */
export async function search(query: string, limit = 6): Promise<Candidate[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    if (PlaceSearch) return (await PlaceSearch.search(trimmed, await near(), limit)).filter(validSpot);
    if (Platform.OS === 'web') return await photon(trimmed, limit, await near());
    // Android's geocoder needs the permission; iOS's doesn't.
    if (Platform.OS === 'android' && !(await allowed())) return [];
    const found = (await Location.geocodeAsync(trimmed)).slice(0, limit);
    return await Promise.all(
      found.map(async ({ latitude, longitude }) => {
        const { name, address } = await describe({ latitude, longitude });
        return { name: name || trimmed, address, latitude, longitude };
      }),
    );
  } catch {
    return [];
  }
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; street?: string; housenumber?: string; city?: string; state?: string; country?: string };
};

/** The web preview's search (photon.komoot.io: free, no key, made for search as you type). */
async function photon(query: string, limit: number, close: { latitude: number; longitude: number } | null): Promise<Candidate[]> {
  const bias = close ? `&lat=${close.latitude}&lon=${close.longitude}` : '';
  const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=en${bias}`);
  if (!response.ok) return [];
  const { features } = (await response.json()) as { features: PhotonFeature[] };
  return features
    .map((feature) => ({
      ...photonCandidate(feature),
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
    }))
    .filter((c) => c.name && validSpot(c));
}

function photonCandidate({ properties: p }: PhotonFeature): { name: string; address: string } {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const name = p.name ?? street;
  return { name, address: [street !== name ? street : '', p.city, p.state ?? p.country].filter(Boolean).join(', ') };
}

/** A dark map picture of the spot with the check-in radius drawn on, or null where there's no MapKit. */
export async function mapPicture(spot: { latitude: number; longitude: number }, width: number, height: number): Promise<string | null> {
  try {
    return (await PlaceSearch?.snapshot(spot.latitude, spot.longitude, PLACE_RADIUS_M, width, height)) ?? null;
  } catch {
    return null;
  }
}
