import { router, type Href } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { getFirstMorning, getMorningsWon, getProofs, onProofChange, type MorningProof } from '@/lib/morning-proof';
import { sharedGet, sharedSet } from '@/lib/screen-time';

import { LADDER } from './moon-data';
import { RARE_MOONS, SECRET_FROM, SECRET_RULES, secretsMet, settleLadder, type OwnedMoon, type RareState, type SecretRule } from './moon-ladder';

/**
 * The moons you own (docs/reports/Moon collection flow.md). Earned by mornings (moon-ladder.ts),
 * saved in the App Group. No notifications for any of it (user, 2026-11-01): a new moon shows
 * on the morning payoff, and waits in the collection.
 */

const OWNED_KEY = 'locturne.moons.owned';
const RARE_KEY = 'locturne.moons.rare';
const AS_PAGE_KEY = 'locturne.moons.asPage';
/** The farthest Home's live location has seen you from your place, this place morning. */
const FARTHEST_KEY = 'locturne.moons.farthest';

/** Limited moons, each earned by getting up on its date. None yet: each needs its own moon art (docs/MOON_ANGLES.md). */
export const LIMITED: readonly { id: string; date: string }[] = [];

/** The secret moons, by their rule: the ladder's slots after the Eclipse (moon-ladder.ts `SECRET_RULES`). */
export const SECRET_MOONS: readonly { rule: SecretRule; id: string }[] = SECRET_RULES.flatMap((rule, i) => {
  const id = LADDER[SECRET_FROM + i];
  return id ? [{ rule, id }] : [];
});
export const isSecret = (id: string) => SECRET_MOONS.some((s) => s.id === id);

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
  const fresh: RareState = { due: [], rolled: null, seed: Math.floor(Math.random() * 2 ** 31) };
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
  if (JSON.stringify(rare.due) !== JSON.stringify(before.due) || rare.rolled !== before.rolled) sharedSet(RARE_KEY, rare);
  if (earned.length) saveOwned(owned);
  return earned;
}

// A wake-up recorded while the app is open earns its moons at once.
onProofChange(() => {
  settleMoons();
  checkSecretMoons();
});

/**
 * Home's live location on a place morning (use-morning-place.ts): keeps the farthest it has
 * seen you from the place, this morning, for the `far` secret.
 */
export function noteFarthest(morningKey: string, metres: number) {
  const saved = sharedGet<{ morningKey: string; metres: number }>(FARTHEST_KEY);
  if (saved?.morningKey === morningKey && saved.metres >= metres) return;
  sharedSet(FARTHEST_KEY, { morningKey, metres: Math.round(metres) });
}

/**
 * The secret moons (moon-ladder.ts `secretsMet`), from the latest real wake-up. Checked whenever
 * a wake-up is recorded and when the collection opens; the payoff and the collection show one
 * when it comes. Returns the ids earned this time.
 */
export function checkSecretMoons(now = Date.now()): string[] {
  const owned = getOwned();
  const open = SECRET_MOONS.filter((s) => !owned[s.id]);
  const proof = latestWin();
  if (!open.length || !proof) return [];
  const far = sharedGet<{ morningKey: string; metres: number }>(FARTHEST_KEY);
  const met = secretsMet({
    kind: proof.kind,
    hour: new Date(proof.at).getHours(),
    // The code that morning's scan matched, kept on its proof: the code saved now could be a Coke
    // can set up after an ordinary scan morning.
    scanned: proof.kind === 'scan' ? (proof.code ?? null) : null,
    farthest: far?.morningKey === proof.morningKey ? far.metres : null,
  });
  const earned = open.filter((s) => met.includes(s.rule)).map((s) => s.id);
  if (!earned.length) return [];
  const next = { ...owned };
  for (const id of earned) next[id] = { id, morningKey: proof.morningKey, morning: getMorningsWon(), at: now };
  saveOwned(next);
  return earned;
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

/** Dev and preview builds: every moon on the ladder, the secrets and the rare ones, for testing the collection. */
export function devEarnAll(): number {
  const key = latestWin()?.morningKey ?? new Date().toISOString().slice(0, 10);
  const next = { ...getOwned() };
  let added = 0;
  for (const id of [...LADDER, ...RARE_MOONS]) {
    if (!id || next[id]) continue;
    next[id] = { id, morningKey: key, morning: Math.max(1, getMorningsWon()), at: Date.now() };
    added++;
  }
  if (added) saveOwned(next);
  return added;
}

/** Dev and preview builds: back to owning nothing. */
export function devForgetMoons() {
  sharedSet(RARE_KEY, null);
  saveOwned({});
}

/** The collection's background: black, as the rest of the app reads, not the theme's navy (user, 2026-11-01). */
export const MOONS_BG = '#000000';

/** Whether the collection opens as its own page (the default, user 2026-11-01) rather than a sheet over the screen. */
export function getMoonsAsPage(): boolean {
  return sharedGet<boolean>(AS_PAGE_KEY) !== false;
}

export function setMoonsAsPage(on: boolean) {
  sharedSet(AS_PAGE_KEY, on);
}

/** Opens the collection, as a sheet or a page. */
export function openMoons() {
  router.push((getMoonsAsPage() ? '/moon-page' : '/moon-sheet') as Href);
}
