/**
 * Shiny moons (user, 2026-11-23: "shiny hunting", from Rivaldle's lord icon videos). Every moon has a
 * shiny version. You hunt the one you're wearing: each morning you get up rolls once for it, and a hit
 * catches its shiny. The mornings spent hunting a moon are counted ("Morning 143, no shiny yet" is the
 * video). Once caught, a toggle on its card in the moon page wears it shiny or plain.
 *
 * Pure: no React, no storage, so it runs under `npm test`. The store (shiny-store.ts) feeds it the
 * facts and saves what it returns. The odds below are first guesses, to tune against how long people
 * stay; the look of each shiny isn't designed yet (shiny-look.ts has a placeholder).
 */
import { rollFor } from './moon-ladder.ts';

/** One morning in this many catches the worn moon's shiny. */
export const SHINY_ODDS = 64;
/** The odds while on a run of `CHARM_STREAK` mornings or more: getting up every day hunts faster. */
export const SHINY_ODDS_CHARM = 32;
export const CHARM_STREAK = 7;
/**
 * Your first shiny comes on exactly this morning (user, 2026-11-23: a set day inside the trial, so it can be
 * promised up front and gives a reason to keep going). No roll before it, so it's always this one; after
 * it, it's the odds alone.
 */
export const FIRST_SHINY_MORNING = 6;
/** Rolls start on the first shiny's morning. */
export const SHINY_FROM_MORNING = FIRST_SHINY_MORNING;

/** A shiny you caught: the morning that brought it, and how many mornings you'd hunted it. */
export type CaughtShiny = {
  id: string;
  morningKey: string;
  /** Mornings got up, ever, that one included. */
  morning: number;
  at: number;
  /** Mornings rolled for it while worn, the catching one included. */
  hunted: number;
  /** Shown on its morning's payoff already. */
  presented?: boolean;
};

export type ShinyState = {
  /** Fixed per install: each morning's roll comes from it and the morning's key, so it can't be rerolled. */
  seed: number;
  /** The last morning rolled for, so each morning rolls once. */
  rolled: string | null;
  caught: Record<string, CaughtShiny>;
  /** Mornings rolled for each moon not yet caught, while worn. */
  hunt: Record<string, number>;
};

export function freshShiny(seed: number): ShinyState {
  return { seed, rolled: null, caught: {}, hunt: {} };
}

/** The chance a morning's roll hits, for a run of `streak` mornings. */
export function shinyOdds(streak: number): number {
  return 1 / (streak >= CHARM_STREAK ? SHINY_ODDS_CHARM : SHINY_ODDS);
}

export type ShinyFacts = {
  state: ShinyState;
  /** The moon being worn: the one hunted. */
  worn: string;
  /** Whether the worn moon is unlocked (yours): only a moon you have can have its shiny caught (user, 2026-11-23). */
  owned: boolean;
  /** Mornings got up, ever. */
  mornings: number;
  /** The morning being settled (the latest real wake-up's key), or null before one. */
  latest: string | null;
  /** The current run of mornings. */
  streak: number;
  now: number;
};

/**
 * Rolls this morning for the worn moon's shiny, once. Safe to run as often as you like. Returns the
 * new state and the id caught this time, or null. A moon you haven't unlocked, or whose shiny you have, isn't hunted: the
 * morning still counts as rolled, so wearing another one later that morning doesn't roll again.
 */
export function settleShiny(f: ShinyFacts): { state: ShinyState; caught: string | null } {
  const { state, worn, owned, mornings, latest, streak, now } = f;
  if (!latest || mornings < SHINY_FROM_MORNING || state.rolled === latest) return { state, caught: null };
  const next: ShinyState = { ...state, rolled: latest, caught: { ...state.caught }, hunt: { ...state.hunt } };
  // A moon not yours (a dev or preview pick) or one whose shiny you have: the morning is used, nothing is hunted.
  if (!owned || next.caught[worn]) return { state: next, caught: null };
  const hunted = (next.hunt[worn] ?? 0) + 1;
  const first = Object.keys(next.caught).length === 0;
  const hit = first || rollFor(state.seed, `shiny:${latest}`) < shinyOdds(streak);
  if (!hit) {
    next.hunt[worn] = hunted;
    return { state: next, caught: null };
  }
  next.caught[worn] = { id: worn, morningKey: latest, morning: mornings, at: now, hunted };
  delete next.hunt[worn];
  return { state: next, caught: worn };
}

/** Pure: both saved copies together, nothing taken away (the progress backup). `a` wins ties. */
export function mergeShiny(a: ShinyState | null, b: ShinyState | null): ShinyState | null {
  if (!a) return b;
  if (!b) return a;
  // The seed and the last roll from the copy that has rolled furthest, as the rare moons do.
  const base = (b.rolled ?? '') > (a.rolled ?? '') ? b : a;
  const caught: Record<string, CaughtShiny> = { ...b.caught };
  for (const [id, c] of Object.entries(a.caught)) {
    const o = caught[id];
    caught[id] = !o ? c : { ...(c.at <= o.at ? c : o), ...(c.presented || o.presented ? { presented: true } : {}) };
  }
  const hunt: Record<string, number> = {};
  for (const id of new Set([...Object.keys(a.hunt), ...Object.keys(b.hunt)])) {
    if (!caught[id]) hunt[id] = Math.max(a.hunt[id] ?? 0, b.hunt[id] ?? 0);
  }
  return { seed: base.seed, rolled: base.rolled, caught, hunt };
}

/** Pure: a saved copy's shiny state, or null for nothing or garbage. */
export function parseShiny(raw: unknown): ShinyState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<ShinyState>;
  if (typeof r.seed !== 'number') return null;
  const caught: Record<string, CaughtShiny> = {};
  if (r.caught && typeof r.caught === 'object') {
    for (const [id, c] of Object.entries(r.caught)) {
      if (c && typeof c === 'object' && typeof c.morningKey === 'string' && typeof c.at === 'number') {
        caught[id] = { ...c, id, morning: typeof c.morning === 'number' ? c.morning : 0, hunted: typeof c.hunted === 'number' ? c.hunted : 0 };
      }
    }
  }
  const hunt: Record<string, number> = {};
  if (r.hunt && typeof r.hunt === 'object') {
    for (const [id, n] of Object.entries(r.hunt)) if (typeof n === 'number' && n >= 0) hunt[id] = Math.floor(n);
  }
  return { seed: r.seed, rolled: typeof r.rolled === 'string' ? r.rolled : null, caught, hunt };
}
