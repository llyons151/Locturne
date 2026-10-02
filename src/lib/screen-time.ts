/**
 * Locturne's only door to Apple's Screen Time APIs (via react-native-device-activity).
 * Features call these functions and never import the library, so swapping or patching it
 * touches one file.
 *
 * The app never learns which apps someone picked. Apple's picker hands back an opaque token,
 * which the library stores in the shared App Group under one of our `SelectionId`s, so the
 * extensions can read it at bedtime while the app is closed.
 *
 * Everything is a safe no-op off iOS (web preview, Android): `isScreenTimeAvailable()` is
 * false there.
 */
import {
  activitySelectionMetadata,
  AuthorizationStatus,
  blockSelection,
  cleanUpAfterActivity,
  configureActions,
  getActivities,
  getAuthorizationStatus,
  getEvents,
  getFamilyActivitySelectionId,
  isAvailable,
  isShieldActive,
  pollAuthorizationStatus,
  requestAuthorization,
  startMonitoring,
  stopMonitoring,
  unblockSelection,
  updateShield,
  userDefaultsGet,
  userDefaultsRemove,
  userDefaultsSet,
} from 'react-native-device-activity';

import { settleLimits, type DailyLimit, type LimitId } from './daily-limits.ts';
import { dateKey } from './lock-state.ts';
import { WINDOW_PREFIX, type NightWindow } from './night-plan.ts';

/**
 * The lists from GAME_PLAN: apps that sleep at night, apps that always sleep, the apps a
 * Block now session picks, and one list per daily limit.
 */
export type SelectionId = 'night' | 'always' | 'block' | LimitId;

export type ScreenTimeAccess = 'approved' | 'denied' | 'notDetermined';

/** Written into the library's event log so we can tell our blocks apart from its own. */
const TRIGGER = 'locturne';

export function isScreenTimeAvailable(): boolean {
  return isAvailable();
}

function toAccess(status: number): ScreenTimeAccess {
  if (status === AuthorizationStatus.approved) return 'approved';
  if (status === AuthorizationStatus.denied) return 'denied';
  return 'notDetermined';
}

/**
 * Can lag behind Settings: if access is revoked while the app is running, this keeps
 * returning the old answer until the app restarts (a known iOS quirk).
 */
export function getAccess(): ScreenTimeAccess {
  return toAccess(getAuthorizationStatus());
}

/**
 * Shows Apple's Screen Time prompt for this person's own phone. iOS reports the answer
 * late, so poll until it settles.
 */
export async function requestAccess(): Promise<ScreenTimeAccess> {
  await requestAuthorization('individual');
  return toAccess(await pollAuthorizationStatus());
}

/** True once the person has picked apps for this list. */
export function hasSelection(id: SelectionId): boolean {
  return !!getFamilyActivitySelectionId(id);
}

/**
 * How many rows the list holds: apps, whole categories and websites. The names stay
 * hidden; `BlockedAppsView` draws them natively.
 */
export function selectionSize(id: SelectionId): number {
  if (!isAvailable()) return 0;
  const meta = activitySelectionMetadata({ activitySelectionId: id });
  if (!meta) return 0;
  // The library's Swift sends `webdomainCount`, although its types say `webDomainCount`.
  const sites = meta.webDomainCount ?? (meta as { webdomainCount?: number }).webdomainCount ?? 0;
  return meta.applicationCount + meta.categoryCount + sites;
}

/*
 * iOS keeps one blocklist for the whole app, so unshielding a list also unshields any of its
 * apps another rule still holds (an app in both a limit and the bedtime list, say). After
 * anything unshields, `reapplyStandingBlocks` puts back every rule still in force. The monitor
 * extension does the same after each event it handles (`reapplyLocturneBlocks` in
 * targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift): keep the two in step.
 */

/** Set while the night lock holds the bedtime apps, from bedtime until the morning wake. */
const NIGHT_HELD_KEY = 'locturne.nightHeld';

const shield = (id: SelectionId) => blockSelection({ activitySelectionId: id }, TRIGGER);
const unshield = (id: SelectionId) => unblockSelection({ activitySelectionId: id }, TRIGGER);

/** Shield every app in the list. Stays up with the app closed, until `wakeApps`. */
export function sleepApps(id: SelectionId): void {
  shield(id);
  if (id === 'night') userDefaultsSet(NIGHT_HELD_KEY, true);
}

/** Unshields the list, then re-shields whatever other rules still hold. */
export function wakeApps(id: SelectionId): void {
  unshield(id);
  if (id === 'night') userDefaultsSet(NIGHT_HELD_KEY, false);
  reapplyStandingBlocks();
}

export function isNightHeld(): boolean {
  return userDefaultsGet<boolean>(NIGHT_HELD_KEY) === true;
}

/**
 * Shields every list a rule still holds: always-blocked, the night lock, a running Block
 * now session, and limits used up today. Only ever adds shields. Safe to call any time.
 */
