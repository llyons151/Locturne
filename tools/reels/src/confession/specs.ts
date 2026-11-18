// One entry per Confession reel. Only the hook part changes between reels; MORNING and DEMO are shared.
// New reel: python3 -I confession/words.py <clip or URL> <from> <to> <name>, then add a spec here
// and a <Composition> line in Root.tsx (see docs/REEL_TEARDOWN_CONFESSION.md).
export type Word = { w: string; s: number; e: number };
export type Pop = { src: string; at: number; to: number; y: number; w: number; tilt?: number };
export type WindowSpec = { src: string; word?: string; at?: number; width?: number; top?: number; aspect?: number };
export type Card = { big: string; small?: string; len: number; style?: 'notes' | 'receipt'; color?: string; size?: number };
export type PivotSpec = { kind: 'montage' } | { kind: 'clip'; src: string; len: number; punch?: string } | { kind: 'cards'; cards: Card[] };
export type DemoSeg = { src: string; len: number; from?: number; stamp?: string };
export type ConfessionSpec = {
  hook: string; // public/ path of the cut hook clip
  hookLen: number; // seconds of hook used
  hookFocus?: string; // objectPosition when cropping a square or landscape clip to 9:16
  words: Word[];
  highlight?: Record<string, string>; // WORD → colour
  pops?: Pop[];
  window?: WindowSpec; // the Screen Time card that opens into the montage
  pivot?: PivotSpec; // default: the WAKE UP montage
  split?: boolean; // clip on top, the app underneath the whole time
  splitRate?: number; // demo speed under the clip
  captionY?: number;
  phraseStarts?: number[]; // word indices where a caption phrase starts
  icons?: Record<string, 'tiktok' | 'dots' | 'toggle'>; // WORD → small icon above its phrase
  hookZoom?: number; // fixed crop-in on the hook clip
  musicHit?: number; // seconds into the track of its big hit; lands on the hook → montage cut
  punch: string; // the line over the morning montage
  broll: string[];
  brollEach: number;
  tagline: string; // stays on under the demo
  demo: DemoSeg[];
  music?: string;
  musicUnder?: number;
};

// the payoff montage: 4K people living their best life outdoors + nature (Mixkit free licence; Commons CC, see
// public/confession/LIFE_CREDITS.md), one shot per beat of the track. Opens on the Alps the window bursts into.
export const STOCK_LIFE: string[] = [
  'confession/broll4k/alps.mp4', 'confession/life/l20.mp4', 'confession/life/l06.mp4', 'confession/broll4k/waterfall.mp4',
  'confession/life/l17.mp4', 'confession/broll4k/sun2.mp4', 'confession/broll4k/peak.mp4', 'confession/life/l13.mp4',
  'confession/life/l24.mp4', 'confession/broll4k/wales.mp4', 'confession/life/l22.mp4', 'confession/life/l23.mp4',
  'confession/broll4k/rhine.mp4', 'confession/broll4k/walk.mp4', 'confession/life/l26.mp4', 'confession/broll4k/sunrise.mp4',
];
// TikTok aesthetic edits (2026-11-12, user's call): cut by confession/cut_edits.py from docs/reel-refs/edits.
export const LIFE: string[] = Array.from({ length: 16 }, (_, i) => `confession/edits/e${String(i).padStart(2, '0')}.mp4`);
export const MORNING = LIFE;
// Epic Blockbuster 2 (FreePD, CC0): 117.45 BPM, its big hit at 66.74 s (confession/beats.py)
const BEAT = 60 / 117.45;

// the real app: the shield at night, then the morning walk and the moonrise (public/demo, recorded 11-11)
// placeholder until a TikTok-at-night recording: phone-demo.mp4 is cut from the 11-11 iPhone recording
// (tap an app → "No. Walk 200 steps" → walk ×50 → moonrise payoff → the app opens). Recut: docs/REEL_TEARDOWN_CONFESSION.md
export const DEMO: DemoSeg[] = [{ src: 'demo/phone-demo.mp4', len: 10.18 }];

// placeholder Screen Time card (timingapp.com's guide screenshot) until the user's own bad week
export const SCREEN_TIME = 'confession/pops/screentime.png';

export const base = { punch: 'WAKE UP.', broll: LIFE, brollEach: BEAT, tagline: 'GET YOUR LIFE BACK', demo: DEMO };  // no bed: add a TikTok sound in the app (music: 'audio/epic-blockbuster-2.mp3', musicHit: 66.736, musicUnder: 0.35)

