import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { DanceRingViewProps } from './DanceRingView.types';

export type { DanceRingViewProps };

/**
 * False on a build made before this module existed: its JS loads over Metro, but the Swift isn't
 * in the binary until the next build. The caller draws its SVG ring then.
 */
export const isDanceRingViewAvailable =
  globalThis.expo?.getViewConfig?.('DanceRing') != null || requireOptionalNativeModule('DanceRing') != null;

const NativeView = isDanceRingViewAvailable ? requireNativeView<DanceRingViewProps>('DanceRing') : null;

export function DanceRingView(props: DanceRingViewProps) {
  return NativeView ? <NativeView {...props} /> : null;
}
