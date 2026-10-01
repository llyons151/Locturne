/**
 * 50 text entrances for onboarding, auditioned at /text-lab.
 *
 * Every entry is a Reanimated CSS keyframe applied per unit (line, word or
 * character), so whichever one gets picked drops straight into `Voice` with no
 * new dependency. Tuned for Locturne: tired, deadpan, monochrome, never a glow,
 * never confetti energy.
 */

import { cubicBezier, type CSSAnimationKeyframes, type CSSAnimationTimingFunction } from 'react-native-reanimated';

export type Split = 'line' | 'word' | 'char';
export type Order = 'forward' | 'reverse' | 'center' | 'edges' | 'random';

export type Family = 'Drowsy' | 'Deadpan' | 'Editorial' | 'Night' | 'Character';

export const FAMILIES: { name: Family; blurb: string }[] = [
  { name: 'Drowsy', blurb: 'Soft, slow, half-awake.' },
  { name: 'Deadpan', blurb: 'Flat timing. The joke is how little happens.' },
  { name: 'Editorial', blurb: 'Masked reveals. Poster, not app.' },
  { name: 'Night', blurb: 'Calm, dark-sky pacing.' },
  { name: 'Character', blurb: 'A bit of him in the motion.' },
];

export type TextAnimation = {
  id: number;
  name: string;
  family: Family;
  /** One line on what it feels like. */
  note: string;
  split: Split;
  order?: Order;
  /** Delay between units, ms. */
  stagger: number;
  /** Per-unit duration, ms. */
  duration: number;
  easing: CSSAnimationTimingFunction;
  /** Built from the font size so distances scale with the line. */
  keyframes: (size: number) => CSSAnimationKeyframes;
  /** Clip each unit so it rises out of its own line box. */
  mask?: boolean;
  transformOrigin?: string;
  /** Random extra delay per unit, ms: an uneven, human rhythm. */
  jitter?: number;
  /** Extra hold after . , ? — the deadpan beat. */
  punctuationPause?: number;
  /** Uses filter blur: smooth on web and Android, check it on an iPhone. */
  blur?: boolean;
  pick?: boolean;
};

// Easing curves (named after their CSS counterparts).
const outQuart = cubicBezier(0.25, 1, 0.5, 1);
const outQuint = cubicBezier(0.22, 1, 0.36, 1);
const outExpo = cubicBezier(0.16, 1, 0.3, 1);
const inOutSine = cubicBezier(0.37, 0, 0.63, 1);
const inOutCubic = cubicBezier(0.65, 0, 0.35, 1);
const inQuad = cubicBezier(0.55, 0, 1, 0.45);
const softBack = cubicBezier(0.34, 1.35, 0.64, 1);
const drowsyBack = cubicBezier(0.3, 1.18, 0.55, 1);

const blur = (px: number) => `blur(${px}px)`;
const instant = { from: { opacity: 0 }, to: { opacity: 1 } };

