/**
 * How a morning was unlocked. Every wake-up method, a pass and the emergency unlock all end
 * the same way: a proof recorded for that morning's key. `lock-controller.ts` reads it and
 * wakes the apps, so adding a method never touches the lock rules.
 */
import { currentMorning, nightInto, type Morning } from './lock-state.ts';
import { getRoutine, toLockSettings, type Routine, type WakeMethod } from './routine.ts';
import { sharedGet, sharedSet } from './screen-time.ts';

export type ProofKind = WakeMethod | 'pass' | 'emergency';

export type MorningProof = {
  /** `LockState.morningKey` of the morning this unlocks. */
  morningKey: string;
  kind: ProofKind;
  /** When it was recorded, in ms. */
  at: number;
  /**
   * The bedtime and morning start of the routine `recordProof` judged it under, in minutes
   * since midnight. `proofUnlocks` finds the night into `morningKey` from these, so a routine
   * saved since can't move it. Missing on proofs saved before they were kept.
   */
  bedtime?: number;
  morningStart?: number;
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
 * Timing is judged here, when `recordProof` saves the proof. Afterwards a saved proof is read
 * by `proofUnlocks`, which asks a weaker question: re-reading its time against a morning start
 * computed later would take back a morning proven legitimately, after a flight west (07:30 New
 * York is before 07:00 in LA) or an edit that moved morning start later.
 */
export function proofCounts(proof: MorningProof, morning: Morning): boolean {
  if (proof.morningKey !== morning.key) return false;
  if (proof.kind === 'pass' || proof.kind === 'emergency') return true;
  return proof.at >= morning.start.getTime();
}

/**
 * Pure: does this saved proof unlock `morning`, as worked out in the zone and routine of now?
 * Its timing against morning start was judged when it was saved (`proofCounts`). A stairs,
 * steps or scan proof still has to come after the start of the night that leads into
 * `morning`: no bedtime may have begun here since it. A flight west over the date line (07:30
 * Oct 6 in Sydney, then LA's Oct 5 23:00 to Oct 6 07:00) replays the same morning key after a
 * whole new night, and that morning needs its own wake-up. A same-day flight west keeps the
 * proof: LA's night began at 02:00 New York time, before a 07:30 walk there.
 *
 * That night is the one the proof was made under: its routine's times (saved by
 * `recordProof`), in the zone of now. A switch to a night shift (08:00 to 16:00) that applies
 * after the walk names the same morning again, with a night that started at 08:00 that day,
 * after the 07:30 walk; that night was never slept under the new routine, so it doesn't take
 * the morning back. A proof saved without the times goes by `morning.nightStart`.
 *
 * A pass or an emergency unlock is tied to its morning, not to a moment after bedtime (a pass
 * used the evening before covers the morning), so it counts for its key whenever it was made.
 */
export function proofUnlocks(proof: MorningProof, morning: Pick<Morning, 'key' | 'nightStart'>): boolean {
  if (proof.morningKey !== morning.key) return false;
  if (proof.kind === 'pass' || proof.kind === 'emergency') return true;
  const { bedtime, morningStart } = proof;
  const nightStart =
    bedtime === undefined || morningStart === undefined
      ? morning.nightStart
      : nightInto(proof.morningKey, { bedtime, morningStart }).start;
  return proof.at >= nightStart.getTime();
}

export function getProofs(): MorningProof[] {
  return sharedGet<MorningProof[]>(KEY) ?? [];
}

/**
 * The proof that unlocked `morning` (`currentMorning` under the routine governing now), or
 * null. `currentProof` (lock-controller.ts) asks it for the morning under way.
 */
export function getProof(morning: Pick<Morning, 'key' | 'nightStart'>): MorningProof | null {
  return getProofs().find((p) => proofUnlocks(p, morning)) ?? null;
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
  const judged = routine ?? getRoutine(at);
  const morning = currentMorning(at, toLockSettings(judged));
  if (!proofCounts(proof, morning)) return false;
  // Saved with the times it was judged under, for `proofUnlocks`.
  const saved: MorningProof = { ...proof, bedtime: judged.bedtime, morningStart: judged.morningStart };
  const all = getProofs();
  // A saved proof that still unlocks this morning means it's already unlocked. One from before
  // this morning's night began (the date replayed after a flight west) doesn't block this one.
  if (all.some((p) => proofUnlocks(p, morning))) return false;
  sharedSet(KEY, [saved, ...all].slice(0, KEEP));
  for (const listener of listeners) listener();
  return true;
}

export function onProofChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