export function reapplyStandingBlocks(): void {
  if (!isAvailable() || getAccess() !== 'approved') return;
  const held: SelectionId[] = ['always'];
  if (isNightHeld()) held.push('night');
  const nap = readNap();
  if (nap && Date.now() < nap.end) held.push(nap.list);
  for (const limit of getLimits()) if (limitUsedUpToday(limit.id)) held.push(limit.id);
  for (const id of new Set(held)) if (hasSelection(id)) shield(id);
}

export function isAnyShieldUp(): boolean {
  return isShieldActive();
}

/**
 * The block screen's words. iOS draws the shield itself: a small icon, a title, a subtitle
 * and one button, so his line goes in the title.
 */
export function setShieldText({ title, subtitle, button }: { title: string; subtitle: string; button: string }) {
  updateShield(
    {
      title,
      subtitle,
      primaryButtonLabel: button,
      // Monochrome, matching the app's Nocturne look: near-black, white text, white pill.
      backgroundColor: { red: 11, green: 11, blue: 12 },
      iconSystemName: 'moon.zzz.fill',
      iconTint: { red: 255, green: 255, blue: 255 },
      titleColor: { red: 255, green: 255, blue: 255 },
      subtitleColor: { red: 161, green: 161, blue: 166 },
      primaryButtonLabelColor: { red: 11, green: 11, blue: 12 },
      primaryButtonBackgroundColor: { red: 255, green: 255, blue: 255 },
    },
    { primary: { behavior: 'close' } },
    TRIGGER,
  );
}

/** What's armed, kept in the App Group so it survives the app being closed. */
export type ArmedNight = {
  bedtime: number;
  morningStart: number;
  windows: number;
  armedAt: string;
};

const ARMED_KEY = 'locturne.armedNight';

