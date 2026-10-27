import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { DayDotsViewProps } from './DayDotsView.types';

export type { DayDotsViewProps };

/**
 * False on a development build made before this module existed: its JS loads over Metro,
 * but the Swift isn't in the binary until the next `eas build`.
 */
export const isDayDotsViewAvailable =
  globalThis.expo?.getViewConfig?.('DayDots') != null || requireOptionalNativeModule('DayDots') != null;

const NativeView = isDayDotsViewAvailable ? requireNativeView<DayDotsViewProps>('DayDots') : null;

export function DayDotsView(props: DayDotsViewProps) {
  return NativeView ? <NativeView {...props} /> : null;
}
