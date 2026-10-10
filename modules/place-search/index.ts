import { requireOptionalNativeModule } from 'expo';

export type FoundPlace = { name: string; address: string; latitude: number; longitude: number };

/**
 * Apple Maps search and a map picture, for picking the morning place
 * (ios/PlaceSearchModule.swift). Null off iOS, or on a build from before it was added.
 */
export const PlaceSearch = requireOptionalNativeModule<{
  search: (query: string, near: { latitude: number; longitude: number } | null, limit: number) => Promise<FoundPlace[]>;
  /** A file URI of the PNG, or null when the map couldn't be drawn. */
  snapshot: (latitude: number, longitude: number, radius: number, width: number, height: number) => Promise<string | null>;
}>('PlaceSearch');
