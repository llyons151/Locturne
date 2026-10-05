import { useLock } from '@/hooks/use-lock';
import type { LockState } from '@/lib/lock-state';
import { getProof, type MorningProof } from '@/lib/morning-proof';
import { getRoutine, type Routine } from '@/lib/routine';

/**
 * What Home shows: the live lock state from `useLock` (which syncs the shields and their
 * words on open, on foreground, on a proof and at each schedule boundary), plus the routine
 * and this morning's proof, read fresh on every render that brings.
 */
export type HomeData = {
  lock: LockState;
  routine: Routine;
  /** This morning's proof, if it's been unlocked. */
  proof: MorningProof | null;
};

export function useHomeState(): HomeData {
  // The React Compiler would cache `getRoutine()` (no reactive inputs) from the first render:
  // Home mounts under onboarding, before a routine exists, and kept showing the default.
  'use no memo';
  const lock = useLock();
  return { lock, routine: getRoutine(), proof: getProof(lock.morningKey) };
}
