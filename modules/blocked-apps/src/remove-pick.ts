import type { RemovedPick } from './BlockedAppsView.types';

/** Screen Time is iOS-only; elsewhere there's nothing to remove. */
export function removePick(_selectionId: string, _pick: RemovedPick): boolean {
  return false;
}
