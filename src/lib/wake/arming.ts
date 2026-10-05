/**
 * Which night windows iOS should be monitoring, and whether it's safe to hand them over
 * right now. `armRoutine` in lock-controller.ts carries the answer out.
 *
 * Pure: no clock, storage or Screen Time calls, so it runs in the tests.
 *
 * The windows (night-plan.ts) repeat every day at fixed clock times, and each one shields the
 * bedtime apps when it starts. Two things follow:
 *
 * 1. They follow the routine that governs the *next* night. A routine edit waits for the next
 *    bedtime (routine.ts), and from that instant the pending routine is in force, so that's
 *    the one to arm.
 * 2. Swapping them at the wrong moment re-shields apps the rules say are awake. Say the
 *    morning moves from 7:00 to 8:00 and the edit is saved at 7:05, after the walk. The new
 *    windows include one starting at 7:15, which would put the apps back to sleep for a
 *    "night" that, under the routine still in force, is already over. So when the new
 *    windows would fire inside such a phantom night before the edit applies, arming waits
 *    (`defer`) and the next sync tries again. Firing a little early on the night the edit
 *    applies (an earlier bedtime) is allowed: it only tightens, once.
 */
import { armedBedtime, dateKey, nightInto, nightsAround, type LockSettings } from '../lock-state.ts';
import { planNightWindows, type NightWindow } from '../night-plan.ts';

/** The parts of a routine the windows depend on. */
export type ArmTimes = { bedtime: number; morningStart: number; activeNights: number[] };

/** What iOS has now, from `getArmedNight` and `armedWindowNames`. */
export type ArmedNow = {
  bedtime: number;
  morningStart: number;
  windows: number;
  live: number;
  /** They're the waiting edit's own, armed early for it (`armedForEdit`, routine.ts). */
  edit?: boolean;
  /** Armed before the routine in force took over: an older routine's (`runsAs`, routine.ts). */
  older?: boolean;
} | null;

export type ArmPlan =
  /** Already monitoring the right windows. */
  | { action: 'keep' }
  /** No night is on, or the night is too short to monitor, from now on: stop every window. */
  | { action: 'disarm' }
  /** Arming now would re-shield a phantom night. Try again at or after `until`. */
  | { action: 'defer'; until: Date }
  | { action: 'arm'; times: ArmTimes; windows: NightWindow[] };

/** Just enough settings for `nightsAround`, which only reads the times. */
function asSettings(t: ArmTimes): LockSettings {
  return { ...t, stepGoal: 0, nightApps: [], alwaysApps: [] };
}

/**
 * The monitor extension reads the edit waiting for bedtime only from this long before it
 * applies (`locturneNightIsOn` in DeviceActivityMonitorExtension.swift); before that, the
 * routine in force decides whether a window's night is on.
 */
export const EXTENSION_SLACK_MS = 2 * 60_000;

/**
 * Would the monitor extension shield at a window start at `t`, rather than skip it as a night
 * that's off? It mirrors `locturneNightIsOn`: a window before morning start belongs to the
 * evening before. A skipped window *unshields* the bedtime apps.
 */
function extensionShields(t: Date, routine: ArmTimes): boolean {
  const minute = t.getHours() * 60 + t.getMinutes();
  const evening = minute < routine.morningStart ? new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1) : t;
  return routine.activeNights.includes(evening.getDay());
}

/** The morning a window starting at `t` leads into, as the extension files it by `morningStart`. */
function filedMorning(t: Date, morningStart: number): Date {
  const minute = t.getHours() * 60 + t.getMinutes();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + (minute < morningStart ? 0 : 1));
}

