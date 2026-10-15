import { useSyncExternalStore } from 'react';

import type { HomeFacts } from '@/features/home/home-screen';
import { rollUpHealth, type Health, type HealthFacts } from '@/lib/health';
import { dateKey } from '@/lib/lock-state';
import type { ProofKind } from '@/lib/morning-proof';
import type { Routine, WakeMethod } from '@/lib/routine';

import { fakeTheMorning, setWakePreview, useWakePreview, type WakePreview } from '../wake-lab/wake-preview';

/**
 * The app-states lab (You → Developer → App states, /app-states): every state Home can be in,
 * made up on the spot, so each one can be seen and worked on at any hour without living
 * through it. Picking one swaps Home's facts (`HomeFacts`, read in home-screen.tsx) for these.
 * Nothing real changes: the stores, the shields and the notifications never hear about it,
 * Loc's lines are keyed apart from the real nights', and Apple's review sheet still reads the
 * real lock. A morning runs the wake preview's pretend morning (wake-preview.ts) with fake
 * sensors, so finishing it records nothing and moves to "done" here too. Kept in memory; a
 * reload starts real.
 *
 * `gap`: a state the app really gets into that Home has no words for yet. It shows what Home
 * says today, as a place to start on it.
 */

export type StateGroup = 'Looks' | 'Status' | 'Needs attention' | 'Day' | 'Woken up' | 'Trial' | 'Week' | 'Nap' | 'Night' | 'Morning';

export const GROUPS: StateGroup[] = ['Looks', 'Status', 'Needs attention', 'Day', 'Woken up', 'Trial', 'Week', 'Nap', 'Night', 'Morning'];

export type AppState = {
  id: string;
  group: StateGroup;
  label: string;
  /** What the app is doing in it, and what Home should say. */
  note: string;
  gap?: boolean;
  /** Runs the wake preview's pretend morning for this method, with these fakes. */
  morning?: { method: WakeMethod; fakes?: Partial<WakePreview> };
  /** The made-up facts, from a plain day (`plainDay`). */
  facts: (day: HomeFacts, now: Date) => HomeFacts;
};

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** `hours` from now, rounded up to the next 5 minutes so the clock reads like a real bedtime. */
function from(now: Date, hours: number): Date {
  const t = now.getTime() + hours * HOUR;
  return new Date(Math.ceil(t / (5 * MINUTE)) * 5 * MINUTE);
}

/** `minutes` past midnight on the day `days` from now. */
function on(now: Date, days: number, minutes: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 0, minutes);
}

/** The last `count` days before today, as morning keys: the week strip's got-up dots. */
function pastDays(now: Date, count: number): Set<string> {
  return new Set(Array.from({ length: count }, (_, i) => dateKey(on(now, -(i + 1), 0))));
}

const EVERY_NIGHT = [0, 1, 2, 3, 4, 5, 6];
const ARMED = { bedtime: 23 * 60, morningStart: 7 * 60, windows: 4, armedAt: new Date(0).toISOString() };

/** The status health.ts would give for these facts, in its own words. */
function health(now: Date, facts: Partial<HealthFacts> = {}): Health {
  return rollUpHealth({
    protection: 'on',
    access: 'approved',
    armed: ARMED,
    routine: { activeNights: EVERY_NIGHT },
    nights: [],
    now,
    ...facts,
  });
}

/**
 * The self-check's night verdicts need a real log of windows to judge, so these three are
 * written out: the titles and details are health.ts's (`rollUpHealth`), keep them in step.
 */
function nightTrouble(title: string, detail: string): Health {
  return { level: 'attention', title, detail, protection: 'on', lastNight: null, nights: [] };
}

