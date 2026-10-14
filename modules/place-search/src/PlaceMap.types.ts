import type { StyleProp, ViewStyle } from 'react-native';

import type { FoundPlace } from '../index';

/** Fly here when `key` changes. `span`: metres from the top of the map to the bottom. */
export type MapTarget = { latitude: number; longitude: number; span: number; key: string };

export type PlaceMapProps = {
  /** The check-in circle around the pin, in metres. */
  radius: number;
  target: MapTarget | null;
  /** The person started dragging the map. */
  onMoveStart?: () => void;
  /** The map stopped. `byUser`: a drag or pinch put it there, not a `target`. */
  onSettle?: (spot: { latitude: number; longitude: number; byUser: boolean }) => void;
  /** A business on the map was tapped; the map is already flying to it. */
  onPoiPress?: (place: FoundPlace) => void;
  style?: StyleProp<ViewStyle>;
};
