import { requireOptionalNativeModule } from 'expo';

import type { RemovedPick } from './BlockedAppsView.types';

const BlockedApps = requireOptionalNativeModule<{
  removePick(selectionId: string, kind: string, token: string): boolean;
}>('BlockedApps');

/** Takes one swiped-away pick out of a saved selection. False on an older build. */
export function removePick(selectionId: string, pick: RemovedPick): boolean {
  return BlockedApps?.removePick?.(selectionId, pick.kind, pick.token) ?? false;
}
