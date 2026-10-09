import type { Phase } from '../../lib/lock-state.ts';

export type Stage =
  | { kind: 'morning'; miss?: boolean }
  | { kind: 'unlocked'; morningKey: string }
  | { kind: 'notYet' | 'awake' | 'noCode' | 'asleep' | 'saved' }
  | { kind: 'choose'; source: 'qr' | 'barcode' }
  | { kind: 'register'; source: 'qr' | 'barcode'; expect?: string; miss?: boolean };

/**
 * Reconcile an open scan flow with the live lock without discarding an allowed setup draft.
 * A draft (choose, register) is refused from bed; a saved code is finished, so 'saved' stays
 * (its words are recomputed live) rather than turning into "Not from bed" at bedtime.
 */
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
  if (stored.kind === 'saved') return stored;
  if (stored.kind === 'choose' || stored.kind === 'register') {
    return editRefused ? { kind: 'asleep' } : stored;
  }
  return initial;
}
