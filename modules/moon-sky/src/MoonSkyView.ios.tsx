import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { MoonSkyViewProps } from './MoonSkyView.types';

export type { MoonSkyViewProps };

/**
 * False on a build made before this module existed: its JS loads over Metro, but the Swift isn't
 * in the binary until the next `eas build`.
 */
export const isMoonSkyViewAvailable =
  globalThis.expo?.getViewConfig?.('MoonSky') != null || requireOptionalNativeModule('MoonSky') != null;

const NativeView = isMoonSkyViewAvailable ? requireNativeView<MoonSkyViewProps>('MoonSky') : null;

export function MoonSkyView(props: MoonSkyViewProps) {
  return NativeView ? <NativeView {...props} /> : null;
}
