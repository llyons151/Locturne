/**
 * Locturne's local notifications (GAME_PLAN, Build order Step 2): morning start, the bedtime
 * warning, revoked access, the trial reminder (noon, at least two days before the end), and the shield-tap follow-up. Nothing
 * is pushed from a server.
 *
 * Every scheduled notification is a one-off for a real date, planned for the next
 * `DAYS_AHEAD` days by `planNotifications` (pure, tested in notifications.test.ts). Weekly
 * repeats can't follow a routine edit that waits for bedtime, a night switched off, or a
 * clock change, and a one-off can. The plan is redone on every app open and every routine
 * change (`rescheduleNotifications`), which also keeps it well under iOS's 64 pending.
 *
 * Permission is asked on onboarding's `armed` screen, right after purchase, once he's said
 * what the notifications are for (decided 2026-10-03, docs/ONBOARDING_OPTIMIZATION.md §7).
 * `isGoodMomentToAsk` is the second chance, after the first night that held, for anyone who
 * got past `armed` without iOS's prompt. `askForNotifications` asks.
 *
 * Copy is Loc's (docs/VOICE.md): no shaming, no fake urgency, and plain when it's serious.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { hadSuccessfulNight, type NightCheck } from './health.ts';
import { readNightChecks } from './heartbeat.ts';
import { lastPaidMorning, onArmed } from './lock-controller.ts';
import { wallClock } from './lock-state.ts';
import { getProofs, proofUnlocks, type MorningProof } from './morning-proof.ts';
import { asArmed, getPendingRoutine, getRoutine, getRoutineChange, hasRoutine, holdsEarly, runsAs, type ArmedTimes, type Routine, type StoredRoutine } from './routine.ts';
import { getTone, type Tone } from './tone.ts';
import { armedSince, getArmedNight, getProtection, listChangeLandsAt, selectionSize, selectionSizeAfterChange, sharedGet, sharedRemove, sharedSet, type Protection } from './screen-time.ts';

const MINUTE = 60_000;
const DAY_MS = 24 * 60 * MINUTE;

/** Every identifier we schedule starts with this, so we never cancel anyone else's. */
export const ID_PREFIX = 'locturne.';
/** Minutes before bedtime for the warning. */
export const BEDTIME_WARNING = 15;
/** How far ahead to schedule. Each night is two notifications at most. */
export const DAYS_AHEAD = 8;
/** The paywall promises a reminder 2 days before the trial ends. */
export const TRIAL_REMINDER_DAYS_BEFORE = 2;

export type NotificationKind = 'morning' | 'bedtime' | 'revoked' | 'trial';

export type PlannedNotification = {
  id: string;
  kind: NotificationKind;
  at: Date;
  title: string;
  body: string;
};

/* The words. One place, so the voice stays consistent. */

export const COPY = {
  morning: { title: 'Morning.', body: 'Your apps stay asleep until you’re up. I’m not getting up first.' },
  bedtime: {
    title: `Bedtime in ${BEDTIME_WARNING} minutes.`,
    body: 'Then your apps sleep. Then I sleep.',
  },
  revoked: {
    title: 'Screen Time access is off.',
    body: 'So I can’t block anything tonight. Turn it back on in Settings. Until then I’m just a raccoon.',
  },
  // Named, not counted: noon two days before an 8:00 end is nearly three days out.
  trial: (ends: Date) => ({
    title: `Your free trial ends ${ends.toLocaleDateString('en-US', { weekday: 'long' })}.`,
    body: `It ends ${ends.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, then the annual plan starts. To cancel, tap Manage subscription in the You tab. No hard feelings. Some feelings.`,
  }),
};

/**
 * The bedtime and morning notes by how grumpy he was asked to be (`lib/tone.ts`). Grumpy is
 * `COPY`'s own. The titles stay the plain fact; his part is the body.
 */
export const TONE_COPY: Record<Tone, Pick<typeof COPY, 'morning' | 'bedtime'>> = {
  mild: {
    morning: { title: 'Morning.', body: 'Your apps are asleep until you’re up. No rush. Some rush.' },
    bedtime: { title: COPY.bedtime.title, body: 'Then your apps sleep. Then I do. Goodnight.' },
  },
  grumpy: { morning: COPY.morning, bedtime: COPY.bedtime },
  unbearable: {
    morning: { title: 'Morning. Up.', body: 'Your apps are asleep until you’re up. I’m not getting up first. Obviously.' },
    bedtime: { title: COPY.bedtime.title, body: 'Then your apps sleep. No negotiating. I’m too tired.' },
  },
};

