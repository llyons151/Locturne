import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { sharedGet, sharedSet } from '@/lib/screen-time';

import { LADDER, MOONS } from './moon-data';
import type { MoonDef } from './moon-types';

/**
 * The moon you're wearing: it recolours the sky, the moon, its halo and the Sleep orb
 * (docs/reports/Moon collection and unlock themes.md). For now every moon can be picked from You
 * in dev and preview builds, to test them on the phone (user, 2026-10-29); unlocking by mornings
 * comes later.
 */
const KEY = 'locturne.moon';

export const DEFAULT_MOON = MOONS[0];
const BY_ID = new Map(MOONS.map((m) => [m.id, m]));

/** The ladder you built in the moon lab, in order: mornings 1 to 200, week 50, then the secret. */
export const LADDER_MOONS: MoonDef[] = LADDER.flatMap((id) => (id && BY_ID.get(id) ? [BY_ID.get(id)!] : []));
/** Every other moon, in the lab's order. */
export const OTHER_MOONS: MoonDef[] = MOONS.filter((m) => m !== DEFAULT_MOON && !LADDER.includes(m.id));

const listeners = new Set<() => void>();
let current: MoonDef | undefined;
/** A moon shown but not worn: the payoff's new moon, until it's applied or the payoff closes. */
let preview: MoonDef | undefined;
/** How long the sky takes to blend into the moon now on show, from the last change (0: at once). */
let fadeMs = 0;

/** The last change's crossfade (`previewMoon`'s `fade`), for NightSky to blend the old sky into the new. */
export function moonFadeMs(): number {
  return fadeMs;
}

/** The moon on show: the sky, the moon, its halo and the orb are drawn in it. */
export function getMoon(): MoonDef {
  return preview ?? getWornMoon();
}

/** The moon you chose to wear (saved), whatever is on show. */
export function getWornMoon(): MoonDef {
  current ??= BY_ID.get(sharedGet<string>(KEY) ?? webMoon() ?? '') ?? DEFAULT_MOON;
  return current;
}

/** On the web, where nothing is saved between loads, `?moon=<id>` starts with that moon (for screenshots). */
function webMoon(): string | undefined {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return undefined;
  return new URLSearchParams(location.search).get('moon') ?? undefined;
}

export function setMoon(id: string) {
  const next = BY_ID.get(id) ?? DEFAULT_MOON;
  if (next === getWornMoon()) return;
  current = next;
  fadeMs = 0;
  sharedSet(KEY, next.id);
  listeners.forEach((listener) => listener());
}

/**
 * Shows a moon without wearing it (user, 2026-11-02: the payoff's new moon rises); null goes back to
 * the worn one. Nothing is saved: `setMoon` wears it. `fade` blends the sky, moon and halo into it
 * over that many ms instead of swapping them (user, 2026-11-02: Done without Apply "glitches" back).
 */
export function previewMoon(id: string | null, fade = 0) {
  const next = id ? BY_ID.get(id) : undefined;
  if (next === preview) return;
  preview = next;
  fadeMs = fade;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** The moon on show (`getMoon`): for drawing. */
export function useMoon(): MoonDef {
  return useSyncExternalStore(subscribe, getMoon, getMoon);
}

/** The moon worn (`getWornMoon`): for "Wearing" marks and Apply. */
export function useWornMoon(): MoonDef {
  return useSyncExternalStore(subscribe, getWornMoon, getWornMoon);
}
