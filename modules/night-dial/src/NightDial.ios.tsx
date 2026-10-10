import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { NativeSyntheticEvent } from 'react-native';

import type { NativeNightDialProps } from './NightDial.types';

export type { NativeNightDialProps };

/** Height under the dial for the bedtime and morning-start columns. Matches `rowHeight` in Swift. */
export const NIGHT_DIAL_ROW = 72;

/**
 * False on a development build made before this module existed: its JS loads over Metro,
 * but the Swift isn't in the binary until the next `eas build`.
 */
export const isNightDialAvailable =
  globalThis.expo?.getViewConfig?.('NightDial') != null || requireOptionalNativeModule('NightDial') != null;

type Times = { bedtime: number; morningStart: number };
type NativeProps = Omit<NativeNightDialProps, 'onChange'> & {
  onTimesChange: (e: NativeSyntheticEvent<Times>) => void;
};
const NativeView = isNightDialAvailable ? requireNativeView<NativeProps>('NightDial') : null;

export function NativeNightDial({ onChange, ...rest }: NativeNightDialProps) {
  if (!NativeView) return null;
  return (
    <NativeView
      {...rest}
      onTimesChange={(e) => onChange({ bedtime: e.nativeEvent.bedtime, morningStart: e.nativeEvent.morningStart })}
    />
  );
}
