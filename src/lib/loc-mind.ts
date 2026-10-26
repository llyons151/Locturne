/**
 * What Loc thinks of you (docs/LOC_PERSONALITY.md, first version). Two numbers, kept on this
 * phone only, that move with what you do in Locturne and colour how he acts:
 * - Respect: you actually get up. Climbs with every morning you prove, eases back toward its
 *   start over weeks, and stops easing once it's high (a bad week can't undo a long run).
 * - Suspicion: you've been slipping out. Passes, emergency unlocks and opening the app in the
 *   small hours raise it; it fades in a couple of days.
 * Nothing here ever punishes: a missed morning changes nothing, the numbers only colour his
 * mood and lines, and stages (from the mornings count) only go up. It's always on: not a setting.
 */
import { sharedGet, sharedSet } from './screen-time.ts';

export type Mind = {
  respect: number;
  suspicion: number;
  /** When the numbers were last brought up to date, ms. */
  at: number;
  /** What's been counted already (so each morning or night counts once). The newest few. */
  seen: string[];
  /** The last time Home was opened, ms, for "back after a while". */
  lastVisit: number;
  /** The day he greets you back, if you were away three days or more (a date key). */
  back: string | null;
};

const KEY = 'locturne.loc.mind';
const KEPT = 60;
const DAY = 86_400_000;

export const RESPECT = { start: 30, halfLife: 21 * DAY, settled: 70 };
export const SUSPICION = { start: 10, halfLife: 2 * DAY };
/** How much each thing moves him. */
export const NUDGE = { morning: 4, exit: 8, smallHours: 4, smallHoursCap: 8 };
/** At or past these, it shows. */
export const PROUD_AT = 70;
export const WARY_AT = 40;

export const freshMind = (now: number): Mind => ({
  respect: RESPECT.start,
  suspicion: SUSPICION.start,
  at: now,
  seen: [],
  lastVisit: now,
  back: null,
});

const clamp = (v: number) => Math.max(0, Math.min(100, v));
/** `value` eased toward `rest` over `ms`, halving the distance every `halfLife`. */
const ease = (value: number, rest: number, ms: number, halfLife: number) => rest + (value - rest) * Math.pow(0.5, ms / halfLife);

/** The mind as of `now`: the time since it was last touched taken off. */
export function decay(mind: Mind, now: number): Mind {
  const ms = Math.max(0, now - mind.at);
  const respect = mind.respect >= RESPECT.settled ? mind.respect : ease(mind.respect, RESPECT.start, ms, RESPECT.halfLife);
  return { ...mind, respect, suspicion: ease(mind.suspicion, SUSPICION.start, ms, SUSPICION.halfLife), at: now };
}

/** Counts `key` once: true if it's new (and remembers it). */
function once(mind: Mind, key: string): boolean {
  if (mind.seen.includes(key)) return false;
  mind.seen = [...mind.seen, key].slice(-KEPT);
  return true;
}

/** A morning proved by getting up (not a pass or an emergency). */
export function onMorning(mind: Mind, morningKey: string): Mind {
  const next = { ...mind };
  if (once(next, `morning:${morningKey}`)) next.respect = clamp(next.respect + NUDGE.morning);
  return next;
}

/** A pass or an emergency unlock let the apps out early. Respect is never taken away. */
export function onExit(mind: Mind, morningKey: string): Mind {
  const next = { ...mind };
  if (once(next, `exit:${morningKey}`)) next.suspicion = clamp(next.suspicion + NUDGE.exit);
  return next;
}

/** Home opened between 1 and 5 a.m. Counts twice a night at most. */
export function onSmallHours(mind: Mind, morningKey: string, hour: number): Mind {
  if (hour < 1 || hour >= 5) return mind;
  const next = { ...mind };
  if (once(next, `late:${morningKey}:${hour}`) && next.seen.filter((k) => k.startsWith(`late:${morningKey}:`)).length <= 2)
    next.suspicion = clamp(next.suspicion + NUDGE.smallHours);
  return next;
}

/** Home opened: after three days or more away, today is a "welcome back" day. */
export function onVisit(mind: Mind, now: number, todayKey: string): Mind {
  const away = now - mind.lastVisit >= 3 * DAY;
  return { ...mind, lastVisit: now, back: away ? todayKey : mind.back };
}

// ---- What it shows as ----

export type Stage = 'stranger' | 'roommate' | 'accomplice' | 'rideOrDie';
export const STAGES: { stage: Stage; from: number; label: string }[] = [
  { stage: 'stranger', from: 0, label: 'Stranger' },
  { stage: 'roommate', from: 7, label: 'Roommate' },
  { stage: 'accomplice', from: 30, label: 'Accomplice' },
  { stage: 'rideOrDie', from: 100, label: 'Ride or die' },
];
/** Where you are with him, from the never-reset mornings count. Only ever goes up. */
export const stageFor = (mornings: number) => [...STAGES].reverse().find((s) => mornings >= s.from)!;

export type Attitude = { proud: boolean; wary: number };
/** How the numbers colour him. */
export function attitude(mind: Mind): Attitude {
  const wary = Math.max(0, Math.min(1, (mind.suspicion - WARY_AT) / 40));
  return { proud: mind.respect >= PROUD_AT, wary };
}

/** Plain words for the numbers, for the You tab. */
export function respectWord(v: number) {
  return v >= 85 ? 'Afraid of you' : v >= PROUD_AT ? 'Impressed. Ugh.' : v >= 50 ? 'Grudging' : v >= 35 ? 'Watching' : 'Unconvinced';
}
export function suspicionWord(v: number) {
  return v >= 70 ? 'Lawyered up' : v >= WARY_AT ? 'Squinting' : v >= 20 ? 'Mildly' : 'Calm';
}

// ---- Stored ----

export function readMind(now = Date.now()): Mind {
  const saved = sharedGet<Mind>(KEY);
  return decay(saved && typeof saved.respect === 'number' ? { ...freshMind(now), ...saved } : freshMind(now), now);
}
export function writeMind(mind: Mind) {
  sharedSet(KEY, mind);
}
