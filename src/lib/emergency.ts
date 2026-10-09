/**
 * The emergency unlock (GAME_PLAN, "Humane exits"): always available, deliberate, and never
 * touches the always-blocked list or a used-up daily limit. What it lifts depends on when:
 *
 * - **Night:** the bedtime apps wake for the rest of tonight, and this coming morning counts
 *   as unlocked. The night windows stay armed, so the next bedtime locks as usual with nobody
 *   opening the app (see `pauseNightUntil` in screen-time.ts). Decided 2026-10-03: it pauses
 *   only tonight, never later nights.
 * - **Morning:** this morning counts as unlocked, as if the wake-up method were done.
 * - **Any time:** a running Block now session ends.
 *
 * The delay and the "go back to sleep" button in front of it (NIGHT_PHONE_SCIENCE.md,
 * Principle 10) live in the exits screen. Every use is logged for diagnostics.
 *
 * `planEmergency` and the log helpers are pure; `emergencyUnlock` applies the plan.
 */
import { judgedAt, nextBedtime, pastLastPaid, readLock, subscriptionEnded, syncLock } from './lock-controller.ts';
import { dateKey, type Phase } from './lock-state.ts';
import { recordProof, type MorningProof } from './morning-proof.ts';
import { nextNightOn } from './routine.ts';
import {
  endNap,
  getNap,
  isScreenTimeAvailable,
  listChangeLandsAt,
  nightLockArmed,
  pauseNightUntil,
  selectionSize,
  selectionSizeAfterChange,
  sharedGet,
  sharedSet,
} from './screen-time.ts';

/** Seconds the exits screen waits before the unlock button works. */
export const EMERGENCY_WAIT_SECONDS = 10;

export type EmergencyPlan = {
  /** Wake the bedtime apps for the rest of tonight. */
  pauseNight: boolean;
  /** Record the emergency as this morning's proof. */
  unlockMorning: boolean;
  /** End a running Block now session. */
  endBlockNow: boolean;
  /** When the night lock is back: the next bedtime, in ms. Null when the night isn't paused. */
  resumesAt: number | null;
};

/**
 * Pure: what an emergency unlock lifts right now, or null when nothing it can lift is asleep
 * (daytime with no Block now running; the always list and limits are never its business).
 */
export function planEmergency(phase: Phase, blockNowRunning: boolean, nextBedtime: Date): EmergencyPlan | null {
  const pauseNight = phase === 'night';
  const unlockMorning = phase === 'night' || phase === 'morning';
  if (!unlockMorning && !blockNowRunning) return null;
  return {
    pauseNight,
    unlockMorning,
    endBlockNow: blockNowRunning,
    resumesAt: pauseNight ? nextBedtime.getTime() : null,
  };
}

/** One use, as the diagnostics screen shows it. */
export type EmergencyUse = EmergencyPlan & {
  at: number;
  phase: Phase;
  morningKey: string;
};

const KEY = 'locturne.emergencyLog';
/** A few months of uses for diagnostics, without growing forever. */
const KEEP = 50;

/** Pure: the log with `use` added, newest first. */
export function withUse(log: EmergencyUse[], use: EmergencyUse): EmergencyUse[] {
  return [use, ...log].slice(0, KEEP);
}

/** Pure: when the bedtime apps sleep again after a night pause, or null if none is running. */
export function pausedUntil(log: EmergencyUse[], now: Date): Date | null {
  const latest = log.find((use) => use.pauseNight && use.resumesAt !== null);
  return latest?.resumesAt && latest.resumesAt > now.getTime() ? new Date(latest.resumesAt) : null;
}

/** Every use, newest first. */
export function getEmergencyLog(): EmergencyUse[] {
  // A null `resumesAt` is stored without the field (`toPlist` in screen-time.ts).
  return (sharedGet<EmergencyUse[]>(KEY) ?? []).map((use) => ({ ...use, resumesAt: use.resumesAt ?? null }));
}

/** When tonight's paused bedtime lock comes back, or null if tonight isn't paused. */
export function getNightPause(now = new Date()): Date | null {
  return pausedUntil(getEmergencyLog(), now);
}

/**
 * The phase as far as what's asleep: the lock's phase comes from the clock, so a night with
 * nothing to wake reads as day. That's a night with no lock (`nightLockArmed`: never bought,
 * stood down, arming failed) or one an emergency already paused. A morning needs no check:
 * `readLock` reads one whose night wasn't armed as unlocked, and a paused night's is proved.
 * Neither holds anything after the last night or morning a lapsed subscription covers
 * (`pastLastPaid`): the extension skips it while the windows wait for the store's answer.
 * A night whose bedtime list is empty holds nothing either (`readLock` frees its morning).
 */
