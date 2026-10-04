/**
 * Locturne's local notifications (GAME_PLAN, Build order Step 2): morning start, the bedtime
 * warning, revoked access, the day-5 trial reminder, and the shield-tap follow-up. Nothing
 * is pushed from a server.
 *
 * Every scheduled notification is a one-off for a real date, planned for the next
 * `DAYS_AHEAD` days by `planNotifications` (pure, tested in notifications.test.ts). Weekly
 * repeats can't follow a routine edit that waits for bedtime, a night switched off, or a
 * clock change, and a one-off can. The plan is redone on every app open and every routine
 * change (`rescheduleNotifications`), which also keeps it well under iOS's 64 pending.
 *
 * Permission is asked after the first night that held (GAME_PLAN), not in onboarding:
 * `isGoodMomentToAsk` says when, `askForNotifications` asks.
 *
 * Copy is Loc's (docs/VOICE.md): no shaming, no fake urgency, and plain when it's serious.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { hadSuccessfulNight, type NightCheck } from './health.ts';
import { readNightChecks } from './heartbeat.ts';
import { getProofs, type MorningProof } from './morning-proof.ts';
import { getPendingRoutine, getRoutine, hasRoutine, type Routine, type StoredRoutine } from './routine.ts';
import { armedSince, getArmedNight, getProtection, sharedGet, sharedRemove, sharedSet, type Protection } from './screen-time.ts';

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
  trial: (ends: Date) => ({
    title: 'Your free trial ends in 2 days.',
    body: `It ends ${ends.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, then the annual plan starts. To cancel, go to Settings › Apple ID › Subscriptions. No hard feelings. Some feelings.`,
  }),
};

/** Local midnight `days` after `date`, plus `minutes`, like lock-state.ts. */
function atMinute(date: Date, minutes: number, days = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, minutes);
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
  /** When the armed night was first armed: a morning whose night ended before then is free. */
  armedSince?: Date | null;
  /** Mornings already unlocked (a proof, a pass, an emergency unlock), by morning key. */
  unlockedMornings?: string[];
  /** When the trial first charges, if one is running and a reminder was asked for. */
  trialEnd?: Date | null;
  /** Which kinds the person wants. All of them when left out. */
  prefs?: NotificationPrefs;
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
  const plan: PlannedNotification[] = [];
  const nightly = facts.armed && (protection === 'on' || protection === 'off');

  for (let offset = 0; nightly && offset <= (facts.days ?? DAYS_AHEAD); offset++) {
    // The night into the morning `offset` days from today, under whichever routine it starts in.
    const pick = (r: Routine) => ({
      start: atMinute(now, r.bedtime, r.bedtime < r.morningStart ? offset : offset - 1),
      end: atMinute(now, r.morningStart, offset),
    });
    let r = routine;
    let { start, end } = pick(r);
    if (pending && start.getTime() >= pending.from) {
      r = pending.routine;
      ({ start, end } = pick(r));
    }
    if (start >= end) continue;
    // The evening before the morning starts the night, even when bedtime is after midnight.
    if (!r.activeNights.includes(atMinute(end, 0, -1).getDay())) continue;

    const key = dayKey(end);
    const warnAt = new Date(start.getTime() - BEDTIME_WARNING * MINUTE);
    if (warnAt > now && (protection === 'off' || prefs.bedtime)) {
      const kind = protection === 'off' ? 'revoked' : 'bedtime';
      plan.push({ id: `${ID_PREFIX}${kind}.${key}`, kind, at: warnAt, ...COPY[kind] });
    }
    // Not for a morning that's already free: it would say the apps are asleep when they aren't.
    const free = facts.unlockedMornings?.includes(key) || (facts.armedSince && facts.armedSince >= end);
    if (protection === 'on' && prefs.morning && end > now && !free) {
      plan.push({ id: `${ID_PREFIX}morning.${key}`, kind: 'morning', at: end, ...COPY.morning });
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
 * Whether now is the moment to ask (GAME_PLAN: after the first successful night). Only
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
 * Shows our notifications as banners even while Locturne is open. Safe to call more than
 * once; the functions below call it themselves.
 */
export function configureNotifications(): void {
  if (configured || !isIOS()) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
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
 * it. "Remind me" is asking for a notification, so iOS's prompt shows here if it hasn't yet;
 * without that the paywall's promise could silently not happen.
 */
export async function scheduleTrialReminder(trialEnd: Date): Promise<void> {
  sharedSet(TRIAL_KEY, trialEnd.getTime());
  if ((await getNotificationPermission()) === 'undetermined') await askForNotifications();
  else await rescheduleNotifications();
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

/** For a cancelled trial, a switch to monthly, or "Remind me" turned off. */
export async function cancelTrialReminder(): Promise<void> {
  sharedRemove(TRIAL_KEY);
  await rescheduleNotifications();
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
    const plan = planNotifications({
      routine: stored || !routine ? getRoutine() : routine,
      pending: stored ? getPendingRoutine() : null,
      protection: getProtection(),
      armed: armed !== null,
      armedSince: armed ? armedSince(armed) : null,
      unlockedMornings: getProofs().map((p) => p.morningKey),
      trialEnd: getTrialEnd(),
      prefs: getNotificationPrefs(),
      now: new Date(),
    });
    for (const n of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: { title: n.title, body: n.body, data: { kind: n.kind, at: n.at.getTime() } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at },
      });
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}
