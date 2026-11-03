import { requireOptionalNativeModule } from 'expo';

const BlockedApps = requireOptionalNativeModule<{ denyAppRemoval?(deny: boolean): void }>('BlockedApps');

/** Refuses or allows deleting apps (src/lib/screen-time.ts `applyAppRemoval`). Does nothing on an older build. */
export function denyAppRemoval(deny: boolean): void {
  BlockedApps?.denyAppRemoval?.(deny);
}