/** An ordinary day: protected, subscribed, six bedtime apps, bedtime in three hours. */
function plainDay(now: Date, routine: Routine): HomeFacts {
  const sleepsAt = from(now, 3);
  return {
    lock: { phase: 'day', morningKey: dateKey(now), nextChange: sleepsAt, blockNowUntil: null },
    routine,
    proof: null,
    health: health(now),
    held: 'day',
    pause: null,
    pauseWords: null,
    method: routine.method,
    won: pastDays(now, 3),
    free: new Set(),
    mornings: 23,
    sleepsAt,
    tonightOn: true,
    listChanges: false,
    bedtimeApps: true,
    armed: true,
    stoodDown: false,
    alwaysSleeps: false,
    trialEnd: null,
    apps: 6,
    websites: 0,
    sayKey: '',
  };
}

/** Tonight, from bedtime: the apps asleep until tomorrow's morning start. */
function night(d: HomeFacts, now: Date): HomeFacts {
  const morningAt = on(now, now.getHours() < 7 ? 0 : 1, d.routine.morningStart);
  return { ...d, lock: { ...d.lock, phase: 'night', morningKey: dateKey(morningAt), nextChange: morningAt }, held: 'night' };
}

/** This morning, not yet proven: locked until bedtime if they never get up. */
function morning(d: HomeFacts, now: Date, method: WakeMethod): HomeFacts {
  const bedtime = from(now, 12);
  return {
    ...d,
    lock: { ...d.lock, phase: 'morning', nextChange: bedtime },
    held: 'morning',
    method,
    routine: { ...d.routine, method },
    sleepsAt: bedtime,
  };
}

/** This morning unlocked by `kind`. */
function woke(d: HomeFacts, now: Date, kind: ProofKind): HomeFacts {
  return { ...d, proof: { morningKey: d.lock.morningKey, kind, at: now.getTime() - 20 * MINUTE } as HomeFacts['proof'] };
}

/** A night an emergency unlock paused: the clock says night, nothing is held, so it reads as day. */
function paused(d: HomeFacts, now: Date, words: Partial<NonNullable<HomeFacts['pauseWords']>> = {}): HomeFacts {
  const n = night(d, now);
  const resumes = on(now, 1, 23 * 60);
  return {
    ...n,
    held: 'day',
    pause: resumes,
    sleepsAt: resumes,
    pauseWords: { morning: 'tomorrow morning', resumes, weekday: null, ended: false, noApps: false, ...words },
  };
}

/** A night switched off in the routine: the bedtime apps stay awake. */
function nightOff(d: HomeFacts, now: Date): HomeFacts {
  const n = night(d, now);
  return { ...n, lock: { ...n.lock, phase: 'off' }, held: 'off', tonightOn: false, sleepsAt: on(now, 2, 23 * 60) };
}

const nap = (d: HomeFacts, now: Date): HomeFacts => ({ ...d, lock: { ...d.lock, blockNowUntil: from(now, 0.75) } });
const accessOff = (d: HomeFacts, now: Date): HomeFacts => ({ ...d, health: health(now, { protection: 'off', access: 'denied' }) });
const unsubscribed = (d: HomeFacts, now: Date): HomeFacts => ({
  ...d,
  armed: false,
  stoodDown: true,
  health: health(now, { armed: null, unsubscribed: true }),
});

