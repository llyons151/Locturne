/**
 * Honest status (GAME_PLAN, "Reliability is a feature"): is Locturne really protecting
 * anything, and did last night's block actually start?
 *
 * Two pure questions, answered from facts the caller reads (`useHealth` does the reading):
 * - `checkNights`, the nightly self-check: for each recent night that should have been
 *   locked, did the monitor extension run a bedtime window, on time, with a shield up? The
 *   evidence is its heartbeat log (`heartbeat.ts`).
 * - `rollUpHealth`: that plus Screen Time access and the armed schedule, as one status with
 *   plain words in Loc's voice (docs/VOICE.md, "Clear when it matters").
 *
 * The rule throughout: never imply protection is on when it isn't. When the evidence can't
 * say (the log has rolled over, or the build predates the heartbeat), a night is `unknown`,
 * never `onTime`.
 */
import type { Heartbeat } from './heartbeat.ts';
import { dateKey } from './lock-state.ts';
import { formatMinutes, WINDOW_PREFIX } from './night-plan.ts';
import type { Routine } from './routine.ts';
import type { ArmedNight, Protection, ScreenTimeAccess } from './screen-time.ts';

const MINUTE = 60_000;

/** A window that starts within this many minutes of bedtime counts as on time. */
export const ON_TIME_GRACE = 5;
/** How many recent nights the self-check looks at. */
export const NIGHTS_CHECKED = 7;
/** iOS can call a window a few seconds early; allow a little before bedtime. */
const EARLY_SLACK = 2 * MINUTE;

/**
 * - `onTime`: a bedtime window started within `ON_TIME_GRACE` minutes of bedtime.
 * - `late`: the first window to run was a later one, so the apps slept late.
 * - `missed`: no window ran at all that night.
 * - `noShield`: windows ran, but nothing was shielded afterwards.
 * - `unknown`: the log doesn't reach back that far, so there's no telling.
 */
export type NightVerdict = 'onTime' | 'late' | 'missed' | 'noShield' | 'unknown';

export type NightCheck = {
  /** The morning this night leads into, as YYYY-MM-DD (`LockState.morningKey`). */
  morningKey: string;
  start: Date;
  end: Date;
  verdict: NightVerdict;
  /** When the first window of the night ran, or null. */
  firstStart: Date | null;
  /** Minutes after bedtime the first window ran (0 when early). Null when none ran. */
  lateBy: number | null;
};

export type NightFacts = {
  /** What iOS was handed. Its times are the ones the windows really run on. */
  armed: ArmedNight | null;
  /** Only `activeNights` is read: which evenings should have been locked. */
  routine: Pick<Routine, 'activeNights'>;
  /** Newest first or in any order. */
  heartbeats: Heartbeat[];
  /**
   * From when, in ms, the log is complete, so a night with no heartbeat really was missed.
   * Earlier nights with no heartbeat are `unknown`. Null means the log covers everything.
   * See `heartbeatCoverage`.
   */
  coverageStart: number | null;
  now: Date;
  nights?: number;
};

/** Local midnight `days` after `date`, plus `minutes`, like lock-state.ts. */
function atMinute(date: Date, minutes: number, days = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, minutes);
}

/** The night leading into the morning `offset` days from `now`'s date. */
function nightInto(now: Date, times: { bedtime: number; morningStart: number }, offset: number) {
  return {
    start: atMinute(now, times.bedtime, times.bedtime < times.morningStart ? offset : offset - 1),
    end: atMinute(now, times.morningStart, offset),
  };
}

/** The weekday whose evening starts the night into this morning, even past midnight. */
const eveningOf = (morningEnd: Date) => atMinute(morningEnd, 0, -1).getDay();

/** Whether the night in progress, or else the next one, is switched on. */
export function nextNightIsOn(now: Date, times: { bedtime: number; morningStart: number }, activeNights: number[]): boolean {
  for (const offset of [-1, 0, 1, 2]) {
    const { start, end } = nightInto(now, times, offset);
    if (start < end && now < end) return activeNights.includes(eveningOf(end));
  }
  return false;
}

