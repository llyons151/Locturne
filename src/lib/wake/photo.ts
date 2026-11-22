/**
 * Touch grass and Sunlight (2026-11-21): the morning is a photo, taken live in Locturne's own
 * camera, of grass or of the sun. The photo never leaves the phone: the native PhotoCheck module
 * (modules/photo-check) reads it with Apple's on-device image classifier and a few pixel counts,
 * and this file decides from that reading. Pure, so the rules are tested without a phone.
 *
 * Apple doesn't publish the classifier's label list, so neither check leans on labels alone:
 * - Grass: a grass-like label, or a plant-like label with most of the photo grass-green.
 * - Sun: the sun itself (a small clipped-white blob, or a sun label) in an outdoor sky. A sky in
 *   full daylight counts too, so an overcast morning isn't a lost morning: the point is daylight.
 * - Both: the camera's light reading (EXIF BrightnessValue) has to look like outdoors, which a
 *   photo of a screen or a ceiling light doesn't. Missing on some photos; then labels decide.
 * - Either way a photo whose top label is a screen is refused: a picture of a picture.
 */

/** One label from the classifier, `confidence` 0 to 1. */
export type PhotoLabel = { id: string; confidence: number };

/** What modules/photo-check reads off a photo. Fractions are of the whole frame, 0 to 1. */
export type PhotoReading = {
  labels: PhotoLabel[];
  /** Pixels that are a living green: green leads red and blue, bright enough, saturated. */
  green: number;
  /** Pixels that look like sky: blue-leaning and light, or bright and pale (overcast). */
  sky: number;
  /** The largest blob of clipped white, as a fraction of the frame. 0 with none. */
  blob: number;
  /** How round that blob is: its area over its bounding box (a disc is about 0.79). */
  blobFill: number;
  /** Mean brightness, 0 to 1. */
  mean: number;
  /** EXIF BrightnessValue (APEX): roughly 0 to 4 indoors, 6 overcast, 9+ sunny. Null when missing. */
  brightness: number | null;
};

export type PhotoKind = 'grass' | 'sun';

export type PhotoMiss = 'screen' | 'indoors' | 'notGrass' | 'noSun' | 'tooDark';

export type PhotoVerdict = { ok: true; why: string } | { ok: false; miss: PhotoMiss };

const GRASS = ['grass', 'lawn', 'meadow', 'turf', 'field', 'pasture', 'moss', 'grassland', 'hay'];
const PLANT = ['plant', 'foliage', 'leaf', 'vegetation', 'garden', 'park', 'shrub', 'bush', 'forest', 'tree', 'clover', 'weed'];
const SKY = ['sky', 'blue_sky', 'cloudy', 'clouds', 'cloud', 'sunset_sunrise', 'sun', 'sunlight', 'daytime', 'overcast'];
const SUN = ['sun', 'sunset_sunrise', 'sunlight', 'sunbeam', 'sunburst'];
const SCREEN = ['screen', 'monitor', 'television', 'computer', 'laptop', 'display', 'computer_monitor', 'tv', 'smartphone', 'cellphone'];

/** Thresholds, named so the lab and the tests read them. */
export const PHOTO = {
  /** A label this sure counts. */
  label: 0.3,
  /** A plant label this sure counts with enough green. */
  plantLabel: 0.15,
  /** Green share for the plant route. */
  green: 0.3,
  /** Green share that counts with only a weak grass label. */
  greenWithWeakGrass: 0.2,
  weakGrass: 0.1,
  /** A screen label this sure refuses the photo. */
  screen: 0.35,
  /** Below this light reading, grass is indoors (or a screen). Dawn under trees is about 1 to 2. */
  grassBrightness: 1,
  /** Below this, it's not daylight (or it's a lamp). */
  sunBrightness: 4,
  /** The sun's blob: a speck at the least, never most of the frame, roughly round. */
  blobMin: 0.0003,
  blobMax: 0.2,
  blobFill: 0.45,
  /** Sky share needed around the sun. */
  sky: 0.15,
  /** A whole sky this bright counts without the disc (overcast daylight). */
  daylightBrightness: 7,
  daylightSky: 0.4,
  /** A frame darker than this is a covered lens or night. */
  dark: 0.06,
} as const;

