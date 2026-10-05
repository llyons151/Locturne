import type { Phase } from '../../lib/lock-state.ts';

export type Stage =
  | { kind: 'morning'; miss?: boolean }
  | { kind: 'unlocked'; morningKey: string }
  | { kind: 'notYet' | 'awake' | 'noCode' | 'asleep' | 'saved' }
  | { kind: 'choose'; source: 'qr' | 'barcode' }
  | { kind: 'register'; source: 'qr' | 'barcode'; expect?: string; miss?: boolean };

/** Reconcile an open scan flow with the live lock without discarding an allowed setup draft. */
export function liveScanStage(
  stored: Stage,
  initial: Stage,
  lock: { phase: Phase; morningKey: string },
  editRefused: boolean,
): Stage {
  if (stored.kind === 'unlocked') {
    return lock.phase === 'day' && lock.morningKey === stored.morningKey ? stored : initial;
  }
  if (stored.kind === 'morning') return initial.kind === 'morning' ? stored : initial;
  if (stored.kind === 'choose' || stored.kind === 'register' || stored.kind === 'saved') {
    return editRefused ? { kind: 'asleep' } : stored;
  }
  return initial;
}