/**
 * From when the heartbeat log can be trusted to be complete.
 * - A full log has dropped its oldest entries: complete from its oldest one.
 * - An empty log while the library's own event log shows window starts means the installed
 *   extension predates the heartbeat: absence proves nothing yet, so only from `now`.
 * - Otherwise (some entries, room to spare, or nothing ever ran): complete.
 */
export function heartbeatCoverage(log: Heartbeat[], recovered: Heartbeat[], keep: number, now: Date): number | null {
  if (log.length >= keep) return Math.min(...log.map((h) => h.at));
  if (log.length === 0 && recovered.length > 0) return now.getTime();
  return null;
}

/**
 * The self-check, newest night first. Only nights that should have been locked are listed:
 * an evening the routine has on, that started after the schedule was armed, and whose
 * bedtime is at least `ON_TIME_GRACE` minutes past (so tonight appears once it has had its
 * chance). Uses the armed times, since those are what iOS runs.
 */
export function checkNights(facts: NightFacts): NightCheck[] {
  const { armed, routine, heartbeats, coverageStart, now } = facts;
  if (!armed || armed.bedtime === armed.morningStart) return [];
  const armedAt = Date.parse(armed.armedAt);
  const starts = heartbeats
    .filter((h) => h.callback === 'intervalDidStart' && h.activity.startsWith(WINDOW_PREFIX))
    .sort((a, b) => a.at - b.at);

  const checks: NightCheck[] = [];
  // Tomorrow's morning first: tonight's night, when bedtime has already passed.
  for (let offset = 1; offset >= 1 - (facts.nights ?? NIGHTS_CHECKED); offset--) {
    const { start, end } = nightInto(now, armed, offset);
    // A bedtime the clocks skip past morning start means no night that date (lock-state.ts).
    if (start >= end) continue;
    if (start.getTime() + ON_TIME_GRACE * MINUTE > now.getTime()) continue;
    if (!Number.isNaN(armedAt) && start.getTime() < armedAt) continue;
    if (!routine.activeNights.includes(eveningOf(end))) continue;

    const ran = starts.filter((h) => h.at >= start.getTime() - EARLY_SLACK && h.at <= end.getTime());
    const first = ran[0];
    let verdict: NightVerdict;
    if (!first) verdict = coverageStart !== null && start.getTime() < coverageStart ? 'unknown' : 'missed';
    else if (ran.every((h) => h.shielded === false)) verdict = 'noShield';
    else verdict = first.at <= start.getTime() + ON_TIME_GRACE * MINUTE ? 'onTime' : 'late';

    checks.push({
      morningKey: dateKey(end),
      start,
      end,
      verdict,
      firstStart: first ? new Date(first.at) : null,
      lateBy: first ? Math.max(0, Math.round((first.at - start.getTime()) / MINUTE)) : null,
    });
  }
  return checks;
}

/** True when some night actually held: the cue to ask for notifications (GAME_PLAN). */
export function hadSuccessfulNight(nights: NightCheck[]): boolean {
  return nights.some((n) => n.verdict === 'onTime' || n.verdict === 'late');
}

/**
 * - `ok`: access is on, tonight is armed, and the last night we can judge held.
 * - `idle`: all fine, but every night is switched off, so nothing sleeps at bedtime.
 * - `attention`: protection is on, but tonight isn't armed or the last night didn't hold.
 * - `off`: Screen Time access is off (or iOS behaves as if it is). Nothing is blocked.
 * - `setup`: access hasn't been asked for yet.
 */
export type HealthLevel = 'ok' | 'idle' | 'attention' | 'off' | 'setup';

export type Health = {
  level: HealthLevel;
  /** His line, short. Safe to show alone. */
  title: string;
  /** The plain explanation and the fix, when there is one. */
  detail: string;
  protection: Protection;
  /** The newest night the self-check could judge, or null. */
  lastNight: NightCheck | null;
  /** The fix is subscribing: Home offers the plans. */
  needsSubscription?: boolean;
  nights: NightCheck[];
};

