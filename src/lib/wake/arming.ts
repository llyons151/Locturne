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
import { nightsAround, type LockSettings } from '../lock-state.ts';
import { planNightWindows, type NightWindow } from '../night-plan.ts';

/** The parts of a routine the windows depend on. */
export type ArmTimes = { bedtime: number; morningStart: number; activeNights: number[] };

/** What iOS has now, from `getArmedNight` and `armedWindowNames`. */
export type ArmedNow = { bedtime: number; morningStart: number; windows: number; live: number } | null;

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
const EXTENSION_SLACK_MS = 2 * 60_000;

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
 */
function phantomUntil(now: Date, from: number, active: ArmTimes, target: ArmTimes, windows: NightWindow[]) {
  const moments = [now];
  for (const w of windows) {
    for (const day of [0, 1, 2]) {
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, 0, w.start);
      if (t > now && t.getTime() < from) moments.push(t);
    }
  }
  let until: Date | null = null;
  for (const t of moments) {
    const theirs = nightsAround(t, asSettings(target)).latest;
    if (t >= theirs.end) continue; // not inside a new night (only possible for `now`)
    if (theirs.end.getTime() > from) {
      // The night the edit applies to, unless the extension would skip this window.
      const skipped = t.getTime() < from - EXTENSION_SLACK_MS && !extensionShields(t, active);
      if (skipped && (!until || until.getTime() < from)) until = new Date(from);
      continue;
    }
    const ours = nightsAround(t, asSettings(active)).latest;
    if (t < ours.end) continue; // night under the routine in force anyway
    if (!until || theirs.end > until) until = theirs.end;
  }
  return until;
}

/**
 * @param active  the routine in force now
 * @param pending an edit waiting for bedtime, applying from `from` (ms), or null
 * @param armed   what iOS is monitoring now, or null if nothing is armed
 */
export function planArming(
  now: Date,
  active: ArmTimes,
  pending: { routine: ArmTimes; from: number } | null,
  armed: ArmedNow,
): ArmPlan {
  const target = pending?.routine ?? active;
  const windows = target.activeNights.length > 0 ? planNightWindows(target.bedtime, target.morningStart) : [];

  if (windows.length === 0) {
    if (!armed) return { action: 'keep' };
    // Stopping the windows now would free the night or morning under way (an unarmed morning
    // reads as unlocked), so turning every night off waits for its bedtime like any edit.
    // The monitor extension skips that bedtime's windows on its own.
    if (pending && now.getTime() < pending.from) return { action: 'defer', until: new Date(pending.from) };
    return { action: 'disarm' };
  }

  const current =
    armed &&
    armed.bedtime === target.bedtime &&
    armed.morningStart === target.morningStart &&
    armed.windows === windows.length &&
    armed.live === windows.length;
  if (current) return { action: 'keep' };

  // Without a pending edit the target is the routine in force, so its windows are its real
  // nights and nothing can be phantom.
  if (pending && now.getTime() < pending.from) {
    const until = phantomUntil(now, pending.from, active, target, windows);
    if (until) return { action: 'defer', until };
  }

  return { action: 'arm', times: target, windows };
}
