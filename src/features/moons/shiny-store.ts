import { useSyncExternalStore } from 'react';

import { sharedGet, sharedSet } from '@/lib/screen-time';

import { freshShiny, parseShiny, settleShiny, type CaughtShiny, type ShinyFacts, type ShinyState } from './shiny';

/**
 * The shiny moons you've caught and the hunt counts (shiny.ts), saved in the App Group, and which
 * caught shinies you've switched on (the toggle on each moon's card). Settled by the moon store
 * (moon-collection.ts) whenever a morning is: it knows the mornings and the streak.
 */
const STATE_KEY = 'locturne.moons.shiny';
const ON_KEY = 'locturne.moons.shinyOn';

const listeners = new Set<() => void>();
let state: ShinyState | undefined;
let on: Record<string, boolean> | undefined;

function emit() {
  listeners.forEach((listener) => listener());
}

export function getShinyState(): ShinyState {
  if (state) return state;
  const saved = parseShiny(sharedGet<unknown>(STATE_KEY));
  state = saved ?? freshShiny(Math.floor(Math.random() * 2 ** 31));
  if (!saved) sharedSet(STATE_KEY, state);
  return state;
}

function save(next: ShinyState) {
  state = next;
  sharedSet(STATE_KEY, next);
  emit();
}

function getOn(): Record<string, boolean> {
  on ??= sharedGet<Record<string, boolean>>(ON_KEY) ?? {};
  return on;
}

/**
 * Rolls this morning for the worn moon's shiny (once a morning). A catch isn't switched on here: the
 * payoff reveals it and switches it on, so the shiny is what rises there, not already on Home.
 */
export function settleShinies(facts: Omit<ShinyFacts, 'state'>): string | null {
  const before = getShinyState();
  const { state: next, caught } = settleShiny({ ...facts, state: before });
  if (next !== before) save(next);
  return caught;
}

export const caughtShiny = (id: string): CaughtShiny | undefined => getShinyState().caught[id];
/** Mornings hunted so far for a moon whose shiny you don't have yet. */
export const huntCount = (id: string): number => getShinyState().hunt[id] ?? 0;
/** Whether a moon is worn shiny: caught, and its toggle on. */
export const isShinyOn = (id: string): boolean => !!caughtShiny(id) && !!getOn()[id];

export function setShinyOn(id: string, value: boolean) {
  if (!!getOn()[id] === value) return;
  on = { ...getOn(), [id]: value };
  sharedSet(ON_KEY, on);
  emit();
}

/** The shiny caught on this morning and not yet shown on its payoff, or null. */
export function unpresentedShiny(morningKey: string): string | null {
  return Object.values(getShinyState().caught).find((c) => c.morningKey === morningKey && !c.presented)?.id ?? null;
}

export function markShinyPresented(id: string) {
  const s = getShinyState();
  const c = s.caught[id];
  if (!c || c.presented) return;
  save({ ...s, caught: { ...s.caught, [id]: { ...c, presented: true } } });
}

export function onShinyChange(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** The progress backup (progress-backup.ts): restores a saved copy and tells the screens. */
export function restoreShiny(next: ShinyState | null) {
  if (!next) return;
  save(next);
}

/** Dev and preview builds: catch a moon's shiny now, as if this morning had brought it. Only for a moon you have (`owned`). */
export function devCatchShiny(id: string, morningKey: string, morning: number, owned: boolean) {
  const s = getShinyState();
  if (!owned || s.caught[id]) return;
  const hunt = { ...s.hunt };
  delete hunt[id];
  save({ ...s, hunt, caught: { ...s.caught, [id]: { id, morningKey, morning, at: Date.now(), hunted: s.hunt[id] ?? 0 } } });
  setShinyOn(id, true);
}

/** Dev and preview builds: forget every shiny, the hunts and the toggles (a fresh seed too). */
export function devResetShiny() {
  on = {};
  sharedSet(ON_KEY, on);
  save(freshShiny(Math.floor(Math.random() * 2 ** 31)));
}

const snapshot = () => getShinyState();
/** The shiny state, for screens: re-renders on a catch, a hunt or a toggle. */
export function useShinyState(): ShinyState {
  useSyncExternalStore(onShinyChange, () => on, () => on);
  return useSyncExternalStore(onShinyChange, snapshot, snapshot);
}
