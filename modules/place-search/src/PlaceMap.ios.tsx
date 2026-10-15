import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { NativeSyntheticEvent } from 'react-native';

import type { FoundPlace } from '../index';
import type { PlaceMapProps } from './PlaceMap.types';

/**
 * False on a development build made before the map existed: the JS loads over Metro, but the
 * Swift (ios/PlaceMapView.swift) isn't in the binary until the next `eas build`. Looked up here,
 * not imported from ../index: index re-exports this file, so its `PlaceSearch` isn't set yet
 * when this runs, and the map read as missing on every build (2026-10-14).
 */
export const isPlaceMapAvailable = requireOptionalNativeModule<{ suggest?: unknown }>('PlaceSearch')?.suggest != null;

type Spot = { latitude: number; longitude: number; byUser: boolean };
type NativeProps = Omit<PlaceMapProps, 'onSettle' | 'onPoiPress' | 'onMoveStart'> & {
  onSettle: (e: NativeSyntheticEvent<Spot>) => void;
  onPoiPress: (e: NativeSyntheticEvent<FoundPlace>) => void;
  onMoveStart: () => void;
};
const NativeView = isPlaceMapAvailable ? requireNativeView<NativeProps>('PlaceSearch') : null;

/** Apple's map with a pin fixed in the middle and the check-in circle round it (PlaceMapView.swift). */
export function PlaceMap({ onSettle, onPoiPress, onMoveStart, ...rest }: PlaceMapProps) {
  if (!NativeView) return null;
  return (
    <NativeView
      {...rest}
      onSettle={(e) => onSettle?.(e.nativeEvent)}
      onPoiPress={(e) => onPoiPress?.(e.nativeEvent)}
      onMoveStart={() => onMoveStart?.()}
    />
  );
}