/** Local midnight `days` after `date`, plus `minutes`, as lock-state.ts places it (`wallClock`). */
function atMinute(date: Date, minutes: number, days = 0): Date {
  return wallClock(date, minutes, days);
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * The You tab's switches. The revoked-access warning has no switch: it's the honest status
 * (GAME_PLAN, "Reliability"), and it only ever replaces a bedtime warning.
 */
export type NotificationPrefs = { bedtime: boolean; morning: boolean; trial: boolean };
export const DEFAULT_PREFS: NotificationPrefs = { bedtime: true, morning: true, trial: true };

export type PlanFacts = {
  /** The routine in force now. */
  routine: Routine;
  /** An edit waiting for bedtime: nights starting from `from` use it. */
  pending?: StoredRoutine['pending'] | null;
  protection: Protection;
  /** Whether a night is armed with iOS. Unarmed (before purchase, say), nothing will sleep. */
  armed: boolean;
  /**
   * The times iOS has armed (`getArmedNight`). A waiting edit's earlier bedtime only starts
   * early if they're its own (`holdsEarly`): arming can wait for a phantom night to pass.
   */
  armedTimes?: ArmedTimes | null;
  /** When the routine in force came into force (`getRoutineChange`): judges whose windows are armed (`runsAs`). */
  routineSince?: number | null;
  /** When the armed night was first armed: a morning whose night ended before then is free. */
  armedSince?: Date | null;
  /** Actual picks now and after the next native handoff; a parked emergency list returns later. */
  nightSelection?: { hasApps: boolean; change?: { at: Date; hasApps: boolean } };
  /**
   * The saved proofs (stairs, steps, a scan, a pass, an emergency unlock). A morning one of
   * them unlocks (`proofUnlocks`: made since its night began, under the routine it was made
   * under, or a pass or emergency for its key) is already free.
   */
  proofs?: MorningProof[];
  /** When the trial first charges, if one is running and a reminder was asked for. */
  trialEnd?: Date | null;
  /** How grumpy the bedtime and morning notes are. Grumpy when left out. */
  tone?: Tone;
  /** Which kinds the person wants. All of them when left out. */
  prefs?: NotificationPrefs;
  /** A lapsed subscription's last covered morning (`lastPaidMorning`): later nights don't sleep. */
  lastPaidMorning?: string | null;
  now: Date;
  days?: number;
};

/**
 * Everything to schedule, soonest first. For each night that's switched on:
 * - a bedtime warning `BEDTIME_WARNING` minutes before bedtime, or, while access is off,
 *   the revoked-access warning in its place;
 * - a morning-start note, unless access is off or the morning is already unlocked or wasn't
 *   armed in time (the apps aren't asleep, so it would lie).
 * Before access is set up or a night is armed, nothing about nights is sent at all. Each night follows the
 * routine in force when it starts, so a pending edit shows up from its first bedtime.
 */
export function planNotifications(facts: PlanFacts): PlannedNotification[] {
  const { routine, pending, protection, now } = facts;
  const prefs = facts.prefs ?? DEFAULT_PREFS;
  const words = { ...COPY, ...TONE_COPY[facts.tone ?? 'grumpy'] };
  const plan: PlannedNotification[] = [];
  const nightly = facts.armed && (protection === 'on' || protection === 'off');
  const hasAppsAt = (at: Date) => {
    const picks = facts.nightSelection;
    return !picks || (picks.change && at >= picks.change.at ? picks.change.hasApps : picks.hasApps);
  };

  for (let offset = 0; nightly && offset <= (facts.days ?? DAYS_AHEAD); offset++) {
    // The night into the morning `offset` days from today, under whichever routine it starts in.
    const pick = (r: Routine) => ({
      start: atMinute(now, r.bedtime, r.bedtime < r.morningStart ? offset : offset - 1),
      end: atMinute(now, r.morningStart, offset),
    });
    let r = routine;
    let { start, end } = pick(r);
    const underPending = !!pending && start.getTime() >= pending.from;
    if (pending && underPending) r = pending.routine;
    // Windows still armed for other times run until Locturne re-arms them (`asArmed`): an edit
    // whose arming waited out a phantom night sleeps the apps at the old bedtime. For a night of
    // the routine in force while an edit waits, not when they're the edit's early ones
    // (`runsAs`; `holdsEarly` below judges those).
    r = underPending ? asArmed(r, facts.armedTimes ?? null) : runsAs(r, pending ?? null, facts.armedTimes ?? null, facts.routineSince);
    ({ start, end } = pick(r));
    if (pending && underPending) {
      // An earlier bedtime only starts early if iOS holds it (`holdsEarly`, as
      // `inPendingFirstNight` judges it). Otherwise the edit's first night starts at `from`.
      // Judged by what iOS has armed now: the arming that makes it held reschedules (`onArmed`).
      const held = holdsEarly(start, atMinute(end, 0, -1).getDay(), routine, facts.armedTimes ?? null, pending);
      if (!held && start.getTime() < pending.from) start = new Date(pending.from);
    }
    // A night inside the spring clock gap has no length, but its windows all fire at the gap's
    // end and its morning locks: it gets its warning and its note. Equal times are no night.
    if (start > end || r.bedtime === r.morningStart) continue;
    // The evening before the morning starts the night, even when bedtime is after midnight.
    if (!r.activeNights.includes(atMinute(end, 0, -1).getDay())) continue;

    const key = dayKey(end);
    if (facts.lastPaidMorning && key > facts.lastPaidMorning) continue;
    const warnAt = new Date(start.getTime() - BEDTIME_WARNING * MINUTE);
    if (warnAt > now && hasAppsAt(start) && (protection === 'off' || prefs.bedtime)) {
      const kind = protection === 'off' ? 'revoked' : 'bedtime';
      plan.push({ id: `${ID_PREFIX}${kind}.${key}`, kind, at: warnAt, ...words[kind] });
    }
    // Not for a morning that's already free: it would say the apps are asleep when they aren't.
    // A night still to come runs under the routine it's planned under (`nightRanUnder`): a proof
    // has to come after it began, whatever routine it was made under.
    const unlocked = facts.proofs?.some((proof) => proofUnlocks(proof, { key, nightStart: start, ran: end > now }));
    const free = unlocked || (facts.armedSince && facts.armedSince >= end);
    if (protection === 'on' && prefs.morning && end > now && !free && hasAppsAt(end)) {
      plan.push({ id: `${ID_PREFIX}morning.${key}`, kind: 'morning', at: end, ...words.morning });
    }
  }

  const trial = facts.trialEnd && prefs.trial ? planTrialReminder(facts.trialEnd, now) : null;
  if (trial) plan.push(trial);
  return plan.sort((a, b) => +a.at - +b.at);
}

/**
 * The trial reminder: local noon, at least `TRIAL_REMINDER_DAYS_BEFORE` days before the
 * trial ends (`ends`, from the store: 7 days, or 14 on the exit offer), so the paywall's
 * promise holds whatever time the trial started. Null once that moment has passed.
 */
export function planTrialReminder(ends: Date, now: Date): PlannedNotification | null {
  const latest = new Date(ends.getTime() - TRIAL_REMINDER_DAYS_BEFORE * DAY_MS);
  let at = atMinute(latest, 12 * 60);
  if (at > latest) at = atMinute(latest, 12 * 60, -1);
  if (at <= now) return null;
  return { id: `${ID_PREFIX}trial`, kind: 'trial', at, ...COPY.trial(ends) };
}

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/**
 * Whether now is the second-chance moment to ask (after the first successful night). Only
 * while iOS would still show its prompt, and only once a night really held or a morning
 * was unlocked.
 */
export function isGoodMomentToAsk(
  permission: NotificationPermission,
  facts: { proofs: MorningProof[]; nights: NightCheck[] },
): boolean {
  return permission === 'undetermined' && (facts.proofs.length > 0 || hadSuccessfulNight(facts.nights));
}

/** The shield-tap follow-up lives with the shield's other words. */
export { shieldTap as shieldTapNotification } from './shield-copy.ts';

/**
 * Does tapping this notification open the wake-up screen? The shield-tap follow-up and the
 * morning-start one do: both are about getting up. The rest just open the app.
 */
export function opensWakeScreen(identifier: string): boolean {
  return identifier === `${ID_PREFIX}shieldTap` || identifier.startsWith(`${ID_PREFIX}morning.`);
}

/**
 * Is a wake-up screen already in front (`pathname` from expo-router)? Then a tap on one of
 * those notifications leaves it be: `/wake` turns into `/scan` for a scan routine, so
 * navigating again would stack another copy, and would drop a walk's `?method=steps`.
 */
export function wakeScreenShowing(pathname: string): boolean {
  return pathname === '/wake' || pathname === '/scan';
}

/**
 * Calls `open` with each notification the person taps, including the one that launched the
 * app. Returns the unsubscribe. A no-op off iPhone.
 */
export function onNotificationTap(open: (identifier: string) => void): () => void {
  if (!isIOS()) return () => {};
  const launched = Notifications.getLastNotificationResponse();
  if (launched) {
    Notifications.clearLastNotificationResponse();
    open(launched.notification.request.identifier);
  }
  const sub = Notifications.addNotificationResponseReceivedListener((response) =>
    open(response.notification.request.identifier),
  );
  return () => sub.remove();
}

/* Talking to iOS. Everything below is a no-op off iPhone. */

const isIOS = () => Platform.OS === 'ios';
const TRIAL_KEY = 'locturne.trialEnd';
const PREFS_KEY = 'locturne.notificationPrefs';
let configured = false;

/**
 * Shows our notifications as banners even while Locturne is open, and re-plans whenever the
 * night windows are re-armed (a deferred earlier bedtime armed after the phantom night moves
 * its warning: `holdsEarly`). Safe to call more than once; the functions below call it themselves.
 */
export function configureNotifications(): void {
  if (configured || !isIOS()) return;
  configured = true;
  onArmed(() => {
    rescheduleNotifications().catch(() => {});
  });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Right after notifications are allowed in onboarding: one real note a few seconds later, so
 * the first thing they hear from him is what the first night's will look like. `when` is that
 * night as `scheduleCopy(...).note` words it ("Tomorrow at 8:00 AM"). It deliberately doesn't
 * start with `ID_PREFIX`, so a reschedule can't cancel it before it lands.
 */
export async function sendFirstNote(when: string): Promise<void> {
  if (!isIOS() || (await getNotificationPermission()) !== 'granted') return;
  configureNotifications();
  const { title, body } = TONE_COPY[getTone()].bedtime;
  await Notifications.scheduleNotificationAsync({
    identifier: 'onboarding.firstNote',
    content: { title: `Like this. ${title}`, body: `${body} ${when}.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 4 },
  });
}

/** iOS's answer so far. Provisional and ephemeral count as granted. */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!isIOS()) return 'denied';
  const settings = await Notifications.getPermissionsAsync();
  const ios = settings.ios?.status;
  if (ios === undefined) return settings.granted ? 'granted' : settings.status === 'undetermined' ? 'undetermined' : 'denied';
  if (ios === Notifications.IosAuthorizationStatus.NOT_DETERMINED) return 'undetermined';
  return ios === Notifications.IosAuthorizationStatus.DENIED ? 'denied' : 'granted';
}

/**
 * True when it's the moment to show iOS's notification prompt: it hasn't been shown, and
 * the first night has held. Callers (the morning unlock, Home) check this, then explain in
 * one line and call `askForNotifications`.
 */
export async function shouldAskForNotifications(now = new Date()): Promise<boolean> {
  if (!isIOS()) return false;
  return isGoodMomentToAsk(await getNotificationPermission(), { proofs: getProofs(), nights: readNightChecks(now) });
}

/** Shows iOS's prompt, then schedules everything if allowed. Returns whether it was. */
export async function askForNotifications(): Promise<boolean> {
  if (!isIOS()) return false;
  configureNotifications();
  await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  const granted = (await getNotificationPermission()) === 'granted';
  if (granted) await rescheduleNotifications();
  return granted;
}

/** The stored trial end, if a reminder is wanted. */
export function getTrialEnd(): Date | null {
  const ms = sharedGet<number>(TRIAL_KEY);
  return typeof ms === 'number' ? new Date(ms) : null;
}

/**
 * Remembers the trial end and schedules the reminder 2 days before it. Purchases call this
 * when a trial starts with "Remind me" on. Kept in the App Group, so every reschedule keeps
 * it. Never prompts: `armed` explains the notifications and asks right after (a cold prompt
 * the instant the purchase lands got refused more). If permission never comes, `armed` and
 * `first-morning` say the reminder can't arrive and give the date instead.
 */
export async function scheduleTrialReminder(trialEnd: Date): Promise<void> {
  sharedSet(TRIAL_KEY, trialEnd.getTime());
  await rescheduleNotifications();
}

/** The You tab's switches, as last saved. */
export function getNotificationPrefs(): NotificationPrefs {
  return { ...DEFAULT_PREFS, ...sharedGet<Partial<NotificationPrefs>>(PREFS_KEY) };
}

/** Saves the switches and redoes the plan. Unlike routine edits, these apply at once: they only change what he says. */
export async function setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  sharedSet(PREFS_KEY, prefs);
  await rescheduleNotifications();
}

/** Whether the paywall's "Remind me" was on at purchase. */
export const TRIAL_REMINDER_KEY = 'locturne.trialReminder';

/**
 * Keeps the stored trial end in step with the store's (`currentTrialEnd`): a trial that
 * stopped renewing (cancelled in Apple's sheet, refunded) or ended loses its reminder and
 * Home's notice; one turned back on, with "Remind me" chosen, gets them back.
 */
export async function syncTrialEnd(end: Date | null): Promise<void> {
  const stored = getTrialEnd();
  if (!end) {
    if (stored) await cancelTrialReminder();
    return;
  }
  if (sharedGet<boolean>(TRIAL_REMINDER_KEY) === true && stored?.getTime() !== end.getTime()) {
    await scheduleTrialReminder(end);
  }
}

/** For a cancelled trial, or "Remind me" turned off. */
export async function cancelTrialReminder(): Promise<void> {
  sharedRemove(TRIAL_KEY);
  await rescheduleNotifications();
}

/**
 * The nightly ones fire at a local clock time, like the night windows: a date trigger becomes
 * a fixed interval on iOS (expo-notifications' `DateTriggerRecord`), so after a flight
 * "Bedtime in 15 minutes" would come at the old zone's time. Calendar parts with no time zone
 * float with the phone's. The trial reminder is a real instant, so it stays a date. Exported for
 * the tests (honest-fuzz.test.ts fires what iOS was handed).
 */
export function triggerFor(n: PlannedNotification): Notifications.SchedulableNotificationTriggerInput {
  if (n.kind === 'trial') return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at };
  // In the hour an autumn clock change repeats, calendar parts name its first pass, and iOS would
  // fire then: an hour early for one meant for the second. Those stay a real instant.
  const first = new Date(n.at.getFullYear(), n.at.getMonth(), n.at.getDate(), n.at.getHours(), n.at.getMinutes());
  if (first.getTime() !== n.at.getTime() - n.at.getSeconds() * 1000 - n.at.getMilliseconds()) {
    return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    year: n.at.getFullYear(),
    month: n.at.getMonth() + 1,
    day: n.at.getDate(),
    hour: n.at.getHours(),
    minute: n.at.getMinutes(),
    repeats: false,
  };
}

/** Our pending notifications as iOS has them, soonest first. For diagnostics. */
export async function getScheduledNotifications(): Promise<{ id: string; title: string; at: Date | null }[]> {
  if (!isIOS()) return [];
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all
    .filter((n) => n.identifier.startsWith(ID_PREFIX))
    .map((n) => {
      // iOS reports a date trigger as calendar parts or a relative interval, so read back the
      // time we stored with it instead.
      const at = (n.content.data as { at?: unknown } | null)?.at;
      return { id: n.identifier, title: n.content.title ?? '', at: typeof at === 'number' ? new Date(at) : null };
    })
    .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
}

let queue: Promise<void> = Promise.resolve();

/**
 * Replaces our scheduled notifications with a fresh plan. Call it after `saveRoutine`. It
 * plans from the stored routine and any edit waiting for bedtime, so tonight keeps the old
 * times even if the edited routine is passed in: `routine` is only used before onboarding
 * has stored one. Also runs on every app open and whenever protection changes
 * (`useHealth`). Calls are queued, so overlapping ones can't double-schedule.
 */
export function rescheduleNotifications(routine?: Routine): Promise<void> {
  const run = async () => {
    if (!isIOS()) return;
    configureNotifications();
    const ours = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
      n.identifier.startsWith(ID_PREFIX),
    );
    await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if ((await getNotificationPermission()) !== 'granted') return;

    const stored = hasRoutine();
    const armed = getArmedNight();
    const handoff = listChangeLandsAt('night');
    const plan = planNotifications({
      routine: stored || !routine ? getRoutine() : routine,
      pending: stored ? getPendingRoutine() : null,
      protection: getProtection(),
      armed: armed !== null,
      armedTimes: armed,
      routineSince: stored ? getRoutineChange()?.since : null,
      armedSince: armed ? armedSince(armed) : null,
      nightSelection: {
        hasApps: selectionSize('night') > 0,
        ...(handoff && !handoff.waitsForOpen ? { change: { at: handoff.at, hasApps: selectionSizeAfterChange('night') > 0 } } : {}),
      },
      proofs: getProofs(),
      trialEnd: getTrialEnd(),
      prefs: getNotificationPrefs(),
      tone: getTone(),
      lastPaidMorning: lastPaidMorning(),
      now: new Date(),
    });
    for (const n of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: { title: n.title, body: n.body, data: { kind: n.kind, at: n.at.getTime() } },
        trigger: triggerFor(n),
      });
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}