export function heldPhase(phase: Phase, now = new Date()): Phase {
  if ((phase === 'night' || phase === 'morning') && subscriptionEnded() && pastLastPaid(readLock(now).morningKey)) return 'day';
  return phase === 'night' && (!nightLockArmed() || getNightPause(now) !== null || !bedtimeAppsNow(now)) ? 'day' : phase;
}

/**
 * Whether the bedtime list as it stands now has apps: a change that has already landed counts,
 * as Home judges it. Off iOS there's no list to read, so it's taken as picked.
 */
function bedtimeAppsNow(now: Date): boolean {
  return bedtimeAppsAt(now, now);
}

/** Whether the bedtime list as it will stand at `at` has apps (a change landing first counts). */
function bedtimeAppsAt(at: Date | null, now: Date): boolean {
  if (!isScreenTimeAvailable()) return true;
  const handoff = listChangeLandsAt('night', now);
  const landed = handoff && !handoff.waitsForOpen && at && handoff.at <= at;
  return (landed ? selectionSizeAfterChange('night') : selectionSize('night')) > 0;
}

/**
 * Whether anything sleeps at the next bedtime that will really lock (or now, during a night
 * under way): false when the bedtime list as it stands then is empty, as Home words it.
 */
export function bedtimeAppsAhead(now = new Date()): boolean {
  const pause = getNightPause(now);
  const next = nextNightOn(pause ?? nextBedtime(now), now);
  const sleepsAt = next && pause && next < pause ? pause : next;
  return bedtimeAppsAt(readLock(now).phase === 'night' && !pause ? now : sleepsAt, now);
}

/** What an emergency unlock would lift right now, for the exits screen's wording. */
export function previewEmergency(now = new Date()): EmergencyPlan | null {
  return planEmergency(heldPhase(readLock(now).phase, now), getNap() !== null, nextBedtime(now));
}

/**
 * Lifts whatever `previewEmergency` says and logs it. The always-blocked list and used-up
 * limits stay shielded (`reapplyStandingBlocks` runs after every unshield). Returns the use,
 * or null when there was nothing to lift.
 */
export function emergencyUnlock(now = new Date()): EmergencyUse | null {
  const state = readLock(now);
  const plan = previewEmergency(now);
  if (!plan) return null;
  if (plan.endBlockNow) endNap();
  if (plan.pauseNight && plan.resumesAt !== null) pauseNightUntil(new Date(plan.resumesAt), now);
  if (plan.unlockMorning) {
    const proof: MorningProof = { morningKey: state.morningKey, kind: 'emergency', at: now.getTime() };
    // Judged by the routine governing now: inside a waiting edit's early first night, the
    // morning it leads into is the edit's.
    recordProof(proof, judgedAt(now));
  }
  const use: EmergencyUse = { ...plan, at: now.getTime(), phase: state.phase, morningKey: state.morningKey };
  sharedSet(KEY, withUse(getEmergencyLog(), use));
  syncLock(now);
  return use;
}

/**
 * The words for a paused night: which morning it covers (after midnight, it's this one) and
 * when the bedtime apps really sleep again. `resumesAt` is the next bedtime, and if that night
 * is off they stay awake until the next night that's on, so its weekday is named. After a
 * lapse's last paid night (`pastLastPaid`) nothing sleeps again: `resumes` is null and `ended`
 * says why.
 */
export function pauseWording(
  resumesAt: Date,
  now = new Date(),
): { morning: string; resumes: Date | null; weekday: string | null; ended: boolean } {
  // Never a time before the pause ends: the parked picks come back only then (an earlier
  // bedtime saved during the pause, still waiting to be armed, starts a night before it).
  const next = nextNightOn(resumesAt, now);
  const on = next && next < resumesAt ? resumesAt : next;
  // The extension skips a night leading into a morning after the last paid one.
  const ended = on !== null && pastLastPaid(readLock(on).morningKey);
  const resumes = ended ? null : on;
  const sameDay = resumes?.toDateString() === resumesAt.toDateString();
  return {
    // The morning this night leads into: today's once past midnight, or a shift worker's.
    morning: readLock(now).morningKey === dateKey(now) ? 'this morning' : 'tomorrow morning',
    resumes,
    weekday: resumes && !sameDay ? resumes.toLocaleDateString('en-US', { weekday: 'long' }) : null,
    ended,
  };
}
