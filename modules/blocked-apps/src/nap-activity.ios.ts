import { requireOptionalNativeModule } from 'expo';

const BlockedApps = requireOptionalNativeModule<{
  syncNapActivity?(startMs: number | null, endMs: number | null, moonFile: string | null): boolean;
}>('BlockedApps');

/**
 * Shows Block now's countdown in the Dynamic Island and on the Lock Screen until `end`, or
 * ends it with no nap. Safe to call as often as you like. False when iOS shows none (Live
 * Activities off, or a build from before the countdown).
 */
export function syncNapActivity(nap: { start: number; end: number } | null, moonFile: string | null): boolean {
  try {
    return BlockedApps?.syncNapActivity?.(nap?.start ?? null, nap?.end ?? null, moonFile) ?? false;
  } catch {
    return false;
  }
}
