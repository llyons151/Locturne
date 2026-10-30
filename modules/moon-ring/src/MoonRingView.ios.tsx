import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { MoonRingViewProps } from './MoonRingView.types';

export type { MoonRingViewProps };

/**
 * False on a build made before this module existed: its JS loads over Metro, but the Swift isn't
 * in the binary until the next `eas build`.
 */
export const isMoonRingViewAvailable =
  globalThis.expo?.getViewConfig?.('MoonRing') != null || requireOptionalNativeModule('MoonRing') != null;

const NativeView = isMoonRingViewAvailable ? requireNativeView<MoonRingViewProps>('MoonRing') : null;

export function MoonRingView(props: MoonRingViewProps) {
  return NativeView ? <NativeView {...props} /> : null;
}
