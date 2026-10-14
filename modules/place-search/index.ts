import { requireOptionalNativeModule } from 'expo';

export type FoundPlace = { name: string; address: string; latitude: number; longitude: number };

/** Why a search came back empty: nothing matched, no connection, a newer search replaced it, or another failure. */
export type SearchError = 'none' | 'offline' | 'cancelled' | 'failed';

/** A suggestion as you type: what Maps would show in its list. `resolve` finds where it is. */
export type Suggestion = { id: string; title: string; subtitle: string };

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
  /** Suggestions as you type, as the Maps app's search field gives them. Missing on builds before 2026-10-13. */
  suggest?: (
    query: string,
    near: { latitude: number; longitude: number } | null,
  ) => Promise<{ suggestions: Suggestion[]; error: SearchError | null }>;
  /** Where a suggestion is, by its id; null if it's from an older answer or can't be placed. */
  resolve?: (id: string) => Promise<FoundPlace | null>;
  /** A file URI of the PNG, or null when the map couldn't be drawn. */
  snapshot: (latitude: number, longitude: number, radius: number, width: number, height: number) => Promise<string | null>;
  /** A plain dark map of the region `span` metres tall, nothing drawn on it. Missing on builds before 2026-10-11. */
  area?: (latitude: number, longitude: number, span: number, width: number, height: number) => Promise<string | null>;
  /** iOS's own location access, which tells "restricted" apart from "denied" (expo-location folds them). */
  locationAccess: () => Promise<'restricted' | 'denied' | 'notDetermined' | 'granted'>;
}>('PlaceSearch');

export { PlaceMap, isPlaceMapAvailable } from './src/PlaceMap';
export type { MapTarget, PlaceMapProps } from './src/PlaceMap.types';