export const APP_STATES: AppState[] = [
  // Looks: one state for each of Home's looks (`HomeLook`, home-content.tsx), to compare them.
  {
    id: 'look-day',
    group: 'Looks',
    label: 'Day: bedtime countdown',
    note: 'The countdown to bedtime is the big number; the quiet pill under it.',
    facts: (d) => d,
  },
  {
    id: 'look-evening',
    group: 'Looks',
    label: 'Close to bedtime',
    note: 'The last hour: the countdown over a track filling toward bedtime.',
    facts: (d, now) => ({ ...d, sleepsAt: from(now, 25 / 60), lock: { ...d.lock, nextChange: from(now, 25 / 60) } }),
  },
  {
    id: 'look-night',
    group: 'Looks',
    label: 'Asleep',
    note: 'The wake time is the big number. The top dims, screen time goes, the button is plain text.',
    facts: (d, now) => night(d, now),
  },
  {
    id: 'look-wake-soon',
    group: 'Looks',
    label: 'Close to morning',
    note: 'Asleep, inside the last hour before wake-up: “in 25m” under the wake time.',
    facts: (d, now) => {
      const n = night(d, now);
      return { ...n, lock: { ...n.lock, nextChange: from(now, 25 / 60) } };
    },
  },
  {
    id: 'look-morning',
    group: 'Looks',
    label: 'Morning: time to get up',
    note: 'The morning on Home: the stairs listen by themselves (no Start); a button it needs is the white primary one.',
    morning: { method: 'downstairs', fakes: { stairs: 'down' } },
    facts: (d, now) => morning(d, now, 'downstairs'),
  },
  {
    id: 'look-done',
    group: 'Looks',
    label: 'Just got up',
    note: '“Up at” the time they got up, for three hours after a wake-up (not a pass).',
    facts: (d, now) => {
      const w = woke(d, now, d.routine.method);
      return { ...w, won: new Set([...w.won, w.lock.morningKey]), mornings: w.mornings + 1 };
    },
  },
  {
    id: 'look-problem',
    group: 'Looks',
    label: 'Something to fix',
    note: 'Something to fix takes over: the top goes, and the fix is the primary button.',
    facts: (d, now) => ({ ...d, health: health(now, { protection: 'notSetUp', access: 'notDetermined' }) }),
  },
  {
    id: 'look-plain',
    group: 'Looks',
    label: 'Nap or pass',
    note: 'Naps, passes, nights off and the trial keep the headline and line.',
    facts: (d, now) => nap(d, now),
  },

  // Status: access off or never given replaces everything (health.ts).
  {
    id: 'setup',
    group: 'Status',
    label: 'Screen Time never set up',
    note: 'Access never asked for. The status replaces Home, and the button asks for access.',
    facts: (d, now) => ({ ...d, health: health(now, { protection: 'notSetUp', access: 'notDetermined' }) }),
  },
  {
    id: 'access-off',
    group: 'Status',
    label: 'Screen Time access off',
    note: 'Turned off in Settings. Nothing is blocked; the button asks again.',
    facts: accessOff,
  },
  {
    id: 'access-looks-off',
    group: 'Status',
    label: 'Screen Time looks off',
    note: 'iOS still says approved but dropped the shields, as revoking does.',
    facts: (d, now) => ({ ...d, health: health(now, { protection: 'off', access: 'approved' }) }),
  },
  {
    id: 'access-off-night',
    group: 'Status',
    label: 'Access off at night',
    note: 'Bedtime came but access is off: the status still leads.',
    facts: (d, now) => accessOff(night(d, now), now),
  },
  {
    id: 'access-off-morning',
    group: 'Status',
    label: 'Access off in the morning',
    note: 'A locked morning with access off: no morning on Home, just the status.',
    facts: (d, now) => accessOff(morning(d, now, d.routine.method), now),
  },
  {
    id: 'no-screen-time',
    group: 'Status',
    label: 'No Screen Time (web, Android)',
    note: 'protection is "unavailable": Home carries on as a day, nothing can really sleep.',
    facts: (d, now) => ({ ...d, health: health(now, { protection: 'unavailable' }) }),
  },

  // Needs attention: by day its words lead, over the countdown (dayHero).
  {
    id: 'unsubscribed',
    group: 'Needs attention',
    label: 'No subscription',
    note: 'Never bought or ended: nothing sleeps. The button offers the plans.',
    facts: unsubscribed,
  },
  {
    id: 'lapse-tonight',
    group: 'Needs attention',
    label: 'Subscription ended, tonight still counts',
    note: 'Lapsed, but the armed night under way finishes as promised. Offers the plans.',
    facts: (d, now) => ({ ...d, health: health(now, { unsubscribed: true, lapseCovers: 'night' }) }),
  },
  {
    id: 'lapse-morning',
    group: 'Needs attention',
    label: 'Subscription ended, this morning counts',
    note: 'Lapsed after bedtime: this morning holds, nothing from tonight.',
    facts: (d, now) => ({ ...d, health: health(now, { unsubscribed: true, lapseCovers: 'morning' }) }),
  },
  {
    id: 'ask-to-buy',
    group: 'Needs attention',
    label: 'Ask to Buy waiting',
    note: 'A purchase waits for a parent: nothing is scheduled yet, on purpose.',
    facts: (d, now) => ({ ...d, armed: false, health: health(now, { armed: null, purchasePending: true }) }),
  },
  {
    id: 'not-scheduled',
    group: 'Needs attention',
    label: 'Bedtime not scheduled',
    note: 'Subscribed and on, but arming failed: nothing will sleep tonight.',
    facts: (d, now) => ({ ...d, armed: false, health: health(now, { armed: null }) }),
  },
  {
    id: 'missed',
    group: 'Needs attention',
    label: 'iOS missed last night',
    note: 'The self-check found no window ran last night.',
    facts: (d) => ({
      ...d,
      health: nightTrouble(
        'iOS never put me to bed last night.',
        'Your apps stayed awake. Access is still on and tonight is scheduled, so it should hold. If it happens again, let us know.',
      ),
    }),
  },
  {
    id: 'late-tonight',
    group: 'Needs attention',
    label: 'iOS late tonight',
    note: 'Tonight’s window was late, so the app put the apps to sleep itself.',
    facts: (d) => ({
      ...d,
      health: nightTrouble(
        'iOS was late putting me to bed tonight.',
        'I’ve put your apps to sleep myself. Access is still on, so later nights should start on time. If it keeps happening, let us know.',
      ),
    }),
  },
  {
    id: 'no-shield',
    group: 'Needs attention',
    label: 'Bedtime ran, nothing slept',
    note: 'The window ran with no shields up: an emptied bedtime list.',
    facts: (d) => ({ ...d, health: nightTrouble('Bedtime ran, but nothing slept.', 'Check that your bedtime list still has apps in it.') }),
  },

  // Day.
  {
    id: 'day',
    group: 'Day',
    label: 'Bedtime in 3 hours',
    note: 'The plain day: countdown, what sleeps, Loc’s quip.',
    facts: (d) => d,
  },
  {
    id: 'day-soon',
    group: 'Day',
    label: 'Bedtime in 40 minutes',
    note: 'Inside the hour: Loc says his bedtime-soon line (once per pick).',
    facts: (d, now) => ({ ...d, sleepsAt: from(now, 40 / 60), lock: { ...d.lock, nextChange: from(now, 40 / 60) } }),
  },
  {
    id: 'day-long',
    group: 'Day',
    label: 'Bedtime in 14 hours',
    note: 'Just up: a long countdown.',
    facts: (d, now) => ({ ...d, sleepsAt: from(now, 14), lock: { ...d.lock, nextChange: from(now, 14) } }),
  },
  {
    id: 'day-one-app',
    group: 'Day',
    label: 'One bedtime app',
    note: '“1 app goes to sleep at …”',
    facts: (d) => ({ ...d, apps: 1 }),
  },
  {
    id: 'day-websites',
    group: 'Day',
    label: 'Apps and websites',
    note: '“4 apps and 2 websites go to sleep at …”',
    facts: (d) => ({ ...d, apps: 4, websites: 2 }),
  },
  {
    id: 'day-only-websites',
    group: 'Day',
    label: 'Only websites',
    note: 'Typed-in websites, no apps picked.',
    facts: (d) => ({ ...d, apps: 0, websites: 3 }),
  },
  {
    id: 'day-categories',
    group: 'Day',
    label: 'Categories picked',
    note: 'A whole category can’t be counted: “Your apps go …”',
    facts: (d) => ({ ...d, apps: null }),
  },
  {
    id: 'day-list-change',
    group: 'Day',
    label: 'Bedtime list change waiting',
    note: 'A list edit lands at bedtime, so the count isn’t known yet.',
    facts: (d) => ({ ...d, listChanges: true, apps: null, websites: null }),
  },
  {
    id: 'day-tonight-off',
    group: 'Day',
    label: 'Tonight is off',
    note: 'Tonight switched off: names the next night that’s on.',
    facts: (d, now) => ({ ...d, tonightOn: false, sleepsAt: on(now, 2, 23 * 60) }),
  },
  {
    id: 'day-all-off',
    group: 'Day',
    label: 'Every night off',
    note: 'No night is on, so nothing is scheduled.',
    facts: (d, now) => ({
      ...d,
      sleepsAt: null,
      tonightOn: false,
      health: health(now, { routine: { activeNights: [] } }),
    }),
  },
  {
    id: 'day-all-off-always',
    group: 'Day',
    label: 'Every night off, always-asleep apps',
    note: 'No night on, but the always list still sleeps.',
    facts: (d, now) => ({
      ...d,
      sleepsAt: null,
      tonightOn: false,
      alwaysSleeps: true,
      health: health(now, { routine: { activeNights: [] } }),
    }),
  },
  {
    id: 'day-no-apps',
    group: 'Day',
    label: 'No bedtime apps picked',
    note: 'Armed, but the bedtime list is empty: nothing sleeps at bedtime.',
    facts: (d) => ({ ...d, bedtimeApps: false, apps: 0 }),
  },
  {
    id: 'day-no-apps-always',
    group: 'Day',
    label: 'No bedtime apps, always-asleep apps',
    note: 'Empty bedtime list, but the always list sleeps now.',
    facts: (d) => ({ ...d, bedtimeApps: false, apps: 0, alwaysSleeps: true }),
  },
  {
    id: 'day-always',
    group: 'Day',
    label: 'Always-asleep apps sleeping',
    note: 'The always list is asleep right now, but the countdown doesn’t say so.',
    gap: true,
    facts: (d) => ({ ...d, alwaysSleeps: true }),
  },
  {
    id: 'day-limit',
    group: 'Day',
    label: 'Daily limit used up',
    note: 'A limit’s apps sleep until midnight. Home has no fact for it yet (lock.blocked has the apps), so it reads as the plain day.',
    gap: true,
    facts: (d) => d,
  },
  {
    id: 'day-stood-down',
    group: 'Day',
    label: 'Stood down, no subscription',
    note: 'Unsubscribed and stood down: the line says nothing is scheduled.',
    facts: (d, now) => ({ ...unsubscribed(d, now), health: health(now) }),
  },

  // Woken up: this morning's proof.
  {
    id: 'woke-method',
    group: 'Woken up',
    label: 'Got up with the wake-up',
    note: 'This morning proven by the method: Loc says his wake-done line, the dot fills.',
    facts: (d, now) => {
      const w = woke(d, now, d.routine.method);
      return { ...w, won: new Set([...w.won, w.lock.morningKey]), mornings: w.mornings + 1 };
    },
  },
  {
    id: 'woke-pass',
    group: 'Woken up',
    label: 'Woken with a pass',
    note: 'A pass unlocked this morning: no line, no dot, and Home doesn’t say a pass was used.',
    gap: true,
    facts: (d, now) => woke(d, now, 'pass'),
  },
  {
    id: 'woke-emergency',
    group: 'Woken up',
    label: 'Woken with a night pass',
    note: 'A pass used overnight covers the morning: Home just reads as day.',
    gap: true,
    facts: (d, now) => woke(d, now, 'emergency'),
  },

  // Trial.
  {
    id: 'trial-tomorrow',
    group: 'Trial',
    label: 'Trial ends tomorrow',
    note: 'The paywall’s reminder, kept on Home. Button: Manage subscription.',
    facts: (d, now) => ({ ...d, trialEnd: on(now, 1, 10 * 60) }),
  },
  {
    id: 'trial-today',
    group: 'Trial',
    label: 'Trial ends today',
    note: 'The last hours of the trial.',
    facts: (d, now) => ({ ...d, trialEnd: from(now, 2) }),
  },
  {
    id: 'trial-weekday',
    group: 'Trial',
    label: 'Trial ends in 2 days',
    note: 'Names the weekday.',
    facts: (d, now) => ({ ...d, trialEnd: on(now, 2, 9 * 60) }),
  },

  // Week strip and the mornings count.
  {
    id: 'week-first',
    group: 'Week',
    label: 'First day',
    note: 'No mornings yet: the count is 0, no dots.',
    facts: (d) => ({ ...d, won: new Set(), mornings: 0 }),
  },
  {
    id: 'week-full',
    group: 'Week',
    label: 'Every morning this week',
    note: 'A long run: every past day this week got up.',
    facts: (d, now) => ({ ...d, won: pastDays(now, 6), mornings: 112 }),
  },
  {
    id: 'week-missed',
    group: 'Week',
    label: 'Missed mornings',
    note: 'Got up two days ago only; the rest missed.',
    facts: (d, now) => ({ ...d, won: new Set([dateKey(on(now, -2, 0))]), mornings: 4 }),
  },
  {
    id: 'week-free',
    group: 'Week',
    label: 'Nights off this week',
    note: 'Past days no night locked: not counted as missed.',
    facts: (d, now) => ({ ...d, won: new Set([dateKey(on(now, -1, 0))]), free: new Set([dateKey(on(now, -2, 0)), dateKey(on(now, -3, 0))]) }),
  },

  // Nap (Block now).
  {
    id: 'nap-day',
    group: 'Nap',
    label: 'Nap by day',
    note: 'Block now running: “Your apps are asleep”, Loc asleep.',
    facts: nap,
  },
  {
    id: 'nap-night-off',
    group: 'Nap',
    label: 'Nap on a night off',
    note: 'Leads over “Night off”.',
    facts: (d, now) => nap(nightOff(d, now), now),
  },
  {
    id: 'nap-paused',
    group: 'Nap',
    label: 'Nap on a paused night',
    note: 'Leads over the paused night’s “Awake tonight”.',
    facts: (d, now) => nap(paused(d, now), now),
  },
  {
    id: 'nap-attention',
    group: 'Nap',
    label: 'Nap while something needs fixing',
    note: 'A status that needs attention comes first, by design.',
    facts: (d, now) => nap({ ...d, armed: false, health: health(now, { armed: null }) }, now),
  },
  {
    id: 'nap-trial',
    group: 'Nap',
    label: 'Nap in the trial’s last days',
    note: 'The trial notice leads, so the running nap isn’t shown.',
    gap: true,
    facts: (d, now) => nap({ ...d, trialEnd: on(now, 1, 10 * 60) }, now),
  },
  {
    id: 'nap-morning',
    group: 'Nap',
    label: 'Nap during a locked morning',
    note: 'The morning’s hero stays and the nap isn’t mentioned, while Loc sleeps.',
    gap: true,
    morning: { method: 'steps' },
    facts: (d, now) => nap(morning(d, now, 'steps'), now),
  },
  {
    id: 'nap-night',
    group: 'Nap',
    label: 'Nap of picked apps at night',
    note: 'Says the apps wake at morning start; the napped ones wake when the nap ends.',
    gap: true,
    facts: (d, now) => nap(night(d, now), now),
  },

  // Night.
  {
    id: 'night',
    group: 'Night',
    label: 'Night, apps asleep',
    note: 'Bedtime to morning start. Loc says his apps-asleep line.',
    facts: night,
  },
  {
    id: 'night-unarmed',
    group: 'Night',
    label: 'Night nothing holds',
    note: 'The clock says night but no lock is armed: reads as day, with the status.',
    facts: (d, now) => ({ ...night(d, now), held: 'day', armed: false, health: health(now, { armed: null }) }),
  },
  {
    id: 'night-empty-list',
    group: 'Night',
    label: 'Night, empty bedtime list',
    note: 'Armed, but nothing on the list: reads as day.',
    facts: (d, now) => ({ ...night(d, now), bedtimeApps: false, apps: 0 }),
  },
  {
    id: 'paused',
    group: 'Night',
    label: 'Night pass, paused tonight',
    note: '“Awake tonight”: they sleep again at the next bedtime.',
    facts: (d, now) => paused(d, now),
  },
  {
    id: 'paused-after-midnight',
    group: 'Night',
    label: 'Paused, after midnight',
    note: 'The paused night’s morning is this morning.',
    facts: (d, now) => paused(d, now, { morning: 'this morning' }),
  },
  {
    id: 'paused-next-off',
    group: 'Night',
    label: 'Paused, tomorrow is off',
    note: 'They sleep again on a later night: names its weekday.',
    facts: (d, now) => {
      const resumes = on(now, 3, 23 * 60);
      return paused(d, now, { resumes, weekday: resumes.toLocaleDateString('en-US', { weekday: 'long' }) });
    },
  },
  {
    id: 'paused-all-off',
    group: 'Night',
    label: 'Paused, every night off',
    note: 'Nothing sleeps again until a night is turned on.',
    facts: (d, now) => paused(d, now, { resumes: null }),
  },
  {
    id: 'paused-ended',
    group: 'Night',
    label: 'Paused, subscription ended',
    note: 'Nothing sleeps after this night: there’s no subscription.',
    facts: (d, now) => paused(d, now, { resumes: null, ended: true }),
  },
  {
    id: 'paused-no-apps',
    group: 'Night',
    label: 'Paused, no bedtime apps after',
    note: 'The list is empty by then, so nothing sleeps after.',
    facts: (d, now) => paused(d, now, { resumes: null, noApps: true }),
  },
  {
    id: 'night-off',
    group: 'Night',
    label: 'Night off, always-asleep apps',
    note: 'A night switched off: bedtime apps awake, the always list asleep.',
    facts: (d, now) => ({ ...nightOff(d, now), alwaysSleeps: true }),
  },
  {
    id: 'night-off-nothing',
    group: 'Night',
    label: 'Night off, nothing sleeps',
    note: '“Nothing sleeps tonight. I’m sleeping anyway.”',
    facts: nightOff,
  },

  // Morning: the wake preview's pretend morning, sensors faked.
  {
    id: 'morning-steps',
    group: 'Morning',
    label: 'Walk steps',
    note: 'The count is Home’s hero (fake pedometer walking).',
    morning: { method: 'steps', fakes: { steps: 'walking' } },
    facts: (d, now) => morning(d, now, 'steps'),
  },
  {
    id: 'morning-steps-halfway',
    group: 'Morning',
    label: 'Walk steps, halfway',
    note: 'Halfway to the goal.',
    morning: { method: 'steps', fakes: { steps: 'halfway' } },
    facts: (d, now) => morning(d, now, 'steps'),
  },
  {
    id: 'morning-steps-denied',
    group: 'Morning',
    label: 'Walk steps, Motion off',
    note: 'Motion & Fitness is off: “I can’t hear you walking”.',
    morning: { method: 'steps', fakes: { steps: 'denied' } },
    facts: (d, now) => morning(d, now, 'steps'),
  },
  {
    id: 'morning-steps-none',
    group: 'Morning',
    label: 'Walk steps, no sensor',
    note: 'No motion sensor to read.',
    morning: { method: 'steps', fakes: { steps: 'unavailable' } },
    facts: (d, now) => morning(d, now, 'steps'),
  },
  {
    id: 'morning-downstairs',
    group: 'Morning',
    label: 'Go downstairs',
    note: 'The stairs session on Home (fake barometer, a scripted trip).',
    morning: { method: 'downstairs', fakes: { stairs: 'down' } },
    facts: (d, now) => morning(d, now, 'downstairs'),
  },
  {
    id: 'morning-downstairs-short',
    group: 'Morning',
    label: 'Go downstairs, half a floor',
    note: 'Not far enough down.',
    morning: { method: 'downstairs', fakes: { stairs: 'short' } },
    facts: (d, now) => morning(d, now, 'downstairs'),
  },
  {
    id: 'morning-downstairs-none',
    group: 'Morning',
    label: 'Go downstairs, no barometer',
    note: 'No barometer: falls back to the walk.',
    morning: { method: 'downstairs', fakes: { stairs: 'unavailable' } },
    facts: (d, now) => morning(d, now, 'downstairs'),
  },
  {
    id: 'morning-scan',
    group: 'Morning',
    label: 'Scan a code',
    note: '“Go find your code”; the camera is the fake viewfinder.',
    morning: { method: 'scan', fakes: { scan: 'fake' } },
    facts: (d, now) => morning(d, now, 'scan'),
  },
  {
    id: 'morning-place',
    group: 'Morning',
    label: 'Get to a place',
    note: 'Check in on Home (fake location, walking there).',
    morning: { method: 'place', fakes: { place: 'walking' } },
    facts: (d, now) => morning(d, now, 'place'),
  },
  {
    id: 'morning-place-there',
    group: 'Morning',
    label: 'Get to a place, there',
    note: 'Already at the place.',
    morning: { method: 'place', fakes: { place: 'there' } },
    facts: (d, now) => morning(d, now, 'place'),
  },
  {
    id: 'morning-place-denied',
    group: 'Morning',
    label: 'Get to a place, location off',
    note: 'Location access off.',
    morning: { method: 'place', fakes: { place: 'denied' } },
    facts: (d, now) => morning(d, now, 'place'),
  },
  {
    id: 'morning-pushups',
    group: 'Morning',
    label: 'Push-ups',
    note: 'Generic “Time to get up”: the morning’s saved count (pushups-done.ts) isn’t on Home.',
    gap: true,
    morning: { method: 'pushups' },
    facts: (d, now) => morning(d, now, 'pushups'),
  },
  {
    id: 'morning-unheld',
    group: 'Morning',
    label: 'Morning nothing holds',
    note: 'After a lapse’s last paid morning: the clock says morning, it reads as day.',
    facts: (d, now) => ({ ...morning(d, now, d.routine.method), held: 'day' }),
  },
];

