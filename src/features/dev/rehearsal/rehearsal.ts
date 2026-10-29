import { readLock, syncLock } from '@/lib/lock-controller';
import { getRoutine, type WakeMethod } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import { finishRehearsal, getRehearsal, rehearsalHeld, rehearsalMorningIfDue, startRehearsal, type Rehearsal } from '@/lib/screen-time';
import { shieldCopy, shieldTap } from '@/lib/shield-copy';

import { getWakePreview, rehearseTheMorning } from '../wake-lab/wake-preview';

/**
 * You → Rehearse a night (dev and preview builds): a whole night in about 17 minutes on the real
 * native path, so a wake-up method can be tested without sleeping on it (user 2026-10-29). iOS
 * starts and ends a one-off window with Locturne swiped away, the extensions shield a copy of the
 * bedtime apps and put up the morning shield, and the morning is won from the shield's I'm up or
 * from Home, on the real sensors. The night lock, its proofs and the count never see it
 * (`startRehearsal` in screen-time.ts has the native side).
 */

/** A start of iOS's call this late after the morning with nothing noted: iOS never ran the night. */
const NEVER_STARTED_AFTER = 2 * 60_000;

const minuteOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Hands iOS a rehearsal for `method`. Throws what's in the way, in words for an alert. */
export async function rehearse(method: WakeMethod, now = new Date()): Promise<Rehearsal> {
  if (methodInUse(method) !== method) {
    throw new Error(
      method === 'scan'
        ? 'No code saved yet, so a scan morning would be a walk. Set one up in Routine first.'
        : 'No place picked yet, so a place morning would be a walk. Pick one in Routine first.',
    );
  }
  // The real lock's night or morning, now or before this one's over, would hold the same apps.
  const after = new Date(now.getTime() + 20 * 60_000);
  for (const at of [now, after]) {
    const { phase } = readLock(at);
    if (phase === 'night' || phase === 'morning') {
      throw new Error('Your real night or morning is on, or starts within 20 minutes. Rehearse in the day.');
    }
  }
  const routine = getRoutine();
  const wakeAt = (d: Date) => ({ ...routine, method, morningStart: minuteOf(d) });
  return startRehearsal({
    method,
    stepGoal: routine.stepGoal,
    night: (end) => shieldCopy('night', wakeAt(end)),
    morning: (end) => shieldCopy('morning', wakeAt(end)),
    tap: shieldTap('morning'),
    now,
  });
}

/**
 * Picks a rehearsal back up whenever Locturne opens: won from the shield while it was closed, it's
 * finished; past its morning start, Home opens its test morning; never started by iOS, it's ended
 * so the report says so.
 */
export function resumeRehearsal(now = new Date()): void {
  const r = getRehearsal();
  if (!r) return;
  if (r.wonAt !== undefined) {
    finishRehearsal(now);
    syncLock(now);
    return;
  }
  if (!rehearsalHeld(r)) {
    if (now.getTime() > r.end + NEVER_STARTED_AFTER) {
      finishRehearsal(now);
      syncLock(now);
    }
    return;
  }
  if (now.getTime() < r.end) return;
  rehearsalMorningIfDue(now);
  const preview = getWakePreview();
  if (preview.phase !== 'morning' || preview.since !== r.end) rehearseTheMorning(r.method as WakeMethod, r.end);
}