import autoscroll from './hooks/autoscroll.json';

const AUTOSCROLL: ConfessionSpec = {
  ...base,
  hook: 'confession/hooks/autoscroll.mp4',
  hookLen: 15.0,
  words: autoscroll as Word[],
  hookZoom: 1.18, // close on her face, like Lockr's crop
  captionY: 930,
  phraseStarts: [0, 4, 8, 12, 15, 19, 23, 26, 30, 34, 38],
  highlight: { GOSH: '#ffc93c', TIKTOK: '#ff3b3b', AUTOSCROLL: '#ff3b3b', BUTTONS: '#d46bff', TURN: '#39c8ff', PROBLEM: '#ff3b3b' },
  icons: { TIKTOK: 'tiktok', BUTTONS: 'dots', TURN: 'toggle' },
  window: { src: SCREEN_TIME, word: 'PROBLEM' },
};

export const SPECS: Record<string, ConfessionSpec> = {
  // the Stitch tail: upload this in TikTok's Stitch camera after trimming the creator's clip (max 5 s).
  // Starts on the white flash, so their clip cuts straight into WAKE UP.
  ConfessionTail: { ...base, hook: '', hookLen: 0, words: [] },
  // @thestarrdestiny's original (9.5M, 2025-12-31), the clip behind Lockr's 2.7M reel. Un-cleared: throwaway account only.
  ConfessionAutoscroll: AUTOSCROLL,

  // scout picks 2026-11-12. All four have their own captions burned in, so ours are off (words kept for timing only).
  // Un-cleared clips: throwaway account, or Stitch where it fits.
  ConfessionStreamer: { // @dmntrahloww 2.0M / 63K shares, reacting to a viewer's 24 h screen time
    ...base, hook: 'confession/hooks/streamer.mp4', hookLen: 5.2, words: [], window: { src: SCREEN_TIME, at: 3.66 },
  },
  ConfessionDad: { // @dailyrepsguy 274K, bedtime with his daughter, pulls out his phone
    ...base, hook: 'confession/hooks/dad.mp4', hookLen: 10.9, words: [], window: { src: SCREEN_TIME, at: 8.58 },
  },
  ConfessionPrimeYears: { // @reesemckennafaz 2.8M, "you are losing the prime years of your life"
    ...base, hook: 'confession/hooks/primeyears.mp4', hookLen: 5.6, words: [],
  },
  ConfessionDoomscroll: { // @princessmilyy 2.3M / 106K shares, text meme, the whole 6 s clip
    ...base, hook: 'confession/hooks/doomscroll.mp4', hookLen: 6.1, words: [],
    tagline: 'GET YOUR MORNINGS BACK', // her text is about work in the morning + sleep
    musicUnder: 0.75, // no speech to keep clear: the meme's laugh ends at 4 s
  },
  // Variants of the autoscroll reel (2026-11-12): same hook, one change each. Research: docs/research_notes/Confession format variants/
  // A: the pivot is a receipt (numbers slam in) instead of nature. Maths: 6 h × 365 / 24 = 91 days.
  ConfessionAutoscrollReceipt: {
    ...AUTOSCROLL, window: undefined,
    pivot: { kind: 'cards', cards: [
      { big: '6h a day', small: 'on your phone', len: 1.1 },
      { big: '91 days', small: 'every single year', len: 1.2 },
      { big: 'WAKE UP.', color: '#ff2d2d', size: 170, len: 0.9 },
    ] },
  },
  // B: notes-style confession lines, the slideshow winners' "personal confession → the app" beat
  ConfessionAutoscrollNotes: {
    ...AUTOSCROLL, window: undefined,
    pivot: { kind: 'cards', cards: [
      { big: 'me every night at 1am', style: 'notes', len: 1.3 },
      { big: 'so now my apps fall asleep at 11', small: 'and only wake up when I walk 200 steps', style: 'notes', len: 2.0 },
    ] },
  },
  // C: Loc jumps up at sunrise instead of stock nature (the 733K version's meme slot, but ours)
  ConfessionAutoscrollLoc: {
    ...AUTOSCROLL,
    pivot: { kind: 'clip', src: 'confession/pivots/loc-jump-sunrise.mp4', len: 3.0, punch: 'WAKE UP.' },
  },
  // D: split screen, the app visible from the first second (slideshows that show the app early win)
  ConfessionAutoscrollSplit: {
    ...AUTOSCROLL, window: undefined, split: true, splitRate: 0.5, captionY: 820,
  },
};
