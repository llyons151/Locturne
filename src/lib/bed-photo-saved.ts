import { sharedGet } from './screen-time.ts';

/**
 * Make your bed's setup photo (wake/bed.ts), apart from bed-photo.ts so the lock controller can read it
 * (bed-photo.ts imports the lock controller), as scan-code.ts is apart from scan.ts. Only when it was
 * saved: the photo itself is a file in the app's documents (`BED_PHOTO_FILE`), never uploaded. Its full
 * path isn't kept, because the app's folder can move on an update.
 */
export type BedPhoto = { savedAt: number };

export const BED_PHOTO_KEY = 'locturne.bedPhoto';

/** The setup photo's file name, in the app's documents folder. */
export const BED_PHOTO_FILE = 'made-bed.jpg';

export function getBedPhoto(): BedPhoto | null {
  return sharedGet<BedPhoto>(BED_PHOTO_KEY) ?? null;
}

const listeners = new Set<() => void>();

/** Hears a bed photo saved (`saveBedPhoto`). Returns the unsubscribe. */
export function onBedPhotoChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function bedPhotoChanged(): void {
  for (const listener of listeners) listener();
}
