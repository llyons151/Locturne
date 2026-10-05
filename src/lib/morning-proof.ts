/**
 * How a morning was unlocked. Every wake-up method, a pass and the emergency unlock all end
 * the same way: a proof recorded for that morning's key. `lock-controller.ts` reads it and
 * wakes the apps, so adding a method never touches the lock rules.
 */
import { currentMorning, type Morning } from './lock-state.ts';
import { getRoutine, toLockSettings, type Routine, type WakeMethod } from './routine.ts';
import { sharedGet, sharedSet } from './screen-time.ts';

export type ProofKind = WakeMethod | 'pass' | 'emergency';

export type MorningProof = {
  /** `LockState.morningKey` of the morning this unlocks. */
  morningKey: string;
  kind: ProofKind;
  /** When it was recorded, in ms. */
  at: number;
};

const KEY = 'locturne.morningProofs';
/** Enough history for the share card and diagnostics, without growing forever. */
const KEEP = 30;

const listeners = new Set<() => void>();

/**
 * Pure: may this proof be recorded for `morning`, the morning its moment belongs to? Bedtime
 * wins (GAME_PLAN, "Core loop"), so stairs, steps or a scan only count once the morning has
 * started: a walk at 23:30 must not unlock tomorrow. A pass or an emergency unlock is a
 * deliberate choice and counts whenever it was made (a pass used the night before covers the
 * morning).
 *
 * Timing is judged once, here, when `recordProof` saves the proof. A saved proof then counts
 * for its morning (`proofUnlocks`): re-reading its time against a start computed later would
 * take back a morning proven legitimately, after a flight west (07:30 New York is before
 * 07:00 in LA) or an edit that moved morning start later.
 */
export function proofCounts(proof: MorningProof, morning: Morning): boolean {
  if (proof.morningKey !== morning.key) return false;
  if (proof.kind === 'pass' || proof.kind === 'emergency') return true;
  return proof.at >= morning.start.getTime();
}

/** Pure: does this saved proof unlock `morning`? Saved proofs were judged in `recordProof`. */
export function proofUnlocks(proof: MorningProof, morning: Pick<Morning, 'key'>): boolean {
  return proof.morningKey === morning.key;
}

export function getProofs(): MorningProof[] {
  return sharedGet<MorningProof[]>(KEY) ?? [];
}

/** The proof that unlocked this morning, or null. */
export function getProof(morningKey: string): MorningProof | null {
  return getProofs().find((p) => proofUnlocks(p, { key: morningKey })) ?? null;
}

/**
 * Records the first proof for a morning and returns true. Returns false, and records
 * nothing, when the morning already has a proof or this one wouldn't count under the routine
 * in force at `proof.at` (a walk before morning start). Checking here, not only in the
 * screens, means no method can poison a morning by recording too early.
 */
export function recordProof(proof: MorningProof, routine?: Routine): boolean {
  const at = new Date(proof.at);
  // The routine that governs `at`: in force, unless the caller knows a waiting edit's early
  // first night governs it (`routineAt` in lock-controller.ts, which imports this file).
  const morning = currentMorning(at, toLockSettings(routine ?? getRoutine(at)));
  if (!proofCounts(proof, morning)) return false;
  const all = getProofs();
  // A saved proof keeps counting for its morning, so the morning is already unlocked.
  if (all.some((p) => proofUnlocks(p, morning))) return false;
  sharedSet(KEY, [proof, ...all].slice(0, KEEP));
  for (const listener of listeners) listener();
  return true;
}

export function onProofChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
