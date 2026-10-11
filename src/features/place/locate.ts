/**
 * The device half of Leave the house (src/lib/place.ts has the rules): one location read when
 * the person taps, and Apple Maps search for finding a place by name. When-In-Use only; nothing
 * here runs in the background or leaves the phone except Apple's own lookups (and, in the web
 * preview only, OpenStreetMap's Photon, since browsers have no MapKit).
 */
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { accessFrom, fixToSave, PLACE_RADIUS_M, validSpot, type Access, type Fix } from '@/lib/place';

import { PlaceSearch, type SearchError } from '../../../modules/place-search';

/**
 * Why a read gave nothing: permission refused (`denied`), not the person's to give
 * (`restricted`: Screen Time or a managed phone), Approximate Location on (`imprecise`),
 * Location Services off, or no answer in time (`failed`). `vague`: a fix came, but too fuzzy or
 * old to save as the place (setup only; the morning check judges it instead).
 */
export type NoFix = 'denied' | 'restricted' | 'imprecise' | 'off' | 'failed' | 'vague';

export type Located = { ok: true; fix: Fix } | { ok: false; why: NoFix };

/** A place found by search or by "use where I am now". */
export type Candidate = { name: string; address: string; latitude: number; longitude: number };

/** iOS can take a while for a first GPS fix outside; past this, say so instead of spinning. */
const READ_TIMEOUT_MS = 20_000;

/** Location access now, asking for When-In-Use first if `ask` and it hasn't been asked yet. */
async function access(ask: boolean): Promise<Access> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && permission.canAskAgain && ask) permission = await Location.requestForegroundPermissionsAsync();
  // Only iOS tells restricted apart from denied, and only through our own module.
  const ios = permission.granted ? null : ((await PlaceSearch?.locationAccess().catch(() => null)) ?? null);
  return accessFrom(permission, ios);
}

/** Resolves null after `ms`, and clears its timer once `work` settles. */
async function within<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** One fresh, precise read. Asks for permission the first time. */
export async function readFix(): Promise<Located> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, why: 'off' };
    const allowed = await access(true);
    if (allowed === 'imprecise' || allowed === 'restricted') return { ok: false, why: allowed };
    if (allowed !== 'granted') return { ok: false, why: 'denied' };
    const position = await within(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), READ_TIMEOUT_MS);
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

/**
 * Where they're standing now, named. For "use where I am now" in setup: only a fresh, sharp fix
 * (`fixToSave`), or the place would be saved off by as much as the fix was.
 */
export async function here(): Promise<{ ok: true; candidate: Candidate; fix: Fix } | { ok: false; why: NoFix }> {
  const located = await readFix();
  if (!located.ok) return located;
  if (fixToSave(located.fix, new Date()) !== 'ok') return { ok: false, why: 'vague' };
  const { latitude, longitude } = located.fix;
  return { ok: true, fix: located.fix, candidate: { ...(await describe(located.fix)), latitude, longitude } };
}

type Spot = { latitude: number; longitude: number };

/** Where `near` last found them, and when, so typing doesn't read the location on every search. */
let nearCache: { spot: Spot; at: number } | null = null;
const NEAR_REUSE_MS = 5 * 60_000;
/** A rough read for ranking search results: quick, or not at all. */
const NEAR_TIMEOUT_MS = 4_000;

/**
 * Roughly where they are, if location is already allowed (Approximate counts): search leans
 * toward it, and results show how far away they are. Never asks for permission: a search
 * shouldn't put up a location prompt. A recent known position if there is one, else one quick
 * low-accuracy read.
 */
export async function near(): Promise<Spot | null> {
  if (nearCache && Date.now() - nearCache.at < NEAR_REUSE_MS) return nearCache.spot;
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const last =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 })) ??
      (await within(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), NEAR_TIMEOUT_MS));
    if (!last) return null;
    const spot = { latitude: last.coords.latitude, longitude: last.coords.longitude };
    if (!validSpot(spot)) return null;
    nearCache = { spot, at: Date.now() };
    return spot;
  } catch {
    return null;
  }
}

/**
 * What a search found. `from`: where they roughly are, when known, for showing distances.
 * `trouble`: `offline` when the search couldn't reach Apple (or Photon), so "nothing found"
 * would be wrong; `stale` when a newer search replaced this one.
 */
export type Found = { places: Candidate[]; from: Spot | null; trouble: 'offline' | 'stale' | null };

/**
 * Places matching what they typed: names ("Planet Fitness", "the library") as well as
 * addresses. On iOS it's Apple Maps search (modules/place-search), in Apple's order: relevance,
 * leaning toward where they are when that's known. The web preview has no MapKit, so it asks
 * OpenStreetMap's Photon instead; an iOS build from before the module falls back to Apple's
 * geocoder, which only knows addresses.
 */
export async function search(query: string, limit = 6): Promise<Found> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { places: [], from: null, trouble: null };
  const from = await near();
  try {
    if (PlaceSearch) {
      const { places, error } = await PlaceSearch.search(trimmed, from, limit);
      return { places: places.filter(validSpot), from, trouble: troubleOf(error) };
    }
    if (Platform.OS === 'web') return { places: await photon(trimmed, limit, from), from, trouble: null };
    // Android's geocoder needs the permission; iOS's doesn't.
    if (Platform.OS === 'android' && !['granted', 'imprecise'].includes(await access(true))) {
      return { places: [], from, trouble: null };
    }
    const found = (await Location.geocodeAsync(trimmed)).slice(0, limit);
    const places = await Promise.all(
      found.map(async ({ latitude, longitude }) => {
        const { name, address } = await describe({ latitude, longitude });
        return { name: name || trimmed, address, latitude, longitude };
      }),
    );
    return { places, from, trouble: null };
  } catch (error) {
    // fetch (the web preview's Photon) rejects with a TypeError when there's no connection.
    return { places: [], from, trouble: error instanceof TypeError ? 'offline' : null };
  }
}

function troubleOf(error: SearchError | null): Found['trouble'] {
  if (error === 'offline') return 'offline';
  if (error === 'cancelled') return 'stale';
  return null;
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
