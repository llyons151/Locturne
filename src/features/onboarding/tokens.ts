import { Nocturne } from '@/constants/nocturne';

/**
 * The onboarding's one small system (docs/onboarding-consistency/README.md). Screens read
 * sizes, gaps and radii from here instead of inventing their own, so every page lines up.
 */

/** Spacing scale. Nothing in onboarding should use a gap that isn't one of these. */
export const Space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Named gaps for the relationships every screen repeats. */
export const Gap = {
  /** Side gutter, top bar included. */
  gutter: Space.xl,
  /** Top bar to the headline: puts every top-anchored headline at the same height. */
  pageTop: 20,
  /** Headline to the line that explains it. */
  headline: Space.m,
  /** Body copy to a Loc aside under it. */
  aside: Space.l,
  /** Supporting line to the screen's main block (list, card, wheel). */
  block: Space.xl,
  /** Between separate sections. */
  section: Space.xxl,
} as const;

export const Radius = {
  /** Buttons and answers: fully round. */
  pill: 999,
  /** Cards, lists, notes. */
  card: 20,
  /** Small controls: presets, chips. */
  control: 12,
} as const;

/** Loc's italic serif sizes (see Voice in ui.tsx). */
export const VoiceSize = {
  hero: 46,
  headline: 34,
  aside: 22,
} as const;

/** Sans text styles. Colour is separate: grey (text2) explains, white is read first. */
export const Type = {
  title: { fontSize: 28, lineHeight: 33, fontWeight: '700', letterSpacing: -0.4 },
  quizTitle: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.4 },
  body: { fontSize: 17, lineHeight: 24 },
  secondary: { fontSize: 15, lineHeight: 20 },
  caption: { fontSize: 13, lineHeight: 18 },
  legal: { fontSize: 12, lineHeight: 16 },
  /** Section labels: BEDTIME, PRESETS, LIGHTS OUT. */
  label: {
    color: Nocturne.text2,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  /** Keys in a two-column list: Tonight, Day 5, Steps. */
  rowKey: { color: Nocturne.text2, fontSize: 14, fontWeight: '600' },
} as const;

/** Primary buttons are this tall on every screen, with their bottom edge in the same place. */
export const CTA_HEIGHT = 56;

/**
 * Join the last two words so a line never ends on one lonely word, and keep "I" and "a"
 * with the word after them so they never dangle at the end of a line.
 */
export function noOrphan(text: string): string {
  const glued = text.replace(/(^|\s)(I|a|A) /g, '$1$2 ');
  const i = glued.trimEnd().lastIndexOf(' ');
  return i > 0 ? `${glued.slice(0, i)} ${glued.slice(i + 1)}` : glued;
}