export type HealthFacts = {
  protection: Protection;
  access: ScreenTimeAccess;
  armed: ArmedNight | null;
  routine: Pick<Routine, 'activeNights'>;
  nights: NightCheck[];
  /** A purchase is waiting for approval (Ask to Buy), so nothing is armed yet on purpose. */
  purchasePending?: boolean;
  /** The last check found no subscription (never bought, or it ended). */
  unsubscribed?: boolean;
  now: Date;
};

const JUST_A_RACCOON = 'Until then I’m just a raccoon.';

export function rollUpHealth({ protection, access, armed, routine, nights, purchasePending, unsubscribed, now }: HealthFacts): Health {
  const lastNight = nights.find((n) => n.verdict !== 'unknown') ?? null;
  const base = { protection, lastNight, nights };

  if (protection === 'unavailable') {
    return {
      ...base,
      level: 'off',
      title: 'Screen Time only works on an iPhone.',
      detail: 'Nothing can be blocked here.',
    };
  }
  if (protection === 'notSetUp') {
    return {
      ...base,
      level: 'setup',
      title: 'Screen Time access isn’t on yet.',
      detail: `So I can’t block anything. ${JUST_A_RACCOON}`,
    };
  }
  if (protection === 'off') {
    // VOICE.md's revoked line. With a stale "approved", iOS has still dropped the schedule
    // or lifted the shields, which is what revoking does, so say what we can see.
    return access === 'denied'
      ? {
          ...base,
          level: 'off',
          title: 'Screen Time access is off.',
          detail: `So I can’t block anything. Turn it back on in Settings. ${JUST_A_RACCOON}`,
        }
      : {
          ...base,
          level: 'off',
          title: 'Screen Time access looks off.',
          detail: `iOS dropped your blocks, which it does when access is turned off. Check Screen Time in Settings, then open Locturne again. ${JUST_A_RACCOON}`,
        };
  }

  if (routine.activeNights.length === 0) {
    return {
      ...base,
      level: 'idle',
      title: 'Every night is off.',
      detail: 'Nothing sleeps at bedtime until you turn a night back on.',
    };
  }
  if (!armed && purchasePending) {
    return {
      ...base,
      level: 'attention',
      title: 'Waiting for approval.',
      detail: 'Once the purchase is approved, I’ll schedule bedtime. Nothing sleeps until then.',
    };
  }
  if (!armed && unsubscribed) {
    return {
      ...base,
      level: 'attention',
      title: 'No subscription, so nothing sleeps.',
      detail: 'Your setup is saved. Subscribe and I’ll pick up where we left off.',
      needsSubscription: true,
    };
  }
  if (!armed) {
    return {
      ...base,
      level: 'attention',
      title: 'Bedtime isn’t scheduled.',
      detail: 'Nothing will sleep tonight until it is.',
    };
  }
  if (lastNight?.verdict === 'missed') {
    return {
      ...base,
      level: 'attention',
      title: 'iOS never put me to bed last night.',
      detail:
        'Your apps stayed awake. Access is still on and tonight is scheduled, so it should hold. If it happens again, let us know.',
    };
  }
  if (lastNight?.verdict === 'noShield') {
    return {
      ...base,
      level: 'attention',
      title: 'Bedtime ran, but nothing slept.',
      detail: 'Check that your bedtime list still has apps in it.',
    };
  }

  const late =
    lastNight?.verdict === 'late' ? ` Last night started ${lastNight.lateBy} minutes late; a later window caught it.` : '';
  const tonight = nextNightIsOn(now, armed, routine.activeNights)
    ? `Your apps sleep at ${formatMinutes(armed.bedtime)}.`
    : `Tonight is off. Next time, your apps sleep at ${formatMinutes(armed.bedtime)}.`;
  return { ...base, level: 'ok', title: 'Bedtime is set.', detail: tonight + late };
}
