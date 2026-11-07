import { readLock, syncLock } from '@/lib/lock-controller';
import { getRoutine, type WakeMethod } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import {
  finishRehearsal,
  getRehearsal,
  rehearsalHeld,
  rehearsalMorningIfDue,
  rehearsalOverdue,
  startRehearsal,
  type Rehearsal,
} from '@/lib/screen-time';
import { shieldCopy, shieldTap } from '@/lib/shield-copy';
import { DOWNTIME_STEPS } from '@/lib/wake/downtime';

import { endRehearsal, getWakePreview, rehearsalWonOnShield, rehearseTheMorning, rehearseTheNight } from '../wake-lab/wake-preview';

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

/** Hands iOS a rehearsal for `method`, `quick` or a full 15 minutes. Throws what's in the way, in words for an alert. */
export async function rehearse(method: WakeMethod, quick = false, now = new Date()): Promise<Rehearsal> {
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
  // Step away's rehearsal morning is its steps with no timer after (`locturneRehearsalCheck`), so
  // its shield can't promise one (user 2026-11-06: 30 steps, then 200 after a tap).
  const morning = (end: Date) => {
    const words = shieldCopy('morning', wakeAt(end));
    return method === 'downtime' ? { ...words, subtitle: `Walk ${DOWNTIME_STEPS} steps, then tap I’m up. No timer in a rehearsal.` } : words;
  };
  return startRehearsal({
    method,
    stepGoal: method === 'downtime' ? DOWNTIME_STEPS : routine.stepGoal,
    night: (end) => shieldCopy('night', wakeAt(end)),
    morning,
    tap: shieldTap('morning'),
    quick,
    now,
  });
}

/**
 * Picks a rehearsal back up whenever Locturne opens (and every 15 s while it's open): won from the
 * shield, it's finished and Home shows the payoff; asleep, Home shows its night; past its morning
 * start, Home opens its test morning; never started by iOS, it's ended so the report says so.
 */
export function resumeRehearsal(now = new Date()): void {
  const r = getRehearsal();
  if (!r) return;
  if (r.wonAt !== undefined) {
    finishRehearsal(now);
    syncLock(now);
    if (r.wonBy === 'shield') rehearsalWonOnShield(r.method as WakeMethod, r.wonAt);
    return;
  }
  if (!rehearsalHeld(r)) {
    if (now.getTime() > r.end + NEVER_STARTED_AFTER) {
      finishRehearsal(now);
      syncLock(now);
    }
    return;
  }
  // Forgotten: given up, so the copy wakes (`REHEARSAL_GIVE_UP_MS`). The extension does the same
  // on its next callback if Locturne stays closed.
  if (rehearsalOverdue(r, now)) {
    endRehearsal();
    return;
  }
  const preview = getWakePreview();
  if (now.getTime() < r.end) {
    if (preview.phase !== 'night' || preview.since !== r.end) rehearseTheNight(r.method as WakeMethod, r.end);
    return;
  }
  rehearsalMorningIfDue(now);
  if (preview.phase !== 'morning' || preview.since !== r.end) rehearseTheMorning(r.method as WakeMethod, r.end);
}
