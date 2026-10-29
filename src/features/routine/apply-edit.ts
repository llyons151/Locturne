import { Alert } from 'react-native';

import { armIfPaid } from '@/hooks/use-app-start';
import { heldPhase } from '@/lib/emergency';
import { armRoutine, inPendingFirstNight, readLock, syncLock, wouldArmOnEdit } from '@/lib/lock-controller';
import { dateKey, nightInto, nightsAround, wallClock } from '@/lib/lock-state';
import { getProofs } from '@/lib/morning-proof';
import { rescheduleNotifications } from '@/lib/notifications';
import { getPendingRoutine, getRoutine, nightMinutes, nightTooLong, nightTooShort, saveRoutine, toLockSettings, type Routine } from '@/lib/routine';
import { editRefusal } from '@/lib/scan';
import { getArmedNight } from '@/lib/screen-time';

/** What the person has set: the edit waiting for the next bedtime, or the routine in force. */
export function getSetRoutine(now = new Date()): Routine {
  return getPendingRoutine(now)?.routine ?? getRoutine(now);
}

/**
 * The routine can't be changed while the apps are asleep: a held night, or a morning not yet
 * proven (user, 2026-10-15: "You can't change your schedule while you're sleeping"). Awake, a
 * change applies at once. The same rule as setting up a code or a place (`editRefusal`). A night
 * nothing holds (switched off, paused by a pass, never bought) is awake.
 */
export function routineEditRefusal(now = new Date()): 'asleep' | null {
  return editRefusal(heldPhase(readLock(now).phase, now));
}

/** The words for a change refused from bed, wherever one is tried. */
export const ASLEEP_NOTE = 'Your apps are asleep. You can change your routine once you’re up.';

/** For edits made outside the Routine tab (the You tab's step target, the push-ups sheet): says why nothing changed. */
export function refuseWhileAsleep(now = new Date()): boolean {
  if (!routineEditRefusal(now)) return false;
  Alert.alert('Your apps are asleep', 'You can change your routine once you’re up.');
  return true;
}

/**
 * Would `next` put the apps to sleep the moment it's saved? Says which end moved into now:
 * 'night' (a bedtime moved earlier than now, or tonight switched back on) or 'morning' (a
 * morning moved later than now, before it was proven). Null when now is outside its nights,
 * or nothing would hold one: no night armed and none the save would arm (`wouldArmOnEdit`), or
 * one `heldPhase` lets through (paused by a
 * pass, an empty bedtime list, a lapsed subscription), or a morning already proven. The
 * Routine tab asks first.
 */
export function sleepsAtOnce(next: Routine, now = new Date()): 'night' | 'morning' | null {
  // Nothing armed (every night was off): saving arms through `armIfPaid`, which shields at once.
  const armed = getArmedNight() !== null;
  if (!armed && !wouldArmOnEdit()) return null;
  const { latest } = nightsAround(now, toLockSettings(next));
  if (!(now >= latest.start && now < latest.end)) return null;
  // Its evening: the day before the morning it leads into.
  if (!next.activeNights.includes(wallClock(latest.end, 0, -1).getDay())) return null;
  // `heldPhase` reads a night nothing has armed yet as awake: only an armed one can be let through.
  if (armed && heldPhase('night', now) !== 'night') return null;
  // Already up this morning: a later morning start doesn't take the proof back.
  const key = dateKey(latest.end);
  if (getProofs().some((p) => p.morningKey === key && p.at >= latest.start.getTime() && p.at <= now.getTime())) return null;
  // The old routine's morning into the same day has come and gone: the morning moved.
  const old = nightInto(key, toLockSettings(getSetRoutine(now)));
  return old.end <= now ? 'morning' : 'night';
}

/**
 * Saves an edit to the routine, from the Routine tab or the You tab's step target. While the
 * apps are asleep it's refused (`routineEditRefusal`): resolves false and nothing changes.
 * Awake, it applies at once, even one whose night has already begun (`sleepsAtOnce`, which the
 * Routine tab asks about first): the apps go to sleep now. Either way iOS is handed the new
 * windows. Resolves once arming settles. With nothing saved yet the tabs show the default
 * routine, so the edit is saved over it as the first routine.
 */
export function applyRoutineEdit(next: Routine): Promise<boolean> {
  const savedAt = new Date();
  if (routineEditRefusal(savedAt)) return Promise.resolve(false);
  // The dial can't make one, but nothing else may either (`MIN_NIGHT`, `MAX_NIGHT`). Only times
  // that change are judged, and a routine saved outside the rules before them may still move
  // toward them, so its other settings (method, nights, step goal) stay editable.
  const current = getSetRoutine(savedAt);
  const moved = next.bedtime !== current.bedtime || next.morningStart !== current.morningStart;
  const nextSpan = nightMinutes(next.bedtime, next.morningStart);
  const currentSpan = nightMinutes(current.bedtime, current.morningStart);
  if (moved && nightTooShort(next.bedtime, next.morningStart) && nextSpan <= currentSpan) return Promise.resolve(false);
  if (moved && nightTooLong(next.bedtime, next.morningStart) && nextSpan >= currentSpan) return Promise.resolve(false);
  // Inside a waiting edit's early first night (from before edits were refused from bed), that
  // edit governs tonight: this one waits for its next bedtime rather than handing tonight back
  // to the old, later bedtime.
  saveRoutine(next, savedAt, inPendingFirstNight(savedAt), true, true);
  // The shield words the extension copies later (tonight's, the morning's) follow the saved
  // routine: rewrite them now, even when the windows stay as they are (`kept`).
  syncLock();
  // `armRoutine` hands iOS the windows for the routine in force at the next bedtime; if iOS
  // refuses, the old windows stay and the next sync retries. Nothing armed yet means nothing
  // was bought yet (or the night was lost): only a subscription arms it, or leaving
  // onboarding at the paywall and saving here would lock tonight for free.
  let settled: Promise<unknown>;
  if (getArmedNight()) {
    // Synced again once the new windows are armed: a night that has already begun under the
    // edit sleeps the apps now, which needs those windows in place (`syncLock`).
    settled = armRoutine()
      .then(() => syncLock())
      .catch(() => {});
  } else {
    armIfPaid();
    settled = Promise.resolve();
  }
  rescheduleNotifications().catch(() => {});
  return settled.then(() => true);
}
