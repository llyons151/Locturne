import type { Bit, Key, LocChannel, LocMood, LocRig, LocSnapshot } from '@/features/home/loc-rig';

import { DT, FPS, withSeed, type LocAction } from './takes';

/**
 * Expressions for the Loc studio: faces he doesn't have yet, built from the rig's own channels
 * (the same numbers the moods and moves use). Each one plays as a little move: he snaps into the
 * face, holds it, and settles back to his mood. None of them is in the app until it's picked
 * and wired into loc-rig.ts. Your own, made on the Expressions page, are kept in this browser.
 */
export type Face = Partial<Record<LocChannel, number>>;
export type Expression = {
  id: string;
  label: string;
  /** What it should read as. */
  reads: string;
  /** Where it could go in the app. */
  moment: string;
  face: Face;
  /** How long he holds it, ms. */
  hold?: number;
  /** Jelly kick as he lands in it: + tall, - wide. */
  pop?: number;
  /** Made in the studio, not one of the built-in ideas. */
  mine?: boolean;
};

/** The channels a face is made from, in plain words, for the builder. */
export const FACE_CONTROLS: { key: LocChannel; label: string; min: number; max: number; step: number; group: string }[] = [
  { key: 'open', label: 'Left lid open', min: 0, max: 1.4, step: 0.01, group: 'Lids' },
  { key: 'openR', label: 'Right lid open', min: 0, max: 1.4, step: 0.01, group: 'Lids' },
  { key: 'slope', label: 'Lid slant (+ angry, − sad)', min: -30, max: 30, step: 0.5, group: 'Lids' },
  { key: 'curve', label: 'Lid edge (+ sags soft, − arches)', min: -6, max: 8, step: 0.1, group: 'Lids' },
  { key: 'squint', label: 'Squint (bottom lid up)', min: 0, max: 0.6, step: 0.01, group: 'Lids' },
  { key: 'smile', label: 'Smile (bottom lids curve up)', min: 0, max: 1, step: 0.01, group: 'Lids' },
  { key: 'swell', label: 'Pupil size (× normal)', min: 0.2, max: 2.2, step: 0.01, group: 'Eyes' },
  { key: 'swellR', label: 'Right pupil vs left', min: 0.3, max: 6, step: 0.05, group: 'Eyes' },
  { key: 'eyeR', label: 'Right eye size vs left', min: 0.6, max: 1.5, step: 0.01, group: 'Eyes' },
  { key: 'pupilJit', label: 'Pupil tremble', min: 0, max: 1, step: 0.01, group: 'Eyes' },
  { key: 'gx', label: 'Look (− left, + right)', min: -26, max: 26, step: 0.5, group: 'Eyes' },
  { key: 'gy', label: 'Look (− up, + down)', min: -12, max: 12, step: 0.5, group: 'Eyes' },
  { key: 'tilt', label: 'Head tilt', min: -25, max: 25, step: 0.5, group: 'Head and body' },
  { key: 'earL', label: 'Left ear (− back, + forward)', min: -45, max: 30, step: 1, group: 'Head and body' },
  { key: 'earR', label: 'Right ear (+ back, − forward)', min: -30, max: 45, step: 1, group: 'Head and body' },
  { key: 'y', label: 'Slump (− tall, + sinks)', min: -40, max: 80, step: 1, group: 'Head and body' },
  { key: 'lean', label: 'Lean in', min: 0, max: 0.3, step: 0.005, group: 'Head and body' },
  { key: 'sink', label: 'Sink behind the edge', min: 0, max: 260, step: 1, group: 'Head and body' },
];

