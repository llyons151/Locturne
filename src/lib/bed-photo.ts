/**
 * Make your bed's setup photo (wake/bed.ts): the bed, made, from where you'll stand each morning.
 * Like the scan code (scan.ts), it can only be set or changed while the apps are awake (`day` or
 * `off`): otherwise the unmade bed could be saved as the made one at 7am. A change made in the day is
 * in place before the next morning. Until there is one, a bed morning walks (`methodInUse`).
 */
import { BED_PHOTO_KEY, bedPhotoChanged, getBedPhoto, type BedPhoto } from './bed-photo-saved.ts';
import { readLock, syncLock } from './lock-controller.ts';
import { editRefusal } from './scan.ts';
import { sharedSet } from './screen-time.ts';

export { getBedPhoto, type BedPhoto };

/** Can the bed photo be set or changed right now? */
export function getBedEditRefusal(now = new Date()): 'asleep' | null {
  return editRefusal(readLock(now).phase);
}

/**
 * Notes the setup photo saved (its file is already in place: features/photo/bed-reference.ts), unless the
 * apps are asleep. Returns the refusal, or null once saved.
 */
export function noteBedPhoto(now = new Date()): 'asleep' | null {
  const refusal = getBedEditRefusal(now);
  if (refusal) return refusal;
  sharedSet(BED_PHOTO_KEY, { savedAt: now.getTime() } satisfies BedPhoto);
  // Tonight's shield said "walk" while there was no photo; it now says "make your bed".
  syncLock(now);
  bedPhotoChanged();
  return null;
}
