import { requireOptionalNativeModule } from 'expo';

const BlockedApps = requireOptionalNativeModule<{
  clock?(): { wall: number; monotonic: number };
}>('BlockedApps');

/** The wall clock and the time since boot, read together (src/lib/clock-guard.ts). Null on an older build. */
export function readDeviceClock(): { wall: number; monotonic: number } | null {
  return BlockedApps?.clock?.() ?? null;
}
