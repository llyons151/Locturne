/**
 * Pet your dog or cat (2026-11-23): the morning is a photo, taken live in Locturne's camera, of
 * your hand on your cat or dog. Read on the phone (modules/photo-check, PetReading.swift) with
 * Apple's animal finder, its hand finder and its image labels; this file decides. Pure, so the
 * rules are tested without a phone, and tuned on real photos run through the same Swift on a Mac
 * (tools/pet-check).
 *
 * - A cat or dog: the animal finder's box, or failing that (a close-up of fur fills the frame and
 *   the finder often misses it) a cat/dog label the classifier is sure of.
 * - A hand on it: a hand's joints inside the animal's box. With no box, a hand anywhere in a
 *   photo the classifier calls a cat or dog. The hand has to be close (yours, holding the phone's
 *   other side), not someone's across the room. A hand Vision misses in the whole frame (buried
 *   in fur) is looked for again in a crop round the animal (PetReading.swift).
 * - Not in bed: the point is getting up, and a cat asleep on the duvet can be petted lying down.
 *   A photo the classifier calls a bed, a bedroom or bedding is refused.
 * - Not a soft toy, not a screen (a cat video on a laptop), not a black frame.
 */
import { labelScore, ofAScreen, type PhotoReading } from './photo.ts';

/** An animal Vision found: "cat" or "dog". `box` is [x, y, w, h], 0 to 1, y going down. */
export type PetAnimal = { label: string; confidence: number; box: [number, number, number, number] };

/** A hand Vision found: its joints as [x, y, confidence], 0 to 1, y going down. */
export type PetHand = { confidence: number; points: [number, number, number][]; /** Found on the second, closer look. */ closer?: boolean };

export type PetReading = PhotoReading & { animals: PetAnimal[]; hands: PetHand[] };

export type PetMiss = 'tooDark' | 'screen' | 'toy' | 'inBed' | 'noPet' | 'noHand' | 'notTouching';

export type PetVerdict = { ok: true; why: string } | { ok: false; miss: PetMiss };

const PET = ['cat', 'dog', 'kitten', 'puppy', 'feline', 'canine', 'pet', 'domestic_cat', 'domestic_dog'];
const TOY = ['teddy', 'teddy_bear', 'toy', 'stuffed_animal', 'plush', 'stuffed_toy', 'doll'];
const BED = ['bed', 'bedroom', 'bedding', 'duvet', 'quilt', 'mattress', 'headboard', 'pillow'];

export const PET_RULES = {
  /** The animal finder this sure counts as a cat or dog. */
  animal: 0.5,
  /** A cat/dog label this sure counts when the finder has no box. */
  petLabel: 0.3,
  /** With no box, the label has to be this sure for a hand anywhere to count. */
  closeUpLabel: 0.4,
  /** A hand needs this many joints seen. */
  handPoints: 4,
  /**
   * Your own hand, close: its joints span at least this share of the photo (width or height). In real
   * "my hand on my pet" photos it's 0.1 to 0.6; someone sitting near their dog, hands in their lap, ~0.07.
   */
  handSize: 0.1,
  /** Joints inside the (grown) animal box that make it a touch. */
  touchPoints: 3,
  /** The animal's box grows by this share of its size each way: a hand at the edge of the fur. */
  grow: 0.08,
  /** A bed label this sure refuses the photo. */
  bed: 0.3,
  /** A toy label this sure, and surer than any pet label, refuses it. */
  toy: 0.3,
  dark: 0.06,
} as const;

/** How much of the photo a hand's joints span, the larger of width and height. */
const span = ({ points }: PetHand) => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
};

const inside = ([x, y]: [number, number, number], [bx, by, bw, bh]: PetAnimal['box'], grow: number) =>
  x >= bx - bw * grow && x <= bx + bw * (1 + grow) && y >= by - bh * grow && y <= by + bh * (1 + grow);

/** Pure: is this photo a hand on a cat or dog, out of bed? */
export function judgePet(r: PetReading): PetVerdict {
  if (r.mean < PET_RULES.dark) return { ok: false, miss: 'tooDark' };
  if (ofAScreen(r)) return { ok: false, miss: 'screen' };

  const animals = r.animals.filter((a) => a.confidence >= PET_RULES.animal);
  const petLabel = labelScore(r.labels, PET);
  const toy = labelScore(r.labels, TOY);
  if (toy >= PET_RULES.toy && toy >= petLabel) return { ok: false, miss: 'toy' };
  if (!animals.length && petLabel < PET_RULES.petLabel) return { ok: false, miss: 'noPet' };
  if (labelScore(r.labels, BED) >= PET_RULES.bed) return { ok: false, miss: 'inBed' };

  const hands = r.hands.filter((h) => h.points.length >= PET_RULES.handPoints && span(h) >= PET_RULES.handSize);
  if (!hands.length) return { ok: false, miss: 'noHand' };

  const touching = hands.some((h) =>
    animals.some((a) => h.points.filter((p) => inside(p, a.box, PET_RULES.grow)).length >= PET_RULES.touchPoints),
  );
  if (touching) return { ok: true, why: 'hand on the animal' };
  if (!animals.length && petLabel >= PET_RULES.closeUpLabel) return { ok: true, why: 'hand in a close-up of fur' };
  return { ok: false, miss: 'notTouching' };
}

/** Loc's line on a miss, and the plain sentence under it. */
export function petMissWords(miss: PetMiss): { line: string; body: string } {
  switch (miss) {
    case 'tooDark':
      return { line: 'Too dark.', body: 'Turn a light on.' };
    case 'screen':
      return { line: 'That’s a screen.', body: 'Your real pet.' };
    case 'toy':
      return { line: 'That’s a toy.', body: 'A real cat or dog.' };
    case 'inBed':
      return { line: 'You’re in bed.', body: 'Get up first. Then find them.' };
    case 'noPet':
      return { line: 'Where’s the pet?', body: 'Get your cat or dog in the circle.' };
    case 'noHand':
      return { line: 'No hand.', body: 'Your hand on them, in the photo.' };
    case 'notTouching':
      return { line: 'Closer.', body: 'Your hand on them, not near them.' };
  }
}
