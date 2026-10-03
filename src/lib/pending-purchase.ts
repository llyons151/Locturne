/**
 * A purchase waiting for someone else (Ask to Buy, or a bank check). Remembered so Home can
 * say why nothing is scheduled yet, instead of a bare "Bedtime isn't scheduled". Nothing
 * arms until the subscription is real (`armIfPaid`). Ask to Buy requests expire, so after
 * `PENDING_FOR_MS` the note stops showing and Home falls back to the plain status.
 */
import { sharedGet, sharedRemove, sharedSet } from './screen-time.ts';

const KEY = 'locturne.purchasePendingAt';
export const PENDING_FOR_MS = 48 * 60 * 60 * 1000;

export function markPurchasePending(now = Date.now()): void {
  sharedSet(KEY, now);
}

export function clearPurchasePending(): void {
  sharedRemove(KEY);
}

export function isPurchasePending(now = Date.now()): boolean {
  const at = sharedGet<number>(KEY);
  return typeof at === 'number' && now - at < PENDING_FOR_MS;
}
