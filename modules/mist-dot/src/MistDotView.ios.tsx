import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { MistDotViewProps } from './MistDotView.types';

export type { MistDotViewProps };

/**
 * False on a development build made before this module existed: its JS loads over Metro,
 * but the Swift isn't in the binary until the next `eas build`.
 */
export const isMistDotViewAvailable =
  globalThis.expo?.getViewConfig?.('MistDot') != null ||
  requireOptionalNativeModule('MistDot') != null;

const NativeView = isMistDotViewAvailable ? requireNativeView<MistDotViewProps>('MistDot') : null;

export function MistDotView(props: MistDotViewProps) {
  return NativeView ? <NativeView {...props} /> : null;
}
