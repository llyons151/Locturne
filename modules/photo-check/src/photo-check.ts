import { requireOptionalNativeModule } from 'expo';

import type { BedReading } from '../../../src/lib/wake/bed';
import type { PetReading } from '../../../src/lib/wake/pet';
import type { PhotoReading } from '../../../src/lib/wake/photo';

type Raw = Omit<PhotoReading, 'brightness'> & { brightness?: number };

// Optional: web, the tests and builds from before 2026-11-21 have none.
const Native = requireOptionalNativeModule<{
  read?(uri: string): Promise<Raw>;
  readPet?(uri: string): Promise<Raw & Partial<PetReading>>;
  readBed?(uri: string, reference: string | null): Promise<Raw & Partial<BedReading>>;
}>('PhotoCheck');

/** Can this build read a wake-up photo? False on web and on older builds. */
export const photoCheckAvailable = (): boolean => !!Native?.read;

/** Can this build read a pet photo (2026-11-23)? */
export const petCheckAvailable = (): boolean => !!Native?.readPet;

/** Can this build read a bed photo (2026-11-23)? */
export const bedCheckAvailable = (): boolean => !!Native?.readBed;

/**
 * Reads a photo file on the phone (modules/photo-check/ios). Throws when it can't. `shotBrightness`:
 * the camera's own EXIF light reading, from takePictureAsync, for when the file's is missing.
 */
export async function readPhoto(uri: string, shotBrightness: number | null = null): Promise<PhotoReading> {
  if (!Native?.read) throw new Error('PhotoCheck is not in this build');
  const raw = await Native.read(uri);
  const brightness = typeof raw.brightness === 'number' && Number.isFinite(raw.brightness) ? raw.brightness : shotBrightness;
  return { ...raw, labels: raw.labels ?? [], brightness };
}

/** Reads a pet photo (PetReading.swift): the same reading plus the cats, dogs and hands Vision found. */
export async function readPetPhoto(uri: string, shotBrightness: number | null = null): Promise<PetReading> {
  if (!Native?.readPet) throw new Error('PhotoCheck has no pet reading in this build');
  const raw = await Native.readPet(uri);
  const brightness = typeof raw.brightness === 'number' && Number.isFinite(raw.brightness) ? raw.brightness : shotBrightness;
  return { ...raw, labels: raw.labels ?? [], brightness, animals: raw.animals ?? [], hands: raw.hands ?? [] };
}

/**
 * Reads a Make your bed photo (BedReading.swift) against `reference`, the made bed's setup photo: how
 * near the two are, how busy each is, and who's in it. No reference: the setup photo itself.
 */
export async function readBedPhoto(uri: string, reference: string | null, shotBrightness: number | null = null): Promise<BedReading> {
  if (!Native?.readBed) throw new Error('PhotoCheck has no bed reading in this build');
  const raw = await Native.readBed(uri, reference);
  const brightness = typeof raw.brightness === 'number' && Number.isFinite(raw.brightness) ? raw.brightness : shotBrightness;
  return { ...raw, labels: raw.labels ?? [], brightness, texture: raw.texture ?? 0, people: raw.people ?? 0 };
}
