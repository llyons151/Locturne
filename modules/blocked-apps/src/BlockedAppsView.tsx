import type { BlockedAppsViewProps } from './BlockedAppsView.types';

export type { BlockedAppsViewProps };

export const isBlockedAppsViewAvailable = false;

/** Screen Time is iOS-only; elsewhere there's nothing to draw. */
export function BlockedAppsView(_props: BlockedAppsViewProps) {
  return null;
}
