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

const REPORTED_KEY = 'locturne.purchasePendingReported';

/**
 * True the first time a waiting purchase is found paid, then false until another one waits:
 * `purchase_result` for an approval that landed after the paywall closed is sent once
 * (docs/ANALYTICS.md, `page: later`). Onboarding takes it too when it finishes a purchase or
 * restore itself, so the same approval isn't counted twice. Doesn't clear the waiting note:
 * arming does that (arm.ts).
 */
export function takePendingApproval(now = Date.now()): boolean {
  const at = sharedGet<number>(KEY);
  if (typeof at !== 'number' || now - at >= PENDING_FOR_MS) return false;
  if (sharedGet<number>(REPORTED_KEY) === at) return false;
  sharedSet(REPORTED_KEY, at);
  return true;
}
