/**
 * The photo wake-ups in one place, for the camera screen (features/photo): Touch grass and Sunlight
 * (photo.ts), Pet your pet (pet.ts) and Make your bed (bed.ts, whose setup photo is judged here too).
 * Which rules judge a shot, and Loc's words on a miss.
 */
import { bedMissWords, judgeBed, judgeBedSetup, type BedReading } from './bed.ts';
import { judgePet, petMissWords, type PetReading } from './pet.ts';
import { judgePhoto, missWords, type PhotoKind, type PhotoReading } from './photo.ts';

export type ShotKind = PhotoKind | 'pet' | 'bed';

/** What modules/photo-check reads: the pet photo's reading also has its animals and hands, the bed's its match. */
export type ShotReading = PhotoReading | PetReading | BedReading;

export type ShotVerdict = { ok: true; why: string } | { ok: false; miss: string; words: { line: string; body: string } };

export const isShotKind = (method: string): method is ShotKind => method === 'grass' || method === 'sun' || method === 'pet' || method === 'bed';

/**
 * Pure: judge a shot by its way's rules. `setup`: Make your bed's setup photo (any empty bed), not a
 * morning. A reading from an older build missing the newer numbers sees nothing.
 */
export function judgeShot(kind: ShotKind, reading: ShotReading, setup = false): ShotVerdict {
  if (kind === 'pet') {
    const r = reading as Partial<PetReading> & PhotoReading;
    const verdict = judgePet({ ...r, animals: r.animals ?? [], hands: r.hands ?? [] });
    return verdict.ok ? verdict : { ok: false, miss: verdict.miss, words: petMissWords(verdict.miss) };
  }
  if (kind === 'bed') {
    const r = reading as Partial<BedReading> & PhotoReading;
    const read = { ...r, texture: r.texture ?? 0, people: r.people ?? 0 };
    const verdict = setup ? judgeBedSetup(read) : judgeBed(read);
    return verdict.ok ? verdict : { ok: false, miss: verdict.miss, words: bedMissWords(verdict.miss, setup) };
  }
  const verdict = judgePhoto(kind, reading);
  return verdict.ok ? verdict : { ok: false, miss: verdict.miss, words: missWords(kind, verdict.miss) };
}
