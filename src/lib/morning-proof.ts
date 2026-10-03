/**
 * How a morning was unlocked. Every wake-up method, a pass and the emergency unlock all end
 * the same way: a proof recorded for that morning's key. `lock-controller.ts` reads it and
 * wakes the apps, so adding a method never touches the lock rules.
 */
import type { WakeMethod } from './routine.ts';
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

export function getProofs(): MorningProof[] {
  return sharedGet<MorningProof[]>(KEY) ?? [];
}

export function getProof(morningKey: string): MorningProof | null {
  return getProofs().find((p) => p.morningKey === morningKey) ?? null;
}

/** Records the first proof for a morning. Later ones for the same morning are ignored. */
export function recordProof(proof: MorningProof): void {
  const all = getProofs();
  if (all.some((p) => p.morningKey === proof.morningKey)) return;
  sharedSet(KEY, [proof, ...all].slice(0, KEEP));
  for (const listener of listeners) listener();
}

export function onProofChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