/**
 * Every moment between now and the edit at which the new windows would shield: each window
 * start, plus now itself if now falls inside one (iOS may run a window's start as soon as it
 * is registered). A moment is fine if the routine in force calls it night anyway, or if it
 * belongs to the new routine's night that runs past the edit (firing early there only
 * tightens). Otherwise it's a phantom night, and the answer is when the last one ends.
 *
 * Firing early only tightens if the extension shields. Until just before the edit applies it
 * judges with the routine in force, so a window on an evening that routine has off is
 * skipped, which wakes the bedtime apps: a morning not yet proven would unlock early, from
 * bed (found by lock-controller.sim.test.ts). Those wait until the edit applies.
 *
 * It also only tightens if the edit has that evening on. One that switches tonight off along
 * with an earlier bedtime would otherwise shield from 21:30 (the routine in force says
 * Thursday is on) while the app says tonight is off. Those wait too.
 *
 * The extension files a window under an evening by the times *armed* (`locturneWindowNight`:
 * before their morning start, it belongs to the evening before), so each moment is judged
 * with the routine in force's nights but the new windows' morning start. Inside the routine in
 * force's own night that matters too: a window the extension skips there *unshields* the
 * bedtime apps (`skipLocturneNight`), so the rest of that night waits for it to end. That's an
 * earlier bedtime promoted inside its own first night (#179) and armed again (an Undo, a second
 * edit, onboarding again) with a morning start that files the next window under an evening the
 * routine in force has off.
 */
function phantomUntil(now: Date, from: number, active: ArmTimes, target: ArmTimes, windows: NightWindow[], lastPaid: string | null) {
  const moments = [now];
  for (const w of windows) {
    for (const day of [0, 1, 2]) {
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, 0, w.start);
      if (t > now && t.getTime() < from) moments.push(t);
    }
  }
  // How the extension judges a window of the new times before the edit is due: filed by their
  // morning start, asked of the routine in force's nights.
  const judged = { ...active, morningStart: target.morningStart };
  let until: Date | null = null;
  for (const t of moments) {
    const theirs = nightsAround(t, asSettings(target)).latest;
    if (t >= theirs.end) continue; // not inside a new night (only possible for `now`)
    // After a lapse the extension skips every night after the last paid morning
    // (`locturneSubscriptionLapsed`), filed by the times armed. Inside the routine in force's
    // night, where the morning under way still finishes, that skip wakes it: an early first
    // night starting at 07:22 before an 08:00 morning start is filed under tonight, after the
    // last paid morning. Wait for that night to end.
    const ours = nightsAround(t, asSettings(active)).latest;
    if (lastPaid !== null && t >= ours.start && t < ours.end && dateKey(filedMorning(t, target.morningStart)) > lastPaid) {
      if (!until || ours.end > until) until = ours.end;
      continue;
    }
    if (theirs.end.getTime() > from) {
      // The night the edit applies to, unless the extension would skip this window.
      const skipped = t.getTime() < from - EXTENSION_SLACK_MS && !extensionShields(t, judged);
      if ((skipped || !extensionShields(t, target)) && (!until || until.getTime() < from)) until = new Date(from);
      continue;
    }
    if (t < ours.end) {
      // Night under the routine in force anyway, unless the extension skips this window there,
      // which wakes the night it holds: wait for that night to end.
      if (t.getTime() < from - EXTENSION_SLACK_MS && !extensionShields(t, judged) && (!until || ours.end > until)) until = ours.end;
      continue;
    }
    // The extension places the window by the times armed (the edit's, once armed) and, until
    // just before the edit applies, asks the routine in force whether that evening is on. On an
    // evening that's off it skips the window, and outside that routine's night a skip changes
    // nothing: no phantom night, so nothing to wait for (and waiting would leave the old windows
    // to run after the edit applies if Locturne stays closed).
    const evening = new Date(theirs.end.getFullYear(), theirs.end.getMonth(), theirs.end.getDate() - 1).getDay();
    if (t.getTime() < from - EXTENSION_SLACK_MS && !active.activeNights.includes(evening)) continue;
    if (!until || theirs.end > until) until = theirs.end;
  }
  return until;
}

/**
 * @param active   the routine in force now
 * @param pending  an edit waiting for bedtime, applying from `from` (ms), or null
 * @param armed    what iOS is monitoring now, or null if nothing is armed
 * @param lastPaid the last morning a lapsed subscription covers (`lastPaidMorning`,
 *                 lock-controller.ts), or null while subscribed
 */
