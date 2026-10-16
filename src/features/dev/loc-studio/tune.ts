import { LOC_BASE, LOC_MOODS, LOC_TUNE, retuneLoc, type LocChannel, type LocMood } from '@/features/home/loc-rig';

import { MOODS } from './takes';

/**
 * The Loc studio's style controls: they change the rig's face (LOC_TUNE) and each mood's pose
 * (LOC_MOODS) live, remember the changes in this browser, and turn them back into code for
 * loc-rig.ts.
 */
type Moods = typeof LOC_MOODS;
const SHIPPED = { tune: { ...LOC_TUNE }, moods: JSON.parse(JSON.stringify(LOC_MOODS)) as Moods };
const SAVED = 'locturne.loc-studio.tune';

/** The pose controls, in plain words. Positive and negative say which way the number goes. */
export const POSE: { key: LocChannel; label: string; min: number; max: number; step: number }[] = [
  { key: 'y', label: 'Slump (− sits tall, + sinks)', min: -60, max: 90, step: 1 },
  { key: 'tilt', label: 'Head tilt', min: -25, max: 25, step: 0.5 },
  { key: 'earL', label: 'Left ear (− back, + forward)', min: -45, max: 30, step: 1 },
  { key: 'earR', label: 'Right ear (+ back, − forward)', min: -30, max: 45, step: 1 },
  { key: 'open', label: 'Left eye open', min: 0, max: 1.4, step: 0.01 },
  { key: 'openR', label: 'Right eye open', min: 0, max: 1.4, step: 0.01 },
  { key: 'slope', label: 'Lid slant (+ angry, − sad)', min: -30, max: 30, step: 0.5 },
  { key: 'squint', label: 'Squint (bottom lid)', min: 0, max: 0.6, step: 0.01 },
  { key: 'pupilR', label: 'Pupil size (this mood)', min: 4, max: 16, step: 0.1 },
  { key: 'pupilJit', label: 'Pupil tremble', min: 0, max: 1, step: 0.01 },
  { key: 'breathe', label: 'Breathing depth', min: 0, max: 1.6, step: 0.01 },
];

export const poseValue = (mood: LocMood, key: LocChannel) => LOC_MOODS[mood].set[key] ?? LOC_BASE[key];

export function setPose(mood: LocMood, key: LocChannel, value: number) {
  if (value === LOC_BASE[key]) delete LOC_MOODS[mood].set[key];
  else LOC_MOODS[mood].set[key] = value;
  retuneLoc();
  save();
}

export function setMoodTiming(mood: LocMood, patch: Partial<Pick<Moods[LocMood], 'rate' | 'blinks'>>) {
  Object.assign(LOC_MOODS[mood], patch);
  save();
}

export function setTune(patch: Partial<typeof LOC_TUNE>) {
  Object.assign(LOC_TUNE, patch);
  save();
}

/** The signature traits from the animation review, all at once. */
const SIGNATURE = { heavyLid: 0.12, faceSteps: 12, snapGaze: true, blinkLag: 30 };
export const signatureOn = () => LOC_TUNE.snapGaze && LOC_TUNE.faceSteps > 0 && LOC_TUNE.heavyLid > 0;
export function setSignature(on: boolean) {
  setTune(on ? SIGNATURE : { heavyLid: SHIPPED.tune.heavyLid, faceSteps: SHIPPED.tune.faceSteps, snapGaze: SHIPPED.tune.snapGaze, blinkLag: SHIPPED.tune.blinkLag });
}

export function resetAll() {
  Object.assign(LOC_TUNE, SHIPPED.tune);
  for (const m of MOODS) {
    const shipped = SHIPPED.moods[m];
    LOC_MOODS[m].set = { ...shipped.set };
    LOC_MOODS[m].rate = shipped.rate;
    LOC_MOODS[m].blinks = shipped.blinks;
  }
  retuneLoc();
  try {
    localStorage.removeItem(SAVED);
  } catch {}
}

function save() {
  try {
    localStorage.setItem(SAVED, JSON.stringify({ tune: LOC_TUNE, moods: LOC_MOODS }));
  } catch {}
}

/** Brings back what was changed in this browser last time. */
export function load() {
  try {
    const raw = localStorage.getItem(SAVED);
    if (!raw) return;
    const saved = JSON.parse(raw) as { tune: typeof LOC_TUNE; moods: Moods };
    Object.assign(LOC_TUNE, saved.tune);
    for (const m of MOODS) if (saved.moods[m]) Object.assign(LOC_MOODS[m], saved.moods[m]);
    retuneLoc();
  } catch {}
}

/** What's different from what shipped, one line each. */
export function changes(): string[] {
  const out: string[] = [];
  for (const k of Object.keys(SHIPPED.tune) as (keyof typeof LOC_TUNE)[]) {
    if (LOC_TUNE[k] !== SHIPPED.tune[k]) out.push(`${TUNE_LABEL[k]}: ${SHIPPED.tune[k]} → ${LOC_TUNE[k]}`);
  }
  for (const m of MOODS) {
    for (const { key, label } of POSE) {
      const was = SHIPPED.moods[m].set[key] ?? LOC_BASE[key];
      const now = poseValue(m, key);
      if (was !== now) out.push(`${m}, ${label.split(' (')[0].toLowerCase()}: ${round(was)} → ${round(now)}`);
    }
    if (SHIPPED.moods[m].rate !== LOC_MOODS[m].rate) out.push(`${m}, breathing speed: ${SHIPPED.moods[m].rate} → ${LOC_MOODS[m].rate}`);
    if (SHIPPED.moods[m].blinks !== LOC_MOODS[m].blinks) out.push(`${m}, blinks: ${SHIPPED.moods[m].blinks} → ${LOC_MOODS[m].blinks}`);
  }
  return out;
}

const round = (v: number) => Math.round(v * 1000) / 1000;
const TUNE_LABEL: Record<keyof typeof LOC_TUNE, string> = {
  button: 'eye size', pupil: 'pupil size', eyeWhite: 'eye white', blinkLag: 'blink lag (ms)',
  heavyLid: 'heavy lid', faceSteps: 'stepped face (poses a second)', snapGaze: 'snap darts and thought-blinks', hands: 'raccoon hands',
};

/** The changed values as code to paste into loc-rig.ts (LOC_TUNE and LOC_MOODS). */
export function asCode(): string {
  const t = LOC_TUNE;
  const tune = `export const LOC_TUNE = {\n  eyeWhite: '${t.eyeWhite}', button: ${round(t.button)}, pupil: ${round(t.pupil)}, blinkLag: ${round(t.blinkLag)},\n  heavyLid: ${round(t.heavyLid)}, faceSteps: ${t.faceSteps}, snapGaze: ${t.snapGaze}, hands: ${t.hands},\n};`;
  const moods = MOODS.map((m) => {
    const { set, rate, blinks } = LOC_MOODS[m];
    const keys = (Object.keys(set) as LocChannel[]).map((k) => `${k}: ${round(set[k]!)}`).join(', ');
    return `  ${m}: { set: ${keys ? `{ ${keys} }` : '{}'}, rate: ${round(rate)}, blinks: ${blinks === false ? 'false' : `'${blinks}'`} },`;
  });
  return `${tune}\n\n// LOC_MOODS\n${moods.join('\n')}`;
}
