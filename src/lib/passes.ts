/**
 * Passes (GAME_PLAN, "Humane exits"): the only way out early, two a month, for a sick day,
 * travel, a baby asleep in the room or a real emergency. In the morning one wakes this
 * morning's apps without the wake-up method (`spendPass`). At night it wakes the bedtime apps
 * for the rest of tonight and the morning after; at any time it ends a Block now session
 * (`redeemPass`, through the night pause in emergency.ts). It never lifts the always-blocked list.
 * Decided 2026-10-14: no unlimited emergency unlock, because a free way out is the loophole
 * that made other blockers fail for the people who need one.
 *
 * The allowance belongs to the month of the *morning* a pass unlocks, not the wall clock.
 * With a 01:00 bedtime, 00:30 on November 1 still belongs to October 31's morning, so a pass
 * used then comes out of October. There is no reset job: last month's passes simply stop
 * counting once the morning's month changes.
 *
 * The accounting here is pure; `spendPass` at the bottom applies it.
 */
import { endNap, getNap, sharedGet, sharedSet } from './screen-time.ts';
import { judgedAt, pastLastPaid, readLock, syncLock } from './lock-controller.ts';
import type { LockState } from './lock-state.ts';
import { recordProof } from './morning-proof.ts';
import { emergencyUnlock, previewEmergency, type EmergencyUse } from './emergency.ts';

/**
 * Passes per month (decided 2026-10-14). A morning pass lasts the rest of that morning, until
 * the next bedtime; a night pass lasts the rest of the night and the morning after it.
 */
export const PASSES_PER_MONTH = 2;

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

/**
 * Why a pass can't be used right now, or null if it can. `notMorning` is the morning rule
 * alone (`passRefusal`); `nothingAsleep` is the whole picture (`getPassRefusal`): no morning
 * to wake, no night under way and no Block now running.
 */
export type PassRefusal = 'notMorning' | 'noneLeft' | 'alreadyUsed' | 'nothingAsleep';

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

/**
 * The phase as a pass sees it: a morning after the last one a lapsed subscription covers
 * (`pastLastPaid`) holds nothing, since the extension skips its night, so there's nothing for
 * a pass to wake and none is spent on it.
 */
function passPhase(state: LockState): string {
  return pastLastPaid(state.morningKey) ? 'day' : state.phase;
}

/**
 * What a pass would lift now, outside a held morning: the rest of tonight, a Block now
 * session, or both (`previewEmergency`). Null in a held morning (`spendPass` covers it) or
 * when nothing is asleep.
 */
export function previewPass(now = new Date()) {
  return passPhase(readLock(now)) === 'morning' ? null : previewEmergency(now);
}

/** Why a pass can't be used now, or null. */
export function getPassRefusal(now = new Date()): PassRefusal | null {
  const state = readLock(now);
  const ledger = getPassLedger();
  if (passPhase(state) === 'morning') return passRefusal(ledger, 'morning', state.morningKey);
  if (!previewEmergency(now)) return 'nothingAsleep';
  return passesLeft(ledger, state.morningKey) === 0 ? 'noneLeft' : null;
}

/**
 * Uses a pass on whatever is asleep: this morning (`spendPass`), or the rest of tonight and a
 * running Block now (the night pause, logged in the emergency log for diagnostics). Returns the
 * refusal when it can't be used, or the night use for the screen's wording.
 */
export function redeemPass(now = new Date()): { refusal: PassRefusal } | { refusal: null; night: EmergencyUse | null } {
  const state = readLock(now);
  if (passPhase(state) === 'morning') {
    const refusal = spendPass(now);
    return refusal ? { refusal } : { refusal: null, night: null };
  }
  const refusal = getPassRefusal(now);
  if (refusal) return { refusal };
  const use = emergencyUnlock(now);
  if (!use) return { refusal: 'nothingAsleep' };
  sharedSet(KEY, withSpent(getPassLedger(), state.morningKey, now.getTime()));
  return { refusal: null, night: use };
}

/**
 * Spends a pass on this morning: records it as the morning's proof and wakes the apps. A
 * running Block now session ends too (GAME_PLAN: only a pass can end one early). Returns the
 * refusal instead when it can't be used.
 */
export function spendPass(now = new Date()): PassRefusal | null {
  const state = readLock(now);
  const ledger = getPassLedger();
  const refusal = passRefusal(ledger, passPhase(state), state.morningKey);
  if (refusal) return refusal;
  sharedSet(KEY, withSpent(ledger, state.morningKey, now.getTime()));
  recordProof({ morningKey: state.morningKey, kind: 'pass', at: now.getTime() }, judgedAt(now));
  if (getNap()) endNap();
  syncLock(now);
  return null;
}
