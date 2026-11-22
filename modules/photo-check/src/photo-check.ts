import { requireOptionalNativeModule } from 'expo';

import type { PhotoReading } from '../../../src/lib/wake/photo';

type Raw = Omit<PhotoReading, 'brightness'> & { brightness?: number };

// Optional: web, the tests and builds from before 2026-11-21 have none.
const Native = requireOptionalNativeModule<{ read?(uri: string): Promise<Raw> }>('PhotoCheck');

/** Can this build read a wake-up photo? False on web and on older builds. */
export const photoCheckAvailable = (): boolean => !!Native?.read;

/** Reads a photo file on the phone (modules/photo-check/ios). Throws when it can't. */
export async function readPhoto(uri: string): Promise<PhotoReading> {
  if (!Native?.read) throw new Error('PhotoCheck is not in this build');
  const raw = await Native.read(uri);
  return { ...raw, labels: raw.labels ?? [], brightness: typeof raw.brightness === 'number' ? raw.brightness : null };
}