export const ANIMATIONS: TextAnimation[] = [
  // Drowsy
  {
    id: 1,
    name: 'Settle',
    family: 'Drowsy',
    note: 'The whole line eases down and comes into focus.',
    split: 'line',
    stagger: 0,
    duration: 900,
    easing: outQuint,
    blur: true,
    pick: true,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.22 }], filter: blur(8) },
      to: { opacity: 1, transform: [{ translateY: 0 }], filter: blur(0) },
    }),
  },
  {
    id: 2,
    name: 'Word Drift',
    family: 'Drowsy',
    note: 'Words drift up one after another, slightly out of focus.',
    split: 'word',
    stagger: 90,
    duration: 800,
    easing: outQuart,
    blur: true,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.2 }], filter: blur(6) },
      to: { opacity: 1, transform: [{ translateY: 0 }], filter: blur(0) },
    }),
  },
  {
    id: 3,
    name: 'Eyelids',
    family: 'Drowsy',
    note: 'Each word opens vertically, like eyes that would rather not.',
    split: 'word',
    stagger: 110,
    duration: 700,
    easing: outQuint,
    transformOrigin: 'center',
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scaleY: 0.25 }] },
      '60%': { opacity: 1 },
      to: { opacity: 1, transform: [{ scaleY: 1 }] },
    }),
  },
  {
    id: 4,
    name: 'Sink In',
    family: 'Drowsy',
    note: 'Words sink into place from above. Falling asleep, but downward.',
    split: 'word',
    stagger: 100,
    duration: 950,
    easing: outQuint,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: -s * 0.35 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 5,
    name: 'Yawn',
    family: 'Drowsy',
    note: 'Letters start crushed together and stretch out to normal spacing.',
    split: 'line',
    stagger: 0,
    duration: 1200,
    easing: outQuint,
    keyframes: (s) => ({
      from: { opacity: 0, letterSpacing: -s * 0.12 },
      '40%': { opacity: 1 },
      to: { opacity: 1, letterSpacing: -0.3 },
    }),
  },
  {
    id: 6,
    name: 'Nod',
    family: 'Drowsy',
    note: 'Each word tips up from a slight head-drop.',
    split: 'word',
    stagger: 120,
    duration: 800,
    easing: outQuart,
    transformOrigin: 'left bottom',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.18 }, { rotate: '-7deg' }] },
      to: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }] },
    }),
  },
  {
    id: 7,
    name: 'Snooze',
    family: 'Drowsy',
    note: 'Letters surface one by one, soft and a little blurry.',
    split: 'char',
    stagger: 28,
    duration: 600,
    easing: outQuart,
    blur: true,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.1 }], filter: blur(4) },
      to: { opacity: 1, transform: [{ translateY: 0 }], filter: blur(0) },
    }),
  },
  {
    id: 8,
    name: 'Mist',
    family: 'Drowsy',
    note: 'Letters condense out of a haze in random order.',
    split: 'char',
    order: 'random',
    stagger: 18,
    duration: 900,
    easing: inOutSine,
    blur: true,
    keyframes: () => ({
      from: { opacity: 0, filter: blur(10) },
      to: { opacity: 1, filter: blur(0) },
    }),
  },
  {
    id: 9,
    name: 'Night-light',
    family: 'Drowsy',
    note: 'Fades to half, holds a moment, then fully on.',
    split: 'line',
    stagger: 0,
    duration: 1300,
    easing: 'linear',
    keyframes: () => ({
      from: { opacity: 0, animationTimingFunction: outQuart },
      '35%': { opacity: 0.45, animationTimingFunction: 'linear' },
      '60%': { opacity: 0.45, animationTimingFunction: outQuart },
      to: { opacity: 1 },
    }),
  },
  {
    id: 10,
    name: 'Slow Blink',
    family: 'Drowsy',
    note: 'Appears, blinks once, stays. Unimpressed.',
    split: 'line',
    stagger: 0,
    duration: 1300,
    easing: 'linear',
    keyframes: () => ({
      from: { opacity: 0, animationTimingFunction: outQuart },
      '35%': { opacity: 1, animationTimingFunction: inOutSine },
      '55%': { opacity: 0.15, animationTimingFunction: inOutSine },
      to: { opacity: 1 },
    }),
  },

  // Deadpan
  {
    id: 11,
    name: 'Hard Cut',
    family: 'Deadpan',
    note: 'No animation at all. On. The baseline to beat.',
    split: 'line',
    stagger: 0,
    duration: 10,
    easing: 'linear',
    keyframes: () => instant,
  },
  {
    id: 12,
    name: 'Word Cut',
    family: 'Deadpan',
    note: 'Words cut on one at a time, like a subtitle read slowly.',
    split: 'word',
    stagger: 150,
    duration: 10,
    easing: 'linear',
    keyframes: () => instant,
  },
  {
    id: 13,
    name: 'Beats',
    family: 'Deadpan',
    note: 'Word cuts with a long hold at every full stop.',
    split: 'word',
    stagger: 120,
    duration: 10,
    easing: 'linear',
    punctuationPause: 420,
    keyframes: () => instant,
  },
  {
    id: 14,
    name: 'Tired Typist',
    family: 'Deadpan',
    note: 'The current typewriter, with an uneven, sleepy rhythm.',
    split: 'char',
    stagger: 38,
    jitter: 45,
    duration: 10,
    easing: 'linear',
    keyframes: () => instant,
  },
  {
    id: 15,
    name: 'Deliberate Typist',
    family: 'Deadpan',
    note: 'Types steadily and stops to stare at each full stop.',
    split: 'char',
    stagger: 32,
    duration: 10,
    easing: 'linear',
    punctuationPause: 340,
    pick: true,
    keyframes: () => instant,
  },
  {
    id: 16,
    name: 'Stamp',
    family: 'Deadpan',
    note: 'Lands a touch large and snaps to size. Final answer.',
    split: 'line',
    stagger: 0,
    duration: 200,
    easing: outQuart,
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scale: 1.08 }] },
      to: { opacity: 1, transform: [{ scale: 1 }] },
    }),
  },
  {
    id: 17,
    name: 'Thud',
    family: 'Deadpan',
    note: 'Words drop in and land heavily. No bounce, he can’t be bothered.',
    split: 'word',
    stagger: 110,
    duration: 320,
    easing: 'linear',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: -s * 0.55 }], animationTimingFunction: inQuad },
      '70%': { opacity: 1, transform: [{ translateY: s * 0.04 }], animationTimingFunction: outQuart },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 18,
    name: 'Slide Flat',
    family: 'Deadpan',
    note: 'A short, level slide from the left. Nothing extra.',
    split: 'line',
    stagger: 0,
    duration: 420,
    easing: outExpo,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateX: -s * 0.4 }] },
      to: { opacity: 1, transform: [{ translateX: 0 }] },
    }),
  },
  {
    id: 19,
    name: 'Reluctant',
    family: 'Deadpan',
    note: 'Starts coming in, stops halfway to think about it, then finishes.',
    split: 'line',
    stagger: 0,
    duration: 1200,
    easing: 'linear',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.3 }], animationTimingFunction: outQuart },
      '30%': { opacity: 0.55, transform: [{ translateY: s * 0.12 }], animationTimingFunction: 'linear' },
      '65%': { opacity: 0.55, transform: [{ translateY: s * 0.12 }], animationTimingFunction: outQuint },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 20,
    name: 'Flat Fade',
    family: 'Deadpan',
    note: 'A long, linear fade. The anti-animation.',
    split: 'line',
    stagger: 0,
    duration: 1100,
    easing: 'linear',
    keyframes: () => ({ from: { opacity: 0 }, to: { opacity: 1 } }),
  },

  // Editorial
  {
    id: 21,
    name: 'Mask Rise',
    family: 'Editorial',
    note: 'The line rises out of its own baseline.',
    split: 'line',
    stagger: 0,
    duration: 850,
    easing: outQuint,
    mask: true,
    keyframes: (s) => ({
      from: { transform: [{ translateY: s * 1.25 }] },
      to: { transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 22,
    name: 'Word Mask Rise',
    family: 'Editorial',
    note: 'Each word slides up from behind its own line. The poster move.',
    split: 'word',
    stagger: 75,
    duration: 800,
    easing: outQuart,
    mask: true,
    pick: true,
    keyframes: (s) => ({
      from: { transform: [{ translateY: s * 1.25 }] },
      to: { transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 23,
    name: 'Letter Mask Rise',
    family: 'Editorial',
    note: 'Letters rise out of the baseline in a quick ripple.',
    split: 'char',
    stagger: 20,
    duration: 700,
    easing: outExpo,
    mask: true,
    keyframes: (s) => ({
      from: { transform: [{ translateY: s * 1.25 }] },
      to: { transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 24,
    name: 'Mask Fall',
    family: 'Editorial',
    note: 'Words drop down into their line from above the mask.',
    split: 'word',
    stagger: 80,
    duration: 800,
    easing: outQuart,
    mask: true,
    keyframes: (s) => ({
      from: { transform: [{ translateY: -s * 1.25 }] },
      to: { transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 25,
    name: 'Tilt Rise',
    family: 'Editorial',
    note: 'Masked rise with a small tilt that levels out. Magazine-cover energy.',
    split: 'word',
    stagger: 80,
    duration: 900,
    easing: outQuint,
    mask: true,
    transformOrigin: 'left bottom',
    keyframes: (s) => ({
      from: { transform: [{ translateY: s * 1.2 }, { rotate: '9deg' }] },
      to: { transform: [{ translateY: 0 }, { rotate: '0deg' }] },
    }),
  },
  {
    id: 26,
    name: 'Curtain',
    family: 'Editorial',
    note: 'Words slide in sideways from behind a mask.',
    split: 'word',
    stagger: 70,
    duration: 750,
    easing: outExpo,
    mask: true,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateX: -s * 1.4 }] },
      to: { opacity: 1, transform: [{ translateX: 0 }] },
    }),
  },
  {
    id: 27,
    name: 'Center Out',
    family: 'Editorial',
    note: 'Letters appear from the middle of the line outward.',
    split: 'char',
    order: 'center',
    stagger: 26,
    duration: 650,
    easing: outQuart,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.22 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 28,
    name: 'Rack Focus',
    family: 'Editorial',
    note: 'A camera focus pull: soft and slightly large, then sharp.',
    split: 'line',
    stagger: 0,
    duration: 1000,
    easing: outQuint,
    blur: true,
    pick: true,
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scale: 1.06 }], filter: blur(14) },
      to: { opacity: 1, transform: [{ scale: 1 }], filter: blur(0) },
    }),
  },
  {
    id: 29,
    name: 'Tracking In',
    family: 'Editorial',
    note: 'Wide letter-spacing tightens as the line comes into focus.',
    split: 'line',
    stagger: 0,
    duration: 1300,
    easing: outExpo,
    blur: true,
    keyframes: (s) => ({
      from: { opacity: 0, letterSpacing: s * 0.18, filter: blur(6) },
      to: { opacity: 1, letterSpacing: -0.3, filter: blur(0) },
    }),
  },
  {
    id: 30,
    name: 'Ink',
    family: 'Editorial',
    note: 'A plain letter-by-letter fade, like ink soaking in.',
    split: 'char',
    stagger: 30,
    duration: 450,
    easing: inOutSine,
    keyframes: () => ({ from: { opacity: 0 }, to: { opacity: 1 } }),
  },

  // Night
  {
    id: 31,
    name: 'Stars Come Out',
    family: 'Night',
    note: 'Letters twinkle on at random, like stars after dusk.',
    split: 'char',
    order: 'random',
    stagger: 32,
    duration: 700,
    easing: 'linear',
    keyframes: () => ({
      from: { opacity: 0, animationTimingFunction: outQuart },
      '55%': { opacity: 1, animationTimingFunction: inOutSine },
      '75%': { opacity: 0.35, animationTimingFunction: inOutSine },
      to: { opacity: 1 },
    }),
  },
  {
    id: 32,
    name: 'Moonrise',
    family: 'Night',
    note: 'The line rises slowly from low on the screen.',
    split: 'line',
    stagger: 0,
    duration: 1500,
    easing: outQuint,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.8 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 33,
    name: 'Constellation',
    family: 'Night',
    note: 'Words appear in random order, then the sentence is whole.',
    split: 'word',
    order: 'random',
    stagger: 130,
    duration: 700,
    easing: outQuart,
    blur: true,
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scale: 0.92 }], filter: blur(3) },
      to: { opacity: 1, transform: [{ scale: 1 }], filter: blur(0) },
    }),
  },
  {
    id: 34,
    name: 'Tide',
    family: 'Night',
    note: 'A slow wave rolls through the letters.',
    split: 'char',
    stagger: 30,
    duration: 800,
    easing: 'linear',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.28 }], animationTimingFunction: outQuart },
      '60%': { opacity: 1, transform: [{ translateY: -s * 0.05 }], animationTimingFunction: inOutSine },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 35,
    name: 'Fog Lift',
    family: 'Night',
    note: 'The line is readable early, but the haze takes its time to clear.',
    split: 'line',
    stagger: 0,
    duration: 1600,
    easing: 'linear',
    blur: true,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.15 }], filter: blur(12), animationTimingFunction: outQuart },
      '40%': { opacity: 1, transform: [{ translateY: 0 }], filter: blur(5), animationTimingFunction: inOutSine },
      to: { opacity: 1, transform: [{ translateY: 0 }], filter: blur(0) },
    }),
  },
  {
    id: 36,
    name: 'Lanterns',
    family: 'Night',
    note: 'Words glow on one after another. Slow and calm, no actual glow.',
    split: 'word',
    stagger: 220,
    duration: 1000,
    easing: inOutSine,
    keyframes: () => ({ from: { opacity: 0 }, to: { opacity: 1 } }),
  },
  {
    id: 37,
    name: 'Night Breeze',
    family: 'Night',
    note: 'Letters blow in gently from the right.',
    split: 'char',
    stagger: 22,
    duration: 750,
    easing: outQuint,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateX: s * 0.35 }] },
      to: { opacity: 1, transform: [{ translateX: 0 }] },
    }),
  },
  {
    id: 38,
    name: 'Swing',
    family: 'Night',
    note: 'Words swing up on a slow arc, like a hammock settling.',
    split: 'word',
    stagger: 110,
    duration: 1000,
    easing: outQuint,
    transformOrigin: 'center bottom',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.3 }, { rotate: '-5deg' }] },
      to: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }] },
    }),
  },
  {
    id: 39,
    name: 'Land',
    family: 'Night',
    note: 'Words shrink from slightly large into place.',
    split: 'word',
    stagger: 100,
    duration: 800,
    easing: outQuint,
    blur: true,
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scale: 1.25 }], filter: blur(4) },
      to: { opacity: 1, transform: [{ scale: 1 }], filter: blur(0) },
    }),
  },
  {
    id: 40,
    name: 'Horizon',
    family: 'Night',
    note: 'The line widens from its center as it fades in.',
    split: 'line',
    stagger: 0,
    duration: 1100,
    easing: outExpo,
    transformOrigin: 'center',
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scaleX: 0.82 }] },
      to: { opacity: 1, transform: [{ scaleX: 1 }] },
    }),
  },

  // Character
  {
    id: 41,
    name: 'Peek',
    family: 'Character',
    note: 'Each word peeks over its line, hesitates, then comes out. Very raccoon.',
    split: 'word',
    stagger: 140,
    duration: 1100,
    easing: 'linear',
    mask: true,
    pick: true,
    keyframes: (s) => ({
      from: { transform: [{ translateY: s * 1.25 }], animationTimingFunction: outQuart },
      '35%': { transform: [{ translateY: s * 0.55 }], animationTimingFunction: 'linear' },
      '55%': { transform: [{ translateY: s * 0.55 }], animationTimingFunction: outQuint },
      to: { transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 42,
    name: 'Grumble',
    family: 'Character',
    note: 'Letters arrive with a tiny mutter of a shake.',
    split: 'char',
    stagger: 18,
    duration: 420,
    easing: 'linear',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateX: -s * 0.06 }], animationTimingFunction: outQuart },
      '35%': { opacity: 1, transform: [{ translateX: s * 0.05 }], animationTimingFunction: inOutSine },
      '65%': { opacity: 1, transform: [{ translateX: -s * 0.025 }], animationTimingFunction: inOutSine },
      to: { opacity: 1, transform: [{ translateX: 0 }] },
    }),
  },
  {
    id: 43,
    name: 'Stretch',
    family: 'Character',
    note: 'Words stretch up from the baseline like a morning stretch.',
    split: 'word',
    stagger: 110,
    duration: 800,
    easing: 'linear',
    transformOrigin: 'center bottom',
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scaleY: 0.5 }, { scaleX: 1.08 }], animationTimingFunction: outQuart },
      '55%': { opacity: 1, transform: [{ scaleY: 1.07 }, { scaleX: 0.97 }], animationTimingFunction: inOutSine },
      to: { opacity: 1, transform: [{ scaleY: 1 }, { scaleX: 1 }] },
    }),
  },
  {
    id: 44,
    name: 'Out of Bed',
    family: 'Character',
    note: 'Words roll up from lying down to standing.',
    split: 'word',
    stagger: 120,
    duration: 900,
    easing: drowsyBack,
    transformOrigin: 'left bottom',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.2 }, { rotate: '-14deg' }] },
      to: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }] },
    }),
  },
  {
    id: 45,
    name: 'Groggy',
    family: 'Character',
    note: 'Words stumble in with a small wobble before standing still.',
    split: 'word',
    stagger: 120,
    duration: 1000,
    easing: 'linear',
    transformOrigin: 'center bottom',
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.3 }, { rotate: '0deg' }], animationTimingFunction: outQuart },
      '40%': { opacity: 1, transform: [{ translateY: -s * 0.04 }, { rotate: '2.5deg' }], animationTimingFunction: inOutSine },
      '70%': { opacity: 1, transform: [{ translateY: 0 }, { rotate: '-1.5deg' }], animationTimingFunction: inOutSine },
      to: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }] },
    }),
  },
  {
    id: 46,
    name: 'Pillow',
    family: 'Character',
    note: 'Words puff up soft and settle, like a pillow after a punch.',
    split: 'word',
    stagger: 90,
    duration: 700,
    easing: softBack,
    keyframes: () => ({
      from: { opacity: 0, transform: [{ scale: 0.82 }] },
      to: { opacity: 1, transform: [{ scale: 1 }] },
    }),
  },
  {
    id: 47,
    name: 'Murmur',
    family: 'Character',
    note: 'A quick, quiet letter ripple, like he’s talking under his breath.',
    split: 'char',
    stagger: 12,
    duration: 300,
    easing: outQuart,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.08 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 48,
    name: 'Lazy Wave',
    family: 'Character',
    note: 'Words rise in a slow, long-staggered wave. Zero urgency.',
    split: 'word',
    stagger: 170,
    duration: 1200,
    easing: inOutCubic,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.35 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 49,
    name: 'Last Word',
    family: 'Character',
    note: 'Words arrive right to left, so the line ends where it starts.',
    split: 'word',
    order: 'reverse',
    stagger: 110,
    duration: 700,
    easing: outQuart,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: s * 0.2 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
  {
    id: 50,
    name: 'Sigh',
    family: 'Character',
    note: 'A slow exhale: the line breathes out and settles lower.',
    split: 'line',
    stagger: 0,
    duration: 1300,
    easing: inOutSine,
    keyframes: (s) => ({
      from: { opacity: 0, transform: [{ translateY: -s * 0.1 }, { scale: 1.04 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    }),
  },
];

/** The typewriter onboarding uses today (ui.tsx `Voice`), kept for comparison. */
export const CURRENT: TextAnimation = {
  id: 0,
  name: 'Current typewriter',
  family: 'Deadpan',
  note: 'What `Voice` does today: 24 ms per character, no easing.',
  split: 'char',
  stagger: 24,
  duration: 10,
  easing: 'linear',
  keyframes: () => instant,
};