export const EXPRESSIONS: Expression[] = [
  {
    id: 'side-eye', label: 'Side-eye', reads: 'Suspicious. He knows what you did.',
    moment: 'Home, the first visit after a morning you skipped or used a pass.',
    face: { gx: 21, gy: 1, open: 0.46, openR: 0.4, slope: 7, squint: 0.3, swell: 0.75, tilt: 5, earL: -6, earR: 10 },
  },
  {
    id: 'judging', label: 'Judging you', reads: 'One lid down, one up. A silent “oh really.”',
    moment: 'You move bedtime later, or switch a night off.',
    face: { open: 0.95, openR: 0.36, slope: 2, curve: -1.5, swell: 0.7, tilt: -7, earL: 6, earR: 6, y: -6 },
  },
  {
    id: 'plotting', label: 'Plotting', reads: 'Evil little smile with angry lids. Something is about to happen to your apps.',
    moment: 'Bedtime within the hour (the “bedtime soon” line).',
    face: { open: 0.62, openR: 0.62, slope: 13, smile: 0.4, squint: 0.12, swell: 0.6, tilt: -7, earL: 8, earR: -8, y: -4, lean: 0.05 },
  },
  {
    id: 'horrified', label: 'Horrified', reads: 'Huge eyes, dot pupils, ears pinned. Pure shock.',
    moment: 'You tap “Use a pass”, or try to cancel.',
    face: { open: 1.35, openR: 1.35, slope: -6, swell: 0.4, pupilJit: 0.55, earL: -40, earR: 40, y: -18, lean: 0.12 }, pop: 0.8,
  },
  {
    id: 'puppy', label: 'Puppy eyes', reads: 'Pleading. Big wet pupils looking up at you, sad lids.',
    moment: 'The cancel flow, or the paywall’s back button.',
    face: { open: 1.25, openR: 1.25, slope: -16, swell: 2.1, gy: -6, earL: -26, earR: 26, y: 12, tilt: 7 }, pop: 0.3,
  },
  {
    id: 'starstruck', label: 'Starstruck', reads: 'Pupils blown wide, ears up. He can’t believe it.',
    moment: 'A streak milestone; the first morning you actually got up.',
    face: { open: 1.2, openR: 1.2, swell: 1.55, curve: -2, earL: 12, earR: -12, gy: -3, tilt: -4, y: -14 }, pop: 0.6,
  },
  {
    id: 'melted', label: 'Melted', reads: 'Soft and warm. Lids sag, cheeks push up.',
    moment: 'The morning payoff, instead of smug, on a good week.',
    face: { open: 0.6, openR: 0.6, curve: 5, smile: 0.25, slope: -4, swell: 1.35, tilt: 9, earL: -10, earR: 10, y: 6 },
  },
  {
    id: 'proud', label: 'Proud (eyes shut)', reads: 'Chin up, eyes closed in happy arcs. Very pleased with himself.',
    moment: 'Morning payoff; after the last push-up.',
    face: { open: 0.08, openR: 0.08, smile: 0.95, curve: 5, y: -12, tilt: -8, earL: 9, earR: -9 },
  },
  {
    id: 'unimpressed', label: 'Unimpressed', reads: 'Flat, bored lids looking slightly away. You’re not that interesting.',
    moment: 'The fourth or fifth poke in a row.',
    face: { open: 0.36, openR: 0.36, slope: -3, curve: 2.5, swell: 0.9, gx: -8, y: 6, earL: -8, earR: 8 },
  },
  {
    id: 'rudely-woken', label: 'Rudely woken', reads: 'One eye barely open, the other shut. Grumpy and squinting.',
    moment: 'You open Home in the middle of the night.',
    face: { open: 0.42, openR: 0.08, slope: 12, squint: 0.26, curve: 2, swell: 0.8, y: 20, tilt: 9, earL: -16, earR: 22 },
  },
  {
    id: 'curious', label: 'Curious', reads: 'Big head tilt, one eye a bit bigger, leaning in. “What’s that?”',
    moment: 'The first time you open a new screen; setting up a new wake method.',
    face: { tilt: 15, open: 1, openR: 1.1, eyeR: 1.08, swell: 1.4, curve: -2.5, earL: 12, earR: -4, gx: 6, gy: -2, lean: 0.07 },
  },
  {
    id: 'sheepish', label: 'Sheepish', reads: 'Caught. Looks down and away, sad lids, ears back.',
    moment: 'When he’s wrong: the app failed to lock, or a sensor glitch.',
    face: { gx: -18, gy: 6, open: 0.78, openR: 0.78, slope: -14, swell: 1.2, y: 14, earL: -22, earR: 22, tilt: 5 },
  },
  {
    id: 'dizzy', label: 'Dizzy', reads: 'Lopsided eyes and a wobbly tilt. Too many zoomies.',
    moment: 'Right after the zoomies.',
    face: { open: 0.78, openR: 0.6, eyeR: 1.12, swellR: 1.7, swell: 0.8, slope: -8, curve: 2, pupilJit: 0.9, tilt: 13, earL: -14, earR: 4, y: 8 },
  },
  {
    id: 'disgusted', label: 'Disgusted', reads: 'Recoiling, squinting, head turned. “Ew.”',
    moment: 'You open a blocked app with a pass.',
    face: { open: 0.48, openR: 0.3, squint: 0.5, curve: -2, slope: 4, swell: 0.6, tilt: 11, gx: 12, y: -6, earL: -12, earR: 18 },
  },
  {
    id: 'unhinged-grin', label: 'Unhinged grin', reads: 'One huge eye, mismatched pupils, a smile. The rare crazy one.',
    moment: 'Very rarely, with a doom line (“I am doom”).',
    face: { open: 1.3, openR: 0.85, eyeR: 1.25, swell: 0.35, swellR: 3.2, smile: 0.45, lean: 0.16, tilt: -11, earL: 4, earR: 28 }, pop: 0.7,
  },
  {
    id: 'shrinking', label: 'Shrinking away', reads: 'Sinks behind the edge, eyes wide, ears flat. Scared of you.',
    moment: 'You poke him while he’s already furious.',
    face: { sink: 150, open: 1.2, openR: 1.2, slope: -10, swell: 0.55, pupilJit: 0.4, earL: -42, earR: 42, y: 10 },
  },
];

