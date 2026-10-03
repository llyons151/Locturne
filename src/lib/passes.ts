/**
 * Passes (GAME_PLAN, "Humane exits"): a few a month for a sick day, travel or a baby asleep
 * in the room. One wakes this morning's apps without the wake-up method. It never works at
 * night (bedtime wins) and never lifts the always-blocked list.
 *
 * The allowance belongs to the month of the *morning* a pass unlocks, not the wall clock.
 * With a 01:00 bedtime, 00:30 on November 1 still belongs to October 31's morning, so a pass
 * used then comes out of October. There is no reset job: last month's passes simply stop
 * counting once the morning's month changes.
 *
 * The accounting here is pure; `spendPass` at the bottom applies it.
 */
import { endNap, getNap, sharedGet, sharedSet } from './screen-time.ts';
import { readLock, syncLock } from './lock-controller.ts';
import { recordProof } from './morning-proof.ts';

/**
 * Passes per month. Open decision #4 in GAME_PLAN ("how many a month and how long each
 * lasts"): 3 is a placeholder to tune with beta data. A pass lasts the rest of that morning,
 * until the next bedtime.
 */
export const PASSES_PER_MONTH = 3;

export type SpentPass = {
  /** `LockState.morningKey` of the morning it unlocked, YYYY-MM-DD. */
  morningKey: string;
  /** When it was used, in ms. */
  at: number;
};

export type PassLedger = { spent: SpentPass[] };

/** Enough history for a year of diagnostics, without growing forever. */
const KEEP = 40;

/** The month a morning belongs to, YYYY-MM. */
export const monthOf = (morningKey: string) => morningKey.slice(0, 7);

/** Pure: passes left in the month of `morningKey`. */
export function passesLeft(ledger: PassLedger | undefined, morningKey: string): number {
  const month = monthOf(morningKey);
  const used = (ledger?.spent ?? []).filter((p) => monthOf(p.morningKey) === month).length;
  return Math.max(0, PASSES_PER_MONTH - used);
}

/** Why a pass can't be used right now, or null if it can. */
export type PassRefusal = 'notMorning' | 'noneLeft' | 'alreadyUsed';

export function passRefusal(ledger: PassLedger | undefined, phase: string, morningKey: string): PassRefusal | null {
  if (ledger?.spent.some((p) => p.morningKey === morningKey)) return 'alreadyUsed';
  // Night: bedtime wins. Day or off: nothing for a pass to wake.
  if (phase !== 'morning') return 'notMorning';
  if (passesLeft(ledger, morningKey) === 0) return 'noneLeft';
  return null;
}

/** Pure: the ledger with a pass spent on `morningKey`. Check `passRefusal` first. */
export function withSpent(ledger: PassLedger | undefined, morningKey: string, at: number): PassLedger {
  return { spent: [{ morningKey, at }, ...(ledger?.spent ?? [])].slice(0, KEEP) };
}

/* Applying it: the App Group record, so it survives reinstalls of the JS and app restarts. */

const KEY = 'locturne.passes';

export function getPassLedger(): PassLedger {
  return sharedGet<PassLedger>(KEY) ?? { spent: [] };
}

/** Passes left for the month of the morning `now` belongs to. */
export function getPassesLeft(now = new Date()): number {
  return passesLeft(getPassLedger(), readLock(now).morningKey);
}

/** Why a pass can't be used now, or null. */
export function getPassRefusal(now = new Date()): PassRefusal | null {
  const state = readLock(now);
  return passRefusal(getPassLedger(), state.phase, state.morningKey);
}

/**
 * Spends a pass on this morning: records it as the morning's proof and wakes the apps. A
 * running Block now session ends too (GAME_PLAN: only a pass or an emergency unlock can end
 * one early). Returns the refusal instead when it can't be used.
 */
export function spendPass(now = new Date()): PassRefusal | null {
  const state = readLock(now);
  const ledger = getPassLedger();
  const refusal = passRefusal(ledger, state.phase, state.morningKey);
  if (refusal) return refusal;
  sharedSet(KEY, withSpent(ledger, state.morningKey, now.getTime()));
  recordProof({ morningKey: state.morningKey, kind: 'pass', at: now.getTime() });
  if (getNap()) endNap();
  syncLock(now);
  return null;
}