/* The pick, in memory. */

type Picked = { id: string; at: number } | null;
let picked: Picked = null;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getPicked = () => picked;

const stateOf = (id: string | undefined) => APP_STATES.find((s) => s.id === id);

/** Shows `id` on Home, or the real state for null. A morning starts the wake preview's pretend one. */
export function pickAppState(id: string | null) {
  const next = id ? stateOf(id) : undefined;
  const was = stateOf(picked?.id);
  if (next?.morning) {
    fakeTheMorning(next.morning.method);
    if (next.morning.fakes) setWakePreview(next.morning.fakes);
  } else if (was?.morning) setWakePreview({ phase: 'real', method: 'routine' });
  picked = next ? { id: next.id, at: Date.now() } : null;
  listeners.forEach((l) => l());
}

/** The next or previous state in the list, wrapping round. */
export function stepAppState(by: 1 | -1) {
  const i = APP_STATES.findIndex((s) => s.id === picked?.id);
  pickAppState(APP_STATES[(i + by + APP_STATES.length) % APP_STATES.length].id);
}

export const usePickedAppState = () => stateOf(useSyncExternalStore(subscribe, getPicked, getPicked)?.id) ?? null;

const labsOn = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';

/**
 * For Home: the picked state's label and facts, or null when Home is real. A pretend morning
 * finished (the wake preview's "done") reads as got up with that method.
 */
export function useHomeMock(): { label: string; facts: (now: Date, routine: Routine) => HomeFacts } | null {
  const pick = useSyncExternalStore(subscribe, getPicked, getPicked);
  const done = useWakePreview().phase === 'woke';
  const state = stateOf(pick?.id);
  if (!labsOn || !pick || !state) return null;
  const finished = !!state.morning && done;
  return {
    label: finished ? `${state.label}, done` : state.label,
    facts: (now, routine) => {
      const day = { ...plainDay(now, routine), sayKey: `mock:${pick.id}:${pick.at}:` };
      if (!finished) return state.facts(day, now);
      const method = state.morning!.method;
      return woke({ ...day, method, routine: { ...routine, method } }, now, method);
    },
  };
}

