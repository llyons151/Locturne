/**
 * Touch grass and Sunlight (wake/photo.ts): a photo that passed records this morning's proof and
 * wakes the apps, like a matched scan (scan.ts). Only in `morning` (bedtime wins) and only on a
 * morning whose way is that photo: a grass photo is no way out of a push-up morning.
 */
import { judgedAt, pastLastPaid, readLock, syncLock } from './lock-controller.ts';
import { recordProof } from './morning-proof.ts';
import type { PhotoKind } from './wake/photo.ts';

export type PhotoResult = 'unlocked' | 'notMorning' | 'notMethod';

export function submitPhoto(kind: PhotoKind, now = new Date()): PhotoResult {
  const state = readLock(now);
  // A morning after the last one a lapsed subscription covers holds nothing (`pastLastPaid`).
  if (state.phase !== 'morning' || pastLastPaid(state.morningKey)) return 'notMorning';
  if (judgedAt(now).routine.method !== kind) return 'notMethod';
  recordProof({ morningKey: state.morningKey, kind, at: now.getTime() }, judgedAt(now));
  syncLock(now);
  return 'unlocked';
}