const IN_MS = 180;
const OUT_MS = 450;
export const HOLD_MS = 1400;

/** The face as a move: snap into it, hold, settle back to the mood. */
export function faceBit(e: Pick<Expression, 'face' | 'hold' | 'pop'>): Bit {
  const hold = e.hold ?? HOLD_MS;
  const end = IN_MS + hold + OUT_MS;
  const face: Face = { gx: 0, gy: 0, ...e.face };
  const tracks: Bit['tracks'] = {};
  for (const [k, v] of Object.entries(face) as [LocChannel, number][]) {
    // The gaze has no resting value of its own: it comes back to centre.
    const back: Key[1] = k === 'gx' || k === 'gy' ? 0 : 'T';
    const from: Key[1] = k === 'gx' || k === 'gy' ? 0 : 'S';
    tracks[k] = [[0, from], [IN_MS, v, 'back'], [IN_MS + hold, v], [end, back, 'io']];
  }
  const events: NonNullable<Bit['events']> = [[IN_MS, (r) => r.pop(e.pop ?? 0.25)]];
  return { ms: end, tracks, events };
}

/** The moment to show as the face's still: the middle of the hold, ms after it starts. */
export const faceStillMs = (e: Pick<Expression, 'hold'>) => IN_MS + (e.hold ?? HOLD_MS) / 2;

export const faceAction = (e: Expression): LocAction => ({
  id: `face:${e.id}`,
  label: e.label,
  group: e.mine ? 'Your expressions' : 'New: expressions',
  note: `${e.reads} Could go: ${e.moment}`,
  run: (r) => r.playBit(faceBit(e)),
});

/** Him holding `face`, settled, for the builder's preview (simulated only, so it's quick). */
export function holdFace(rig: LocRig, base: LocSnapshot, mood: LocMood, e: Pick<Expression, 'face' | 'hold' | 'pop'>): LocSnapshot {
  return withSeed(1, () => {
    rig.restore(base);
    rig.quiet = true;
    rig.place(true, mood);
    for (let i = 0; i < 30; i++) rig.simulate(DT);
    rig.playBit(faceBit({ ...e, pop: 0 }));
    const frames = Math.round((faceStillMs(e) / 1000) * FPS);
    for (let i = 0; i < frames; i++) rig.simulate(DT);
    return rig.snapshot();
  });
}

// ---- Yours, kept in this browser ----

const SAVED = 'locturne.loc-studio.faces';

export function loadMine(): Expression[] {
  try {
    const raw = localStorage.getItem(SAVED);
    return raw ? (JSON.parse(raw) as Expression[]).map((e) => ({ ...e, mine: true })) : [];
  } catch {
    return [];
  }
}

export function saveMine(list: Expression[]) {
  try {
    localStorage.setItem(SAVED, JSON.stringify(list));
  } catch {}
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** The face as a Bit to paste into loc-rig.ts. */
export function faceCode(e: Expression): string {
  const name = e.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const hold = e.hold ?? HOLD_MS, end = IN_MS + hold + OUT_MS;
  const face: Face = { gx: 0, gy: 0, ...e.face };
  const lines = (Object.entries(face) as [LocChannel, number][]).map(([k, v]) => {
    const gaze = k === 'gx' || k === 'gy';
    return `  ${k}: [[0, ${gaze ? 0 : "'S'"}], [${IN_MS}, ${round(v)}, 'back'], [${IN_MS + hold}, ${round(v)}], [${end}, ${gaze ? 0 : "'T'"}, 'io']],`;
  });
  return `/** ${e.label}: ${e.reads} */\nconst ${name}: Bit = { ms: ${end}, tracks: {\n${lines.join('\n')}\n}, events: [[${IN_MS}, (r) => r.pop(${e.pop ?? 0.25})]] };`;
}