function hourMinute(minutes: number) {
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

/**
 * Hands the night to iOS. Each window repeats daily and, when it starts, the monitor
 * extension shields `list`, even with the app closed. Nothing unshields at morning start:
 * the morning walk does that. Replaces whatever was armed before. If iOS refuses any
 * window, everything is disarmed and the error is thrown, so it never half-arms.
 */
export async function armNight(
  windows: NightWindow[],
  list: SelectionId,
  times: { bedtime: number; morningStart: number },
): Promise<void> {
  disarmNight();
  try {
    for (const w of windows) {
      configureActions({
        activityName: w.name,
        callbackName: 'intervalDidStart',
        actions: [{ type: 'blockSelection', familyActivitySelectionId: list }],
      });
      await startMonitoring(
        w.name,
        { intervalStart: hourMinute(w.start), intervalEnd: hourMinute(w.end), repeats: true },
        [],
      );
    }
  } catch (error) {
    disarmNight();
    throw error;
  }
  const armed: ArmedNight = { ...times, windows: windows.length, armedAt: new Date().toISOString() };
  userDefaultsSet(ARMED_KEY, armed);
}

/** Stops every night window. Doesn't unshield anything already asleep. */
export function disarmNight(): void {
  const names = armedWindowNames();
  if (names.length > 0) stopMonitoring(names);
  for (const name of names) cleanUpAfterActivity(name);
  userDefaultsRemove(ARMED_KEY);
}

/** The night windows iOS is monitoring right now. */
export function armedWindowNames(): string[] {
  return getActivities().filter((name) => name.startsWith(WINDOW_PREFIX));
}

export function getArmedNight(): ArmedNight | null {
  return userDefaultsGet<ArmedNight>(ARMED_KEY) ?? null;
}

/**
 * When the monitor extension last ran each window's start, newest first. This is the proof
 * the block was applied by iOS while the app was closed.
 */
export function windowStarts(): { window: string; at: Date }[] {
  return getEvents()
    .filter((e) => e.callbackName === 'intervalDidStart' && e.activityName.startsWith(WINDOW_PREFIX))
    .map((e) => ({ window: e.activityName, at: e.lastCalledAt }))
    .sort((a, b) => +b.at - +a.at);
}

/**
 * A nap (GAME_PLAN's "Block now") in progress, kept in the App Group so it survives the app
 * being closed. `list` is the bedtime apps or the session's own picks.
 */
export type ActiveNap = { start: number; end: number; list: 'night' | 'block' };

const NAP_KEY = 'locturne.nap';
const NAP_ACTIVITY = 'locturne-nap';

function clockOf(ms: number) {
  const d = new Date(ms);
  return { hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}

/**
 * Shields `list` now and hands the wake-up to iOS: a one-off window from now to the end,
 * whose `intervalDidEnd` unshields the list in the monitor extension, even with the app
 * closed. iOS refuses windows under 15 minutes, which the shortest nap already meets.
 */
export async function startNap(list: ActiveNap['list'], minutes: number): Promise<ActiveNap> {
  const start = Date.now();
  const nap: ActiveNap = { start, end: start + minutes * 60_000, list };
  configureActions({
    activityName: NAP_ACTIVITY,
    callbackName: 'intervalDidEnd',
    actions: [{ type: 'unblockSelection', familyActivitySelectionId: list }],
  });
  await startMonitoring(
    NAP_ACTIVITY,
    { intervalStart: clockOf(nap.start), intervalEnd: clockOf(nap.end), repeats: false },
    [],
  );
  shield(list);
  userDefaultsSet(NAP_KEY, nap);
  return nap;
}

/**
 * Wakes the nap's apps (except those another rule still holds) and forgets the nap. Safe
 * to call when no nap is running.
 */
export function endNap(): void {
  const nap = getNap();
  stopMonitoring([NAP_ACTIVITY]);
  cleanUpAfterActivity(NAP_ACTIVITY);
  userDefaultsRemove(NAP_KEY);
  if (nap) {
    unshield(nap.list);
    reapplyStandingBlocks();
  }
}

function readNap(): ActiveNap | null {
  return userDefaultsGet<ActiveNap>(NAP_KEY) ?? null;
}

/**
 * The running nap, or null. A nap past its end is tidied up here, in case iOS was late
 * calling the extension.
 */
export function getNap(): ActiveNap | null {
  const nap = readNap();
  if (nap && Date.now() >= nap.end) {
    userDefaultsRemove(NAP_KEY);
    stopMonitoring([NAP_ACTIVITY]);
    cleanUpAfterActivity(NAP_ACTIVITY);
    unshield(nap.list);
    reapplyStandingBlocks();
    return null;
  }
  return nap;
}

/** Forgets a list's picks, so a reused limit slot opens Apple's picker empty. */
export function clearSelection(id: SelectionId): void {
  const ids = userDefaultsGet<Record<string, string>>(SELECTION_IDS_KEY) ?? {};
  if (!(id in ids)) return;
  const rest = { ...ids };
  delete rest[id];
  userDefaultsSet(SELECTION_IDS_KEY, rest);
}

/** Where the library keeps every list's picks. */
const SELECTION_IDS_KEY = 'familyActivitySelectionIds';

/* Daily limits. The rules for editing them live in daily-limits.ts. */

const LIMITS_KEY = 'locturne.limits';
const LIMIT_EVENT = 'used-up';
/** Written by the monitor extension when a limit is used up: the day, as YYYY-MM-DD. */
const usedUpKey = (id: LimitId) => `locturne.limitReached.${id}`;

export function getLimits(): DailyLimit[] {
  return userDefaultsGet<DailyLimit[]>(LIMITS_KEY) ?? [];
}

export function saveLimits(limits: DailyLimit[]): void {
  userDefaultsSet(LIMITS_KEY, limits);
}

export function limitUsedUpToday(id: LimitId): boolean {
  return userDefaultsGet<string>(usedUpKey(id)) === dateKey(new Date());
}

/**
 * Hands one limit to iOS: a daily window from midnight to 23:59 whose event fires once the
 * list's apps have been used for `minutes` that day, and shields them, even with the app
 * closed. The window's start each midnight unshields them again. Usage from earlier today
 * counts, so a limit set at 4pm on an app already used for an hour shields it right away.
 * Re-arm whenever the list or the minutes change: iOS keeps a copy of the picks.
 */
export async function armLimit(limit: DailyLimit, { fresh = false } = {}): Promise<void> {
  const selection = getFamilyActivitySelectionId(limit.id);
  if (!selection) return;
  // A looser limit starts again from what's been used today, so forget today's used-up mark.
  if (fresh) userDefaultsRemove(usedUpKey(limit.id));
  configureActions({
    activityName: limit.id,
    callbackName: 'intervalDidStart',
    actions: [{ type: 'unblockSelection', familyActivitySelectionId: limit.id }],
  });
  configureActions({
    activityName: limit.id,
    callbackName: 'eventDidReachThreshold',
    eventName: LIMIT_EVENT,
    actions: [{ type: 'blockSelection', familyActivitySelectionId: limit.id }],
  });
  await startMonitoring(
    limit.id,
    { intervalStart: { hour: 0, minute: 0 }, intervalEnd: { hour: 23, minute: 59 }, repeats: true },
    [
      {
        familyActivitySelection: selection,
        threshold: hourMinute(limit.minutes),
        eventName: LIMIT_EVENT,
        includesPastActivity: true,
      },
    ],
  );
  // If it was used up under the old number, wake it; the event fires again if it's still over.
  if (fresh) unshield(limit.id);
}

/** Stops a limit, wakes its apps (unless another rule holds them) and forgets its picks. */
export function removeLimit(id: LimitId): void {
  stopMonitoring([id]);
  cleanUpAfterActivity(id);
  userDefaultsRemove(usedUpKey(id));
  unshield(id);
  clearSelection(id);
  reapplyStandingBlocks();
}

/**
 * Applies any looser limit edits whose bedtime has passed. Run when the app opens; until
 * then the stricter limit simply stays, which is the safe side.
 */
export async function settleLimitChanges(now = new Date()): Promise<void> {
  const settled = settleLimits(getLimits(), now);
  if (settled.rearm.length === 0 && settled.removed.length === 0) return;
  saveLimits(settled.limits);
  for (const id of settled.removed) removeLimit(id);
  for (const limit of settled.rearm) await armLimit(limit, { fresh: true });
  reapplyStandingBlocks();
}