export function planArming(
  now: Date,
  active: ArmTimes,
  pending: { routine: ArmTimes; from: number } | null,
  armed: ArmedNow,
  lastPaid: string | null = null,
): ArmPlan {
  const target = pending?.routine ?? active;
  const windows = target.activeNights.length > 0 ? planNightWindows(target.bedtime, target.morningStart) : [];

  if (windows.length === 0) {
    if (!armed) return { action: 'keep' };
    // Stopping the windows now would free the night or morning under way (an unarmed morning
    // reads as unlocked), so turning every night off waits for its bedtime like any edit.
    // The monitor extension skips that bedtime's windows on its own.
    if (pending && now.getTime() < pending.from) {
      // Waiting leaves the armed windows in place, so they must be the routine in force's:
      // ones left from an edit since abandoned (an earlier bedtime, then every night off) would
      // shield from their own bedtime, and the lock would follow them as an older routine's
      // (`runsAs`, routine.ts), pulling tonight and every looser edit forward. Unless the armed
      // windows hold the night under way (`heldUntil`): re-arming would hand it to a later bedtime.
      const inForce = active.activeNights.length > 0 ? planNightWindows(active.bedtime, active.morningStart) : [];
      if (inForce.length > 0 && !isArmed(armed, active, inForce) && !heldUntil(now, active, armed)) {
        return { action: 'arm', times: active, windows: inForce };
      }
      return { action: 'defer', until: new Date(pending.from) };
    }
    return { action: 'disarm' };
  }

  // Without a pending edit the target is the routine in force, so its windows are its real
  // nights and nothing can be phantom. But the windows armed may still be an older routine's
  // (arming waited out a phantom night, and nothing re-armed with Locturne closed), holding a
  // night from their earlier bedtime: re-arming now would hand it back to a later bedtime.
  // The same while an edit waits, for the routine in force's night under way: a save from
  // inside the night the old windows hold would otherwise re-arm them away from bed. Not for
  // windows armed early for the edit itself, whose first night they already hold.
  const applied = !pending || now.getTime() >= pending.from;
  if (applied || !armed?.edit) {
    const held = heldUntil(now, applied ? target : active, armed);
    if (held) return { action: 'defer', until: held };
  }
  const until = pending && now.getTime() < pending.from ? phantomUntil(now, pending.from, active, target, windows, lastPaid) : null;
  if (!until) return isArmed(armed, target, windows) ? { action: 'keep' } : { action: 'arm', times: target, windows };

  // Waiting leaves the armed windows in place, which is only safe if they're the routine in
  // force's. Ones armed for an edit that has changed since (an earlier bedtime, then tonight
  // switched off: same times, so they look current) can shield the very phantom night this
  // waits out, so the routine in force's go back first. Stopping them instead would free the
  // night or morning under way.
  const inForce = active.activeNights.length > 0 ? planNightWindows(active.bedtime, active.morningStart) : [];
  if (inForce.length > 0 && !isArmed(armed, active, inForce)) return { action: 'arm', times: active, windows: inForce };
  return { action: 'defer', until };
}

/** Is iOS monitoring exactly these windows for these times? */
function isArmed(armed: ArmedNow, times: ArmTimes, windows: NightWindow[]): boolean {
  return (
    !!armed &&
    armed.bedtime === times.bedtime &&
    armed.morningStart === times.morningStart &&
    armed.windows === windows.length &&
    armed.live === windows.length
  );
}

/**
 * When windows armed for older times hold a night from their bedtime, before `target`'s own
 * night into the same morning begins (a later bedtime saved after the walk, whose arming waited
 * out a phantom night and never ran with Locturne closed): that night's start under `target`,
 * or null. Until then the lock follows the armed windows (`asArmed`, routine.ts), and arming
 * waits for it, or the first open from bed would wake the apps until `target`'s bedtime. Only
 * on an evening `target` has on: on one that's off, the extension never shielded.
 */
function heldUntil(now: Date, target: ArmTimes, armed: ArmedNow): Date | null {
  if (armed?.older === false) return null;
  const bedtime = armed ? armedBedtime(target, armed) : null;
  if (bedtime === null) return null;
  const { latest } = nightsAround(now, asSettings({ ...target, bedtime }));
  if (now < latest.start || now >= latest.end) return null;
  const evening = new Date(latest.end.getFullYear(), latest.end.getMonth(), latest.end.getDate() - 1).getDay();
  if (!target.activeNights.includes(evening)) return null;
  const ours = nightInto(dateKey(latest.end), target);
  return now < ours.start ? ours.start : null;
}
