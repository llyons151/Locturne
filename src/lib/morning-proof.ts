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
 * Pure: does this proof unlock `morning`? Bedtime wins (GAME_PLAN, "Core loop"), so stairs,
 * steps or a scan only count once the morning has started: a walk at 23:30 must not unlock
 * tomorrow. A pass or an emergency unlock is a deliberate choice and counts whenever it was
 * made (a pass used the night before covers the morning).
 */
export function proofCounts(proof: MorningProof, morning: Morning): boolean {
  if (proof.morningKey !== morning.key) return false;
  if (proof.kind === 'pass' || proof.kind === 'emergency') return true;
  return proof.at >= morning.start.getTime();
}

export function getProofs(): MorningProof[] {
  return sharedGet<MorningProof[]>(KEY) ?? [];
}

/** The proof that unlocked this morning, or null. Only proofs that count are returned. */
export function getProof(morningKey: string, morning?: Morning): MorningProof | null {
  return (
    getProofs().find((p) => p.morningKey === morningKey && (!morning || proofCounts(p, morning))) ?? null
  );
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
  // Only a proof that still counts blocks another. One that stopped counting (made before a
  // timezone change or a routine edit moved this morning's start later) must not leave the
  // morning locked with no way out, not even the emergency unlock.
  if (all.some((p) => p.morningKey === proof.morningKey && proofCounts(p, morning))) return false;
  sharedSet(KEY, [proof, ...all].slice(0, KEEP));
  for (const listener of listeners) listener();
  return true;
}

export function onProofChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
