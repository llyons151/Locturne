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
import { readLock, syncLock } from './lock-controller.ts';
import { dateKey, settingsTakeEffectAt, type Phase } from './lock-state.ts';
import { recordProof } from './morning-proof.ts';
import { getPendingRoutine, getRoutine, nextNightOn, toLockSettings } from './routine.ts';
import { endNap, getNap, pauseNightUntil, sharedGet, sharedSet } from './screen-time.ts';

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
 * The next bedtime. A routine edit waiting for that bedtime may move it earlier, so take
 * whichever comes first: the paused lock must be back by the first window that runs.
 */
function nextBedtime(now: Date): Date {
  const next = settingsTakeEffectAt(now, toLockSettings(getRoutine(now)));
  const pending = getPendingRoutine(now);
  if (!pending) return next;
  const edited = settingsTakeEffectAt(now, toLockSettings(pending.routine));
  return edited < next ? edited : next;
}

/** What an emergency unlock would lift right now, for the exits screen's wording. */
export function previewEmergency(now = new Date()): EmergencyPlan | null {
  return planEmergency(readLock(now).phase, getNap() !== null, nextBedtime(now));
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
  if (plan.unlockMorning) recordProof({ morningKey: state.morningKey, kind: 'emergency', at: now.getTime() });
  const use: EmergencyUse = { ...plan, at: now.getTime(), phase: state.phase, morningKey: state.morningKey };
  sharedSet(KEY, withUse(getEmergencyLog(), use));
  syncLock(now);
  return use;
}

/**
 * The words for a paused night: which morning it covers (after midnight, it's this one) and
 * when the bedtime apps really sleep again. `resumesAt` is the next bedtime, and if that night
 * is off they stay awake until the next night that's on, so its weekday is named.
 */
export function pauseWording(
  resumesAt: Date,
  now = new Date(),
): { morning: string; resumes: Date | null; weekday: string | null } {
  const resumes = nextNightOn(resumesAt, now);
  const sameDay = resumes?.toDateString() === resumesAt.toDateString();
  return {
    // The morning this night leads into: today's once past midnight, or a shift worker's.
    morning: readLock(now).morningKey === dateKey(now) ? 'this morning' : 'tomorrow morning',
    resumes,
    weekday: resumes && !sameDay ? resumes.toLocaleDateString(undefined, { weekday: 'long' }) : null,
  };
}
