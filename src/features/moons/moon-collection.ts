import { router, type Href } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

import { getFirstMorning, getMorningsWon, getProofs, onProofChange, proofMorningStart, type MorningProof } from '@/lib/morning-proof';
import { sharedGet, sharedSet } from '@/lib/screen-time';

import { LADDER } from './moon-data';
import { SECRET_STEPS, SECRET_WINDOW_MS, settleLadder, type OwnedMoon, type RareState } from './moon-ladder';

/**
 * The moons you own (docs/reports/Moon collection flow.md). Earned by mornings (moon-ladder.ts),
 * saved in the App Group. No notifications for any of it (user, 2026-11-01): a new moon shows
 * on the morning payoff, and waits in the collection.
 */

const OWNED_KEY = 'locturne.moons.owned';
const RARE_KEY = 'locturne.moons.rare';
const AS_PAGE_KEY = 'locturne.moons.asPage';

/** Limited moons, each earned by getting up on its date. None yet: each needs its own moon art (docs/MOON_ANGLES.md). */
export const LIMITED: readonly { id: string; date: string }[] = [];

/** The secret moon: the ladder's last. */
export const SECRET_MOON = LADDER[LADDER.length - 1] ?? null;

const isWin = (p: MorningProof) => p.kind !== 'pass' && p.kind !== 'emergency';

/** The latest real wake-up, or null before one. */
function latestWin(): MorningProof | null {
  return getProofs().filter(isWin).sort((a, b) => b.at - a.at)[0] ?? null;
}

const listeners = new Set<() => void>();
let snapshot: Record<string, OwnedMoon> | undefined;

export function getOwned(): Record<string, OwnedMoon> {
  snapshot ??= sharedGet<Record<string, OwnedMoon>>(OWNED_KEY) ?? {};
  return snapshot;
}

function saveOwned(owned: Record<string, OwnedMoon>) {
  snapshot = owned;
  sharedSet(OWNED_KEY, owned);
  listeners.forEach((listener) => listener());
}

function getRare(): RareState {
  const saved = sharedGet<RareState>(RARE_KEY);
  if (saved) return saved;
  const fresh: RareState = { due: false, rolled: null, seed: Math.floor(Math.random() * 2 ** 31) };
  sharedSet(RARE_KEY, fresh);
  return fresh;
}

/**
 * Earns every moon due by now: safe to call as often as you like (on opening the payoff, the
 * collection or You, and after each wake-up). Returns the ids earned this time.
 */
export function settleMoons(now = Date.now()): string[] {
  const latest = latestWin();
  const { owned, rare, earned } = settleLadder({
    ladder: LADDER,
    mornings: getMorningsWon(),
    firstMorning: getFirstMorning(),
    latest: latest?.morningKey ?? null,
    owned: getOwned(),
    rare: getRare(),
    limited: LIMITED,
    now,
  });
  const before = getRare();
  if (rare.due !== before.due || rare.rolled !== before.rolled) sharedSet(RARE_KEY, rare);
  if (earned.length) saveOwned(owned);
  return earned;
}

// A wake-up recorded while the app is open earns its moons at once.
onProofChange(() => {
  settleMoons();
  checkSecretMoon().catch(() => {});
});

/**
 * The secret moon: `SECRET_STEPS` from the latest morning's start to `SECRET_WINDOW_MS` after
 * you got up, from the motion chip's history (as the walk reads it). Checked whenever the moons
 * are settled; the payoff and the collection show it when it comes.
 */
export async function checkSecretMoon(now = Date.now()): Promise<boolean> {
  if (Platform.OS !== 'ios' || !SECRET_MOON || getOwned()[SECRET_MOON]) return false;
  const proof = latestWin();
  const start = proof ? proofMorningStart(proof) : null;
  if (!proof || !start) return false;
  const end = Math.min(now, proof.at + SECRET_WINDOW_MS);
  if (end <= start.getTime()) return false;
  const { steps } = await Pedometer.getStepCountAsync(start, new Date(end));
  if (steps < SECRET_STEPS || getOwned()[SECRET_MOON]) return false;
  saveOwned({ ...getOwned(), [SECRET_MOON]: { id: SECRET_MOON, morningKey: proof.morningKey, morning: getMorningsWon(), at: now } });
  return true;
}

export const ownsMoon = (id: string) => !!getOwned()[id];

/**
 * Moons got on this morning and not yet shown on its payoff, the biggest first: the highest
 * rung of the ladder (a long-time user's first look catches up several at once), then the rest.
 */
export function unpresented(morningKey: string): OwnedMoon[] {
  return Object.values(getOwned())
    .filter((m) => m.morningKey === morningKey && !m.presented)
    .sort((a, b) => LADDER.indexOf(b.id) - LADDER.indexOf(a.id));
}

function mark(ids: string[], field: 'presented' | 'seen') {
  const owned = getOwned();
  if (!ids.some((id) => owned[id] && !owned[id][field])) return;
  const next = { ...owned };
  for (const id of ids) if (next[id]) next[id] = { ...next[id], [field]: true };
  saveOwned(next);
}

/** Shown on a payoff: not announced there again. */
export const markPresented = (ids: string[]) => mark(ids, 'presented');
/** Seen in the collection: their "New" goes. */
export const markSeen = (ids: string[]) => mark(ids, 'seen');

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useOwnedMoons(): Record<string, OwnedMoon> {
  return useSyncExternalStore(subscribe, getOwned, getOwned);
}

/** Dev and preview builds: the next ladder moon, as if this morning had brought it. */
export function devEarnNext(): string | null {
  const id = LADDER.find((m) => m && !getOwned()[m]) ?? null;
  if (!id) return null;
  const key = latestWin()?.morningKey ?? new Date().toISOString().slice(0, 10);
  saveOwned({ ...getOwned(), [id]: { id, morningKey: key, morning: Math.max(1, getMorningsWon()), at: Date.now() } });
  return id;
}

/** Dev and preview builds: back to owning nothing. */
export function devForgetMoons() {
  sharedSet(RARE_KEY, null);
  saveOwned({});
}

/** Whether the collection opens as its own page rather than a sheet over the screen (a dev switch for now, user 2026-11-01). */
export function getMoonsAsPage(): boolean {
  return sharedGet<boolean>(AS_PAGE_KEY) === true;
}

export function setMoonsAsPage(on: boolean) {
  sharedSet(AS_PAGE_KEY, on);
}

/** Opens the collection, as a sheet or a page. */
export function openMoons() {
  router.push((getMoonsAsPage() ? '/moon-page' : '/moon-sheet') as Href);
}
