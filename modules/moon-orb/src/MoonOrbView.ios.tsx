import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { MoonOrbViewProps } from './MoonOrbView.types';

export type { MoonOrbViewProps };

/**
 * False on a development build made before this module existed: its JS loads over Metro,
 * but the Swift isn't in the binary until the next `eas build`.
 */
export const isMoonOrbViewAvailable =
  globalThis.expo?.getViewConfig?.('MoonOrb') != null ||
  requireOptionalNativeModule('MoonOrb') != null;

const NativeView = isMoonOrbViewAvailable ? requireNativeView<MoonOrbViewProps>('MoonOrb') : null;

export function MoonOrbView(props: MoonOrbViewProps) {
  return NativeView ? <NativeView {...props} /> : null;
}
