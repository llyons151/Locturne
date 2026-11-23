/**
 * Make your bed (2026-11-23): the morning is a photo of your bed, made. At setup (in the day, never
 * from bed: bed-photo.ts) you photograph it made; each morning's photo has to be that bed, from
 * about the same spot, as smooth as it was, and empty. Read on the phone (modules/photo-check,
 * BedReading.swift); this file decides. Pure, so the rules are tested without a phone, and tuned
 * on real photos run through the same Swift on a Mac (tools/photo-check).
 *
 * - Your bed: Apple's image fingerprint of this photo is near the setup photo's (`match`). Another
 *   bed, another room, or the ceiling is far.
 * - Made: the photo is no busier than the setup photo, give or take (`texture`). A thrown-back
 *   duvet, a pile of clothes and creases add edges a made bed doesn't have.
 * - Empty: nobody lying in it (`people`).
 * - A bed at all, not a screen, not a black frame.
 */
import { labelScore, ofAScreen, type PhotoReading } from './photo.ts';

export type BedReading = PhotoReading & {
  /** Feature-print distance to the setup photo: 0 is the same picture. Missing at setup, or when Vision couldn't. */
  match?: number;
  /** Mean edge strength of the middle of this photo, 0 to 1. */
  texture: number;
  /** The setup photo's, read the same way. */
  refTexture?: number;
  /** People Vision sees in the photo. */
  people: number;
  /** The setup photo is gone (it couldn't be read). */
  refMissing?: boolean;
};

export type BedMiss = 'tooDark' | 'screen' | 'noBed' | 'someone' | 'notYours' | 'unmade' | 'noSetup';

export type BedVerdict = { ok: true; why: string } | { ok: false; miss: BedMiss };

const BED = ['bed', 'bedroom', 'bedding', 'duvet', 'quilt', 'mattress', 'headboard', 'pillow', 'bedspread', 'sheet', 'blanket'];

export const BED_RULES = {
  /** A bed label this sure: there's a bed in the photo. */
  bedLabel: 0.2,
  /**
   * Fingerprint distance to the setup photo at most this: the same bed, from about the same spot. On real
   * photos (tools/photo-check, 2026-11-23): the same bed shot again 0.14–0.34, from a clearly other angle
   * 0.45–0.55, another bed 0.65 and up, a rumpled bed of the same hotel style as the setup one 0.54.
   */
  match: 0.5,
  /**
   * This photo's texture at most this many times the setup photo's: as smooth as it was made. A weak
   * second check: on real photos some unmade beds read as smooth as made ones, so `match` does most of
   * the work. For the same reason setup can't refuse an unmade bed: the bar is what you photograph.
   */
  texture: 1.35,
  /** ...and at most this much above it, so a near-flat setup photo doesn't make every crease fail. */
  textureSlack: 0.012,
  dark: 0.06,
} as const;

/** Pure: can this photo be the made bed's setup photo? */
export function judgeBedSetup(r: BedReading): BedVerdict {
  if (r.mean < BED_RULES.dark) return { ok: false, miss: 'tooDark' };
  if (ofAScreen(r)) return { ok: false, miss: 'screen' };
  if (labelScore(r.labels, BED) < BED_RULES.bedLabel) return { ok: false, miss: 'noBed' };
  if (r.people > 0) return { ok: false, miss: 'someone' };
  return { ok: true, why: 'a bed, empty' };
}

/** Pure: is this morning's photo the setup bed, made and empty? */
export function judgeBed(r: BedReading): BedVerdict {
  if (r.mean < BED_RULES.dark) return { ok: false, miss: 'tooDark' };
  if (ofAScreen(r)) return { ok: false, miss: 'screen' };
  if (r.refMissing || r.refTexture === undefined) return { ok: false, miss: 'noSetup' };
  if (r.people > 0) return { ok: false, miss: 'someone' };
  if (r.match === undefined || r.match > BED_RULES.match)
    return { ok: false, miss: labelScore(r.labels, BED) < BED_RULES.bedLabel ? 'noBed' : 'notYours' };
  if (r.texture > r.refTexture * BED_RULES.texture && r.texture > r.refTexture + BED_RULES.textureSlack) return { ok: false, miss: 'unmade' };
  return { ok: true, why: 'your bed, made' };
}

/** Loc's line on a miss, and the plain sentence under it. */
export function bedMissWords(miss: BedMiss, setup = false): { line: string; body: string } {
  switch (miss) {
    case 'tooDark':
      return { line: 'Too dark.', body: 'Turn a light on.' };
    case 'screen':
      return { line: 'That’s a screen.', body: 'Your real bed.' };
    case 'noBed':
      return setup
        ? { line: 'Where’s the bed?', body: 'Get the whole bed in the frame.' }
        : { line: 'That’s not a bed.', body: 'Your bed, from your usual spot.' };
    case 'someone':
      return setup
        ? { line: 'Someone’s in it.', body: 'Empty and made. Then the photo.' }
        : { line: 'You’re still in it.', body: 'Get out. Make it. Then the photo.' };
    case 'notYours':
      return { line: 'That’s not your bed.', body: 'Your bed, from your usual spot.' };
    case 'unmade':
      return { line: 'That’s not made.', body: 'Covers up, pillows on. Then try again.' };
    case 'noSetup':
      return { line: 'There is no bed photo.', body: 'You can take one in the day, once you’re up. This morning, walk.' };
  }
}
