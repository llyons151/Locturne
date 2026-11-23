/**
 * Make your bed's setup photo on disk (lib/bed-photo.ts keeps the rules): the made bed, kept in the app's
 * documents folder and never uploaded. Each morning's photo is read against it (modules/photo-check).
 */
import { File, Paths } from 'expo-file-system';

import { getBedEditRefusal, noteBedPhoto } from '@/lib/bed-photo';
import { BED_PHOTO_FILE, getBedPhoto } from '@/lib/bed-photo-saved';

const bedPhotoFile = () => new File(Paths.document, BED_PHOTO_FILE);

/** The setup photo's uri, or null when none is saved or its file is gone. */
export function bedReferenceUri(): string | null {
  if (!getBedPhoto()) return null;
  try {
    const file = bedPhotoFile();
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Keeps the photo at `uri` as the made bed, unless the apps are asleep. Null once kept. */
export async function keepBedPhoto(uri: string): Promise<'asleep' | null> {
  if (getBedEditRefusal()) return 'asleep';
  await new File(uri).copy(bedPhotoFile(), { overwrite: true });
  return noteBedPhoto();
}
