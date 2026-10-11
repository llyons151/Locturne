import { requireOptionalNativeModule } from 'expo';

export type FoundPlace = { name: string; address: string; latitude: number; longitude: number };

/** Why a search came back empty: nothing matched, no connection, a newer search replaced it, or another failure. */
export type SearchError = 'none' | 'offline' | 'cancelled' | 'failed';

/**
 * Apple Maps search and a map picture, for picking the morning place
 * (ios/PlaceSearchModule.swift). Null off iOS, or on a build from before it was added.
 */
export const PlaceSearch = requireOptionalNativeModule<{
  /** Places in Apple's order (relevance, biased toward `near`), and why there are none. */
  search: (
    query: string,
    near: { latitude: number; longitude: number } | null,
    limit: number,
  ) => Promise<{ places: FoundPlace[]; error: SearchError | null }>;
  /** A file URI of the PNG, or null when the map couldn't be drawn. */
  snapshot: (latitude: number, longitude: number, radius: number, width: number, height: number) => Promise<string | null>;
  /** iOS's own location access, which tells "restricted" apart from "denied" (expo-location folds them). */
  locationAccess: () => Promise<'restricted' | 'denied' | 'notDetermined' | 'granted'>;
}>('PlaceSearch');
