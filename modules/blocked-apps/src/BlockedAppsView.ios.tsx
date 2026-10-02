import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { BlockedAppsViewProps } from './BlockedAppsView.types';

export type { BlockedAppsViewProps };

/**
 * False on a development build made before this module existed: its JS loads over Metro,
 * but the Swift isn't in the binary until the next `eas build`.
 */
export const isBlockedAppsViewAvailable =
  // The view registry is what drawing actually uses; the module lookup is a second opinion.
  globalThis.expo?.getViewConfig?.('BlockedApps') != null ||
  requireOptionalNativeModule('BlockedApps') != null;

const NativeView = isBlockedAppsViewAvailable
  ? requireNativeView<BlockedAppsViewProps>('BlockedApps')
  : null;

export function BlockedAppsView(props: BlockedAppsViewProps) {
  return NativeView ? <NativeView {...props} /> : null;
}