/** Pure: the highest confidence among labels whose id contains any of `words`. */
export function labelScore(labels: PhotoLabel[], words: readonly string[]): number {
  let best = 0;
  for (const { id, confidence } of labels) {
    const name = id.toLowerCase();
    if (words.some((w) => name === w || name.split(/[_\s,]+/).includes(w))) best = Math.max(best, confidence);
  }
  return best;
}

/** Pure: is this a photo of a screen? Only when a screen is what the classifier is surest of. */
function ofAScreen(r: PhotoReading): boolean {
  const screen = labelScore(r.labels, SCREEN);
  if (screen < PHOTO.screen) return false;
  const top = r.labels.reduce((m, l) => Math.max(m, l.confidence), 0);
  return screen >= top - 0.05;
}

/** Pure: is this photo grass, outdoors? */
export function judgeGrass(r: PhotoReading): PhotoVerdict {
  if (r.mean < PHOTO.dark) return { ok: false, miss: 'tooDark' };
  if (ofAScreen(r)) return { ok: false, miss: 'screen' };
  const grass = labelScore(r.labels, GRASS);
  const plant = labelScore(r.labels, PLANT);
  const looks =
    grass >= PHOTO.label
      ? 'grass label'
      : plant >= PHOTO.plantLabel && r.green >= PHOTO.green
        ? 'plant label + green'
        : grass >= PHOTO.weakGrass && r.green >= PHOTO.greenWithWeakGrass
          ? 'weak grass label + green'
          : null;
  if (!looks) return { ok: false, miss: 'notGrass' };
  if (r.brightness !== null && r.brightness < PHOTO.grassBrightness) return { ok: false, miss: 'indoors' };
  return { ok: true, why: looks };
}

/** Pure: is this photo the sun (or a daylight sky), outdoors? */
export function judgeSun(r: PhotoReading): PhotoVerdict {
  if (r.mean < PHOTO.dark) return { ok: false, miss: 'tooDark' };
  if (ofAScreen(r)) return { ok: false, miss: 'screen' };
  const skyLabel = labelScore(r.labels, SKY);
  const sunLabel = labelScore(r.labels, SUN);
  const outdoors = r.brightness === null || r.brightness >= PHOTO.sunBrightness;
  const inSky = skyLabel >= PHOTO.label || r.sky >= PHOTO.sky;
  const disc = r.blob >= PHOTO.blobMin && r.blob <= PHOTO.blobMax && r.blobFill >= PHOTO.blobFill;
  if (!outdoors) return { ok: false, miss: (disc || sunLabel >= PHOTO.label) ? 'indoors' : 'noSun' };
  if (inSky && (disc || sunLabel >= PHOTO.label)) return { ok: true, why: disc ? 'sun disc in sky' : 'sun label in sky' };
  // Overcast: no disc, but a big bright sky in daylight. Needs the light reading: a white wall has none of it.
  if (r.brightness !== null && r.brightness >= PHOTO.daylightBrightness && (r.sky >= PHOTO.daylightSky || skyLabel >= PHOTO.label))
    return { ok: true, why: 'daylight sky' };
  return { ok: false, miss: 'noSun' };
}

export const judgePhoto = (kind: PhotoKind, r: PhotoReading): PhotoVerdict => (kind === 'grass' ? judgeGrass(r) : judgeSun(r));

/** Loc's line on a miss, and the plain sentence under it. */
export function missWords(kind: PhotoKind, miss: PhotoMiss): { line: string; body: string } {
  switch (miss) {
    case 'screen':
      return { line: 'That’s a screen.', body: kind === 'grass' ? 'Real grass. Outside. It’s free.' : 'The real one. It’s up there.' };
    case 'indoors':
      return { line: 'You’re inside.', body: kind === 'grass' ? 'Houseplants don’t count. Go outside.' : 'That’s a lamp. Go outside.' };
    case 'tooDark':
      return { line: 'I can’t see a thing.', body: 'Take the thumb off the lens and try again.' };
    case 'notGrass':
      return { line: 'That’s not grass.', body: 'Get close. Fill the frame with it.' };
    case 'noSun':
      return { line: 'Where’s the sun?', body: 'Point at it, or the brightest bit of sky. Don’t stare.' };
  }
}
