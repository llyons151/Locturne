/**
 * Product analytics: the event list, and the privacy rules every event passes through.
 * docs/ANALYTICS.md has the funnels and retention views built on these events.
 *
 * This file is pure (no React Native), so lib code and tests can call `track` freely.
 * `analytics-start.ts` plugs PostHog in at startup; until then, and in builds without a
 * key, events queue briefly and are dropped.
 *
 * What may never be sent (web/public/privacy.html, docs/app-store/PRIVACY_LABELS.md):
 * - which apps were picked (only how many);
 * - step counts, stairs or altitude (only the method and the outcome);
 * - an exact age (only a bracket), and nothing at all once someone says they're under 13;
 * - bedtime and wake times, or anything from the Screen Time extensions.
 */
import type { WakeMethod } from './routine.ts';

/** Bump when the onboarding changes enough that old and new funnels shouldn't be mixed. */
export const ONBOARDING_VERSION = '2026-10-03';

export type AgeBracket = '13-17' | '18-24' | '25-34' | '35+';
export type ProofKindEvent = WakeMethod | 'pass' | 'emergency';
export type NightVerdictEvent = 'onTime' | 'late' | 'missed' | 'noShield';

type Value = string | number | boolean | null;

/** Every event and its properties. Add new ones here, so the list stays the one place to read. */
export type Events = {
  /* Onboarding */
  onboarding_started: { rerun: boolean; entry_step: string };
  /** `ms_on_previous` is how long the previous step was open: where people stall. */
  onboarding_step_viewed: {
    step: string;
    step_index: number;
    depth: number;
    editing: boolean;
    previous_step: string | null;
    ms_on_previous: number | null;
  };
  onboarding_answered: { question: string; answer: Value };
  onboarding_exited: { step: string; depth: number; setup_saved: boolean; saw_paywall: boolean };
  onboarding_completed: { via: 'purchase' | 'restore'; depth: number };
  screen_time_access: { result: 'granted' | 'denied' };
  apps_picked: { count: number };
  walk_started: Record<string, never>;
  walk_finished: { result: 'done' | 'denied' | 'unavailable'; seconds: number };
  motion_access: { result: 'granted' | 'denied' | 'unavailable' };
  paywall_viewed: { page: string; exit_arm: string | null; prices_loaded: boolean; trial_days: number | null };
  offers_failed: Record<string, never>;
  purchase_started: { target: string; page: string };
  purchase_result: { target: string; page: string; status: 'purchased' | 'pending' | 'failed' | 'cancelled' };
  restore_result: { found: boolean; step: string };
  night_armed: { status: string; reason: string | null; now: boolean };

  /* The app, after onboarding: retention and whether the product works */
  morning_unlocked: {
    method: ProofKindEvent;
    /** Minutes after morning start, bucketed (`afterStartBucket`): never the exact time. */
    after_start: string;
    /** How many mornings this install has proved, counting this one (up to 30 kept). */
    morning_number: number;
  };
  pass_used: { passes_left: number };
  emergency_unlock: { phase: string; paused_night: boolean; ended_block_now: boolean; unlocked_morning: boolean };
  night_checked: { verdict: NightVerdictEvent; late_by_minutes: number | null };
  notifications_permission: { granted: boolean };
  notification_opened: { kind: string };
};

export type EventName = keyof Events;

/** What `analytics-start.ts` provides. Tests can pass a fake. */
export type AnalyticsSink = {
  capture(event: string, properties: Record<string, Value>): void;
  screen(name: string): void;
  /** Sent with every later event, and kept across launches. */
  register(properties: Record<string, Value>): void;
  /** Person properties, for cohorts ("trial starters whose method is downstairs"). */
  setPerson(properties: Record<string, Value>): void;
  optOut(): void;
};

/** Events tracked before startup finished. Kept short: startup is synchronous today. */
const QUEUE_MAX = 50;
let sink: AnalyticsSink | null = null;
let queue: ((s: AnalyticsSink) => void)[] = [];
let stopped = false;

function send(call: (s: AnalyticsSink) => void): void {
  if (stopped) return;
  if (sink) {
    try {
      call(sink);
    } catch {
      // Analytics must never break the app.
    }
  } else if (queue.length < QUEUE_MAX) queue.push(call);
}

export function setAnalyticsSink(next: AnalyticsSink | null): void {
  sink = next;
  const waiting = queue;
  queue = [];
  if (next) waiting.forEach(send);
}

export function track<E extends EventName>(event: E, properties: Events[E]): void {
  send((s) => s.capture(event, properties as Record<string, Value>));
}

export function trackScreen(name: string): void {
  send((s) => s.screen(name));
}

export function registerProperties(properties: Record<string, Value>): void {
  send((s) => s.register(properties));
}

export function setPersonProperties(properties: Record<string, Value>): void {
  send((s) => s.setPerson(properties));
}

/**
 * Someone said they're under 13. Stop collecting for this install, for good (COPPA,
 * docs/TEEN_ACCOUNTS.md): PostHog keeps the opt-out across launches.
 */
export function stopForChild(): void {
  send((s) => s.optOut());
  stopped = true;
  queue = [];
}

/** For tests. */
export function resetAnalytics(): void {
  sink = null;
  queue = [];
  stopped = false;
}

export function ageBracket(age: number): AgeBracket | null {
  if (age < 13) return null;
  if (age < 18) return '13-17';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  return '35+';
}

/** The onboarding answers that may leave the phone, and the question each step asks. */
type QuizAnswers = {
  nights?: string;
  nightMinutes?: number;
  nightsPerWeek?: number;
  morningMinutes?: number;
  found?: string;
  age?: number;
  alarm?: string;
  tried?: string;
  timeBack?: string;
  method?: string;
};

const QUESTION_FOR_STEP: Record<string, keyof QuizAnswers> = {
  nights: 'nights',
  'night-minutes': 'nightMinutes',
  'nights-per-week': 'nightsPerWeek',
  'morning-minutes': 'morningMinutes',
  found: 'found',
  age: 'age',
  alarm: 'alarm',
  tried: 'tried',
  'time-back': 'timeBack',
  method: 'method',
};

/**
 * The answer given on `step`, ready to send, or null when the step asks nothing (or nothing
 * that may be sent). Age goes as a bracket, and not at all under 13.
 */
export function answerFor(step: string, answers: QuizAnswers): { question: string; answer: Value } | null {
  const question = QUESTION_FOR_STEP[step];
  if (!question) return null;
  const value = answers[question];
  if (value === undefined) return null;
  if (question === 'age') {
    const bracket = ageBracket(value as number);
    return bracket ? { question: 'age_bracket', answer: bracket } : null;
  }
  return { question, answer: value };
}

/**
 * Answers worth having on every later event, so a paywall or an unlock can be split by them
 * ("conversion by where they found us", "retention by wake-up method").
 */
export const SUPER_QUESTIONS = new Set(['found', 'method', 'age_bracket', 'timeBack', 'alarm']);
