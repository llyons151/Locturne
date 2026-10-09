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
  intersection,
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
  onAuthorizationStatusChange,
  pollAuthorizationStatus,
  requestAuthorization,
  setFamilyActivitySelectionId,
  startMonitoring,
  stopMonitoring,
  unblockSelection,
  union,
  updateShield,
  updateShieldWithId,
  userDefaultsGet,
  userDefaultsRemove,
  userDefaultsSet,
} from 'react-native-device-activity';

import { MAX_LIMITS, settleLimits, type DailyLimit, type LimitId } from './daily-limits.ts';
import { dateKey, wallClock } from './lock-state.ts';
import { planNightWindows, WINDOW_PREFIX, type NightWindow } from './night-plan.ts';

/**
 * The lists from GAME_PLAN: apps that sleep at night, apps that always sleep, the apps a
 * Block now session picks, and one list per daily limit.
 */
export type SelectionId = 'night' | 'always' | 'block' | LimitId | DraftId;

/** The lists that stand from day to day, and so follow the next-bedtime rule when edited. */
export type StandingList = 'night' | 'always' | LimitId;

/** Where Apple's picker writes while a standing list is edited (see `beginListEdit`). */
export type DraftId = `${StandingList}-next`;

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

/** Whether Locturne is protecting anything (`getProtection`). */
export type Protection = 'on' | 'off' | 'notSetUp' | 'unavailable';

/**
 * Is Locturne actually protecting anything? `getAccess` alone can't say, because it keeps
 * answering "approved" after access is revoked in Settings, until the app restarts. When
 * access goes, iOS also stops every monitored schedule and lifts every shield, so those are
 * checked too: an armed night missing any committed window, or a list that should be asleep with no
 * shield up, means protection is off whatever the cached status says.
 */
export function getProtection(): Protection {
  if (!isAvailable()) return 'unavailable';
  const access = getAccess();
  if (access === 'notDetermined') return 'notSetUp';
  if (access === 'denied') return 'off';
  const armed = getArmedNight();
  if (armed && currentNightWindowNames().length !== armed.windows) return 'off';
  if (heldLists().length > 0 && !isShieldActive()) return 'off';
  return 'on';
}

/**
 * Calls `listener` when iOS reports a new Screen Time status. iOS doesn't always report a
 * revocation while the app runs, so also re-check `getProtection` whenever the app returns
 * to the foreground.
 */
export function watchAccess(listener: () => void): () => void {
  if (!isAvailable()) return () => {};
  const sub = onAuthorizationStatusChange(listener);
  return () => sub.remove();
}

/**
 * Shows Apple's Screen Time prompt for this person's own phone. iOS reports the answer
 * late, so poll until it settles.
 */
export async function requestAccess(): Promise<ScreenTimeAccess> {
  await requestAuthorization('individual');
  return toAccess(await pollAuthorizationStatus());
}

/*
 * Locturne's own records in the App Group (routine, morning proofs, heartbeats), so the
 * extensions can read them with the app closed. Off iOS they live in memory, which keeps the
 * web preview and the tests working.
 */
const memory = new Map<string, unknown>();

/**
 * UserDefaults only stores property lists. A JS `null` crosses the bridge as NSNull, which
 * isn't one, and iOS throws on the write, crashing the app. So null fields are dropped here
 * and come back missing: readers treat a missing field as null. Only plain objects and
 * arrays are walked.
 */
export function toPlist(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => v != null).map(toPlist);
  if (value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, toPlist(v)]),
    );
  }
  return value;
}

export function sharedGet<T>(key: string): T | undefined {
  // A missing key crosses the native bridge as `null` (expo-modules-core turns a nil `Any?`
  // into null), and readers test `=== undefined`: `hasRoutine()` would be true on a fresh
  // install and `subscriptionEnded()` for every subscriber. The fakes return null too.
  return (isAvailable() ? userDefaultsGet<T>(key) : (memory.get(key) as T | undefined)) ?? undefined;
}

export function sharedSet(key: string, value: unknown): void {
  if (value == null) return sharedRemove(key);
  if (isAvailable()) userDefaultsSet(key, toPlist(value));
  else memory.set(key, toPlist(value));
}

export function sharedRemove(key: string): void {
  if (isAvailable()) userDefaultsRemove(key);
  else memory.delete(key);
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
  const { apps, categories, sites } = countsOf(meta);
  return apps + categories + sites;
}

type Counts = { applicationCount: number; categoryCount: number; webDomainCount?: number };

/** The library's Swift sends `webdomainCount`, although its types say `webDomainCount`. */
function countsOf(meta: Counts) {
  const sites = meta.webDomainCount ?? (meta as { webdomainCount?: number }).webdomainCount ?? 0;
  return { apps: meta.applicationCount, categories: meta.categoryCount, sites };
}

/**
 * Is every pick in `sub` also in `sup`? Not the library's `isSubsetOf`: it compares
 * `webDomainCount`, which its Swift never sends, so a removed website passed as "nothing
 * removed" and was swapped out live, where `unblockSelection` never reached it again.
 */
function containsAll(sub: SelectionId, sup: SelectionId): boolean {
  const all = activitySelectionMetadata({ activitySelectionId: sub });
  const shared = intersection({ activitySelectionId: sub }, { activitySelectionId: sup }, { stripToken: true });
  if (!all || !shared) return false;
  const a = countsOf(all);
  const b = countsOf(shared);
  return a.apps === b.apps && a.categories === b.categories && a.sites === b.sites;
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
  return sharedGet<boolean>(NIGHT_HELD_KEY) === true;
}

/**
 * Shields every list a rule still holds: always-blocked, the night lock, a running Block
 * now session, and limits used up today. Only ever adds shields. Safe to call any time.
 */
export function reapplyStandingBlocks(): void {
  if (!isAvailable() || getAccess() !== 'approved') return;
  for (const id of heldLists()) shield(id);
}

/** Every list some rule holds asleep right now, that has apps in it. None without a subscription. */
function heldLists(): SelectionId[] {
  if (isStoodDown()) return [];
  const held: SelectionId[] = ['always'];
  if (isNightHeld()) held.push('night');
  const nap = readNap();
  if (nap && Date.now() < nap.end) held.push(nap.list);
  for (const limit of getLimits()) if (limitUsedUpToday(limit.id)) held.push(limit.id);
  return [...new Set(held)].filter((id) => selectionSize(id) > 0);
}

export function isAnyShieldUp(): boolean {
  return isShieldActive();
}

/** The block screen's words: his line is the title, plus one button. */
export type ShieldText = { title: string; subtitle: string; button: string };

/** What tapping the shield's button sends: a notification that opens Locturne, or nothing. */
export type ShieldTap = { title: string; body: string; identifier?: string; userInfo?: Record<string, unknown> } | null;

/*
 * Where the shield extension looks for its words (the library's Shared.swift): first a
 * config for the list holding the app, then the app-wide one. The monitor extension writes
 * the list's config when a window's `blockSelection` names a shield (`NIGHT_SHIELD`), so the
 * app writes both too, or the bedtime words would outlast the night.
 */
const CONFIG_FOR_LIST = 'shieldConfigurationForSelection_';
const ACTIONS_FOR_LIST = 'shieldActionsForSelection_';

/** The bedtime shield, copied in by the monitor extension at each night window's start. */
export const NIGHT_SHIELD = 'locturne-night';
/** The morning shield, copied onto the bedtime list by the extension when the last window ends. */
export const MORNING_SHIELD = 'locturne-morning';
/**
 * The always list's words, put back on the app-wide fallback by the extension when a rule
 * ends with the app closed (a nap, a limit's day, a night off), so its words don't linger.
 */
export const ALWAYS_SHIELD = 'locturne-always';
/** A used-up limit's words, restored by the extension instead while one is used up today. */
export const LIMIT_SHIELD = 'locturne-limit';

function shieldConfig({ title, subtitle, button }: ShieldText) {
  return {
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
  };
}

/**
 * A shield button can't open the app, but it can send a notification that does
 * (`shieldTapNotification` in notifications.ts).
 */
function shieldActions(tap: ShieldTap) {
  return {
    primary: {
      behavior: 'close' as const,
      ...(tap ? { actions: [{ type: 'sendNotification' as const, payload: tap }] } : {}),
    },
  };
}

/**
 * The block screen's words. iOS draws the shield itself: a small icon, a title, a subtitle
 * and one button, so his line goes in the title. Written app-wide and for the bedtime list,
 * which the monitor extension may have given the bedtime words at the last window.
 */
export function setShieldText(text: ShieldText, tap: ShieldTap = null) {
  const config = shieldConfig(text);
  const actions = shieldActions(tap);
  updateShield(config, actions, TRIGGER);
  if (!isAvailable()) return;
  userDefaultsSet(`${CONFIG_FOR_LIST}night`, config);
  userDefaultsSet(`${ACTIONS_FOR_LIST}night`, actions);
}

/**
 * The words the monitor extension puts up at bedtime with Locturne closed (`armNight` names
 * this shield). Without it, the bedtime apps would show whatever the app last wrote.
 */
export function setNightShieldText(text: ShieldText) {
  if (!isAvailable()) return;
  updateShieldWithId(shieldConfig(text), shieldActions(null), NIGHT_SHIELD);
}

/** The always list's words, kept for the extension (`ALWAYS_SHIELD`). */
export function setAlwaysShieldText(text: ShieldText) {
  if (!isAvailable()) return;
  updateShieldWithId(shieldConfig(text), shieldActions(null), ALWAYS_SHIELD);
}

/** A used-up limit's words, kept for the extension (`LIMIT_SHIELD`). */
export function setLimitShieldText(text: ShieldText) {
  if (!isAvailable()) return;
  updateShieldWithId(shieldConfig(text), shieldActions(null), LIMIT_SHIELD);
}

/**
 * The words, and the tap that sends the open-Locturne notification, that the monitor
 * extension puts on the bedtime apps at morning start with Locturne closed.
 */
export function setMorningShieldText(text: ShieldText, tap: ShieldTap) {
  if (!isAvailable()) return;
  updateShieldWithId(shieldConfig(text), shieldActions(tap), MORNING_SHIELD);
}

/** What's armed, kept in the App Group so it survives the app being closed. */
export type ArmedNight = {
  bedtime: number;
  morningStart: number;
  windows: number;
  armedAt: string;
  /**
   * When a night was first armed, kept across re-arms (a routine edit re-arms the windows).
   * Says whether a night was armed in time to lock its morning. Older records lack it.
   */
  since?: string;
  /**
   * When these times (bedtime and morning start) were first armed, kept across re-arms that
   * don't change them. The self-check judges nights from then (`checkNights`). Older records lack it.
   */
  timesSince?: string;
  /** Native handoffs use generation names; an app re-arm returns to night-N names. */
  nativeWindowPrefix?: string;
};

/** When protection was first armed: `since`, or `armedAt` for records from before it. */
export const armedSince = (armed: ArmedNight): Date => new Date(armed.since ?? armed.armedAt);

const ARMED_KEY = 'locturne.armedNight';

function hourMinute(minutes: number) {
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}

/**
 * Hands the night to iOS. Each window repeats daily and, when it starts, the monitor
 * extension shields `list`, even with the app closed. Nothing unshields at morning start:
 * the morning walk does that. Replaces whatever was armed before. If iOS refuses any
 * window, the new ones are stopped, the night that was armed before is handed back (so a
 * refused edit never leaves nothing armed) and the error is thrown, so it never half-arms.
 *
 * The record of the night armed before stays while iOS registers the new windows (one
 * bridge call each). A sync in that gap must still see a night armed: without one, a morning
 * not yet proven reads as free and wakes, and with no subscription everything stands down
 * under the arm, which then finishes and arms anyway (found by lock-controller.sim.test.ts).
 */
export async function armNight(
  windows: NightWindow[],
  list: SelectionId,
  times: { bedtime: number; morningStart: number },
): Promise<void> {
  const before = getArmedNight();
  // Native callbacks must not replace windows while the app is registering them.
  // A timestamp lets the extension recover if the app dies mid-registration.
  userDefaultsSet('locturne.nightArmingAt', Date.now());
  nightArming = windows.length;
  try {
    stopNightWindows();
    // The one-off settle activity gives way when these windows need its slot (`settleFits`);
    // the next sync registers it again if there's room.
    if (!settleFits(windows.length)) stopListSettle();
    await monitorNight(windows, list);
  } catch (error) {
    stopNightWindows();
    // iOS may already have run an accepted window's start (armed after bedtime): with nothing
    // armed before, nothing holds that night, so nothing may stay asleep under it.
    if (!before) wakeApps(list);
    // Unless something disarmed it meanwhile (standing down): then nothing comes back.
    if (before && getArmedNight()) {
      // Keep the record even if iOS refuses these too: the morning stays locked, Home says
      // protection is off (`getProtection`), and the next sync tries again.
      const restored = { ...before };
      delete restored.nativeWindowPrefix;
      userDefaultsSet(ARMED_KEY, restored);
      await monitorNight(planNightWindows(before.bedtime, before.morningStart), list).catch(() => {});
    }
    throw error;
  } finally {
    nightArming = null;
    userDefaultsRemove('locturne.nightArmingAt');
  }
  const armedAt = new Date().toISOString();
  const sameTimes = !!before && before.bedtime === times.bedtime && before.morningStart === times.morningStart;
  const armed: ArmedNight = {
    ...times,
    windows: windows.length,
    armedAt,
    since: before ? armedSince(before).toISOString() : armedAt,
    timesSince: sameTimes ? (before.timesSince ?? before.armedAt) : armedAt,
  };
  userDefaultsSet(ARMED_KEY, armed);
}

/** How many windows `armNight` is handing iOS right now, until it returns. */
let nightArming: number | null = null;

async function monitorNight(windows: NightWindow[], list: SelectionId): Promise<void> {
  for (const w of windows) {
    makeRoomFor(w.name);
    configureActions({
      activityName: w.name,
      callbackName: 'intervalDidStart',
      actions: [{ type: 'blockSelection', familyActivitySelectionId: list, shieldId: NIGHT_SHIELD }],
    });
    await startMonitoring(
      w.name,
      { intervalStart: hourMinute(w.start), intervalEnd: hourMinute(w.end), repeats: true },
      [],
    );
  }
}

/*
 * No subscription, nothing blocks (GAME_PLAN): never paid, or the subscription ended.
 * `standDown` keeps every setting and pick, so `standUp` brings it all back on purchase or
 * restore. The flag is in the App Group: the monitor extension's `reapplyLocturneBlocks`
 * checks it too, so nothing is re-shielded with the app closed.
 */
const STOOD_DOWN_KEY = 'locturne.stoodDown';

export function isStoodDown(): boolean {
  return sharedGet<boolean>(STOOD_DOWN_KEY) === true;
}

/** Stops every window, Block now and limit, and wakes every list. Settings are kept. */
export function standDown(): void {
  if (!isAvailable()) return;
  // First, so nothing below re-shields on its way out.
  sharedSet(STOOD_DOWN_KEY, true);
  disarmNight();
  endNap();
  stopLimits();
  unshield('always');
  wakeApps('night');
}

/** Stops and unshields every daily limit, keeping the settings. */
function stopLimits(): void {
  for (const limit of getLimits()) {
    stopMonitoring([limit.id]);
    cleanUpAfterActivity(limit.id);
    forgetUsedUp(limit.id);
    unshield(limit.id);
  }
}

/**
 * Subscribed again: re-arms the daily limits and re-shields the always list. The night is
 * armed by `armTonight` / `armIfPaid`, which arm only with a subscription.
 */
export async function standUp(): Promise<void> {
  // A stand-up whose limits iOS refused (access off at the time, say) is retried on every paid
  // settle: the stand-down flag is already gone by then, so it can't be the trigger.
  const retry = sharedGet<boolean>(LIMITS_UNARMED_KEY) === true;
  if (!isStoodDown() && !retry) return;
  sharedRemove(STOOD_DOWN_KEY);
  if (!isAvailable()) return;
  sharedSet(LIMITS_UNARMED_KEY, true);
  try {
    for (const limit of getLimits()) await armLimit(limit);
    sharedRemove(LIMITS_UNARMED_KEY);
  } finally {
    // Stood down again while iOS was registering: a limit that landed anyway would shield
    // (the extension doesn't check), so take them back off, even if a later one failed.
    if (isStoodDown()) stopLimits();
    reapplyStandingBlocks();
  }
}

const LIMITS_UNARMED_KEY = 'locturne.limitsUnarmed';

/** Stops every night window. Doesn't unshield anything already asleep. */
export function disarmNight(): void {
  stopNightWindows();
  userDefaultsRemove(ARMED_KEY);
}

/** Stops the night windows but keeps the record of what's armed, for a re-arm. */
function stopNightWindows(): void {
  const names = armedWindowNames();
  if (names.length > 0) stopMonitoring(names);
  for (const name of names) cleanUpAfterActivity(name);
}

/** The night windows iOS is monitoring right now. */
function hasActivity(name: string): boolean {
  return getActivities().includes(name);
}

export function armedWindowNames(): string[] {
  return getActivities().filter((name) => name.startsWith(WINDOW_PREFIX));
}

/**
 * The committed night generation's expected windows that iOS actually monitors.
 * An obsolete generation cannot protect the night: the extension ignores its
 * callbacks. Keep `armedWindowNames` broad so disarming still stops all of them.
 */
export function currentNightWindowNames(): string[] {
  const armed = getArmedNight();
  if (!armed) return [];
  const prefix = armed.nativeWindowPrefix ?? WINDOW_PREFIX;
  const expected = new Set(planNightWindows(armed.bedtime, armed.morningStart).map((_, i) => `${prefix}${i}`));
  return armedWindowNames().filter((name) => expected.has(name));
}

export function getArmedNight(): ArmedNight | null {
  return sharedGet<ArmedNight>(ARMED_KEY) ?? null;
}

/**
 * Is there a night lock at all: armed, with a subscription, or bedtime apps asleep under one
 * whatever the records say (an emergency must still wake them). The phase comes from the
 * clock, so after bedtime it says night even with nothing armed (never bought, stood down, or
 * arming failed). Off iOS (web, previews) the screens act as if there were.
 */
export function nightLockArmed(): boolean {
  return !isAvailable() || isNightHeld() || (getArmedNight() !== null && !isStoodDown());
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
/** iOS refuses DeviceActivity windows under 15 minutes (`intervalTooShort`): the shortest nap. */
export const NAP_SHORTEST = 15;
let napStarting = false;
let napGeneration = 0;

/** A Block now that would run across the clock going back an hour. */
export class NapClockChangeError extends Error {
  constructor() {
    super('The clocks go back during that nap. Try a time that ends before 1 AM or starts after 2 AM.');
  }
}

function clockOf(ms: number) {
  const d = new Date(ms);
  return { hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}

/**
 * Shields `list` now and hands the wake-up to iOS: a one-off window from now to the end,
 * whose `intervalDidEnd` unshields the list in the monitor extension, even with the app
 * closed. iOS refuses windows under 15 minutes (`NAP_SHORTEST`), so shorter ones never start.
 */
export async function startNap(list: ActiveNap['list'], minutes: number): Promise<ActiveNap> {
  if (minutes < NAP_SHORTEST) throw new Error(`A nap needs at least ${NAP_SHORTEST} minutes.`);
  if (isStoodDown()) throw new Error('Block now needs a subscription.');
  if (napStarting) throw new Error('A nap is already starting.');
  const start = Date.now();
  const nap: ActiveNap = { start, end: start + minutes * 60_000, list };
  // iOS reads the window as clock times. Across the autumn clock change the end's clock time
  // can come before the start's (01:50 + 15 min = 01:05), which iOS takes as tomorrow: the
  // apps would sleep for about a day. Or it lands in the repeated hour, which iOS may read
  // as the first one, ending early. (In spring the clock span is an hour longer, which is fine.)
  const wall = (c: { hour: number; minute: number }) => c.hour * 60 + c.minute;
  const span = (wall(clockOf(nap.end)) - wall(clockOf(start)) + 1440) % 1440;
  if (span < minutes || span > minutes + 60) throw new NapClockChangeError();
  napStarting = true;
  const generation = ++napGeneration;
  try {
    makeRoomFor(NAP_ACTIVITY);
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
    // A lapse or an exit may have cancelled this request while the native bridge
    // registered it. A subsequent renewal must not revive the cancelled request.
    if (generation !== napGeneration || isStoodDown()) {
      stopMonitoring([NAP_ACTIVITY]);
      cleanUpAfterActivity(NAP_ACTIVITY);
      throw new Error('The nap was cancelled before it started.');
    }
    // Publish the replacement before shielding: a delayed end from the previous
    // activity must see this session's deadline and leave its apps alone.
    userDefaultsSet(NAP_KEY, nap);
    shield(list);
    return nap;
  } finally {
    napStarting = false;
  }
}

/**
 * Wakes the nap's apps (except those another rule still holds) and forgets the nap. Safe
 * to call when no nap is running.
 */
export function endNap(): void {
  napGeneration++;
  const nap = getNap();
  stopMonitoring([NAP_ACTIVITY]);
  cleanUpAfterActivity(NAP_ACTIVITY);
  userDefaultsRemove(NAP_KEY);
  if (nap) {
    unshield(nap.list);
    reapplyStandingBlocks();
  }
}

/**
 * Hands a running nap's end back to iOS if iOS dropped it (Screen Time access turned off and
 * on, say). Every sync shields the nap's apps again (`reapplyStandingBlocks`), and with no
 * `intervalDidEnd` coming nothing would wake them at the end with the app closed. Registers a
 * one-off window to the nap's end: from now, or, under iOS's 15-minute floor, from 15 minutes
 * before the end, a start already past that iOS begins at once.
 */
export async function rearmNap(now = new Date()): Promise<void> {
  const nap = peekNap(now);
  if (!nap || napStarting || isStoodDown() || getAccess() !== 'approved' || hasActivity(NAP_ACTIVITY)) return;
  napStarting = true;
  const generation = napGeneration;
  try {
    makeRoomFor(NAP_ACTIVITY);
    configureActions({
      activityName: NAP_ACTIVITY,
      callbackName: 'intervalDidEnd',
      actions: [{ type: 'unblockSelection', familyActivitySelectionId: nap.list }],
    });
    const start = Math.min(now.getTime(), nap.end - NAP_SHORTEST * 60_000);
    await startMonitoring(
      NAP_ACTIVITY,
      { intervalStart: clockOf(start), intervalEnd: clockOf(nap.end), repeats: false },
      [],
    );
    // Ended, replaced or stood down while iOS registered it: this window is no one's now.
    if (generation !== napGeneration || isStoodDown() || readNap()?.end !== nap.end) {
      stopMonitoring([NAP_ACTIVITY]);
      cleanUpAfterActivity(NAP_ACTIVITY);
    }
  } finally {
    napStarting = false;
  }
}

function readNap(): ActiveNap | null {
  return sharedGet<ActiveNap>(NAP_KEY) ?? null;
}

/** The running nap, or null, without tidying anything up: safe to call while rendering. */
export function peekNap(now = new Date()): ActiveNap | null {
  const nap = isAvailable() ? readNap() : null;
  return nap && now.getTime() < nap.end ? nap : null;
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

/*
 * Editing a standing list (GAME_PLAN: every settings change takes effect from the next
 * bedtime). Apple's picker writes straight into whichever list it's given, so it edits a
 * draft instead. On Done, apps that were added join the live list at once, since that only
 * tightens things. If any were removed, the live list keeps them until bedtime, when the
 * draft replaces it: here when the app next opens (`settleListChanges`), or in the monitor
 * extension at the first interval start of any activity at or after `from` (a night window, a
 * daily limit's midnight or a nap's start: `settleLocturneLists` in
 * DeviceActivityMonitorExtension.swift), whichever comes first. Keep the two in step. A daily
 * limit's list waits for the app, which re-arms iOS's count with it (`settleLimitChanges`).
 */

const PENDING_LISTS_KEY = 'locturne.pendingLists';

export const draftId = (list: StandingList): DraftId => `${list}-next`;

/**
 * `empty`: the edit removes every app. Only this flag means "empty the list" at bedtime; a
 * missing draft alone means another settle (the extension's, at the same moment) got there
 * first, and the list is left as it is. `dated`: when `from` was worked out, so it can be
 * worked out again for that moment if the windows or the waiting routine edit change
 * (`delayListChanges`). The bedtime picks parked by an emergency unlock have none: they come
 * back when the pause ends. `awake`: for the bedtime list, whether it was awake when the change
 * was saved (`judgeListAwakeWith`), decided then and never again: the phone's state later (a
 * night held, Block now) says nothing about that moment. Older records lack it.
 */
type PendingList = { from: number; empty?: boolean; dated?: number; awake?: boolean };

/** Is the bedtime list awake at `now`, for a removal saved then? Set by lock-controller.ts. */
let bedtimeListAwake: ((now: Date) => boolean) | null = null;

/**
 * How `finishListEdit` judges whether the bedtime list is awake when a removal is saved
 * (`looserEditsStartAt` in lock-controller.ts, which imports this file and sets it on load).
 */
export function judgeListAwakeWith(judge: (now: Date) => boolean): void {
  bedtimeListAwake = judge;
}

function getPendingLists(): Partial<Record<StandingList, PendingList>> {
  return sharedGet<Partial<Record<StandingList, PendingList>>>(PENDING_LISTS_KEY) ?? {};
}

function setPending(list: StandingList, pending: PendingList | null): void {
  const all = { ...getPendingLists() };
  if (pending) all[list] = pending;
  else delete all[list];
  userDefaultsSet(PENDING_LISTS_KEY, all);
}

/** When a list's removals start, or null if none are waiting. */
export function listChangeStarts(list: StandingList): Date | null {
  const pending = getPendingLists()[list];
  return pending ? new Date(pending.from) : null;
}

/** Points `to` at `from`'s picks, or empties it when `from` has none. */
function copySelection(from: SelectionId, to: SelectionId): void {
  const token = getFamilyActivitySelectionId(from);
  if (token) setFamilyActivitySelectionId({ id: to, familyActivitySelection: token });
  else clearSelection(to);
}

/**
 * The picks to show for a standing list: the list itself, or its draft while the live list
 * is empty and a change waits. An emergency unlock parks the bedtime picks there until the
 * next bedtime (`pauseNightUntil`), and they're still the person's bedtime apps.
 */
export function shownSelection(list: StandingList): { id: SelectionId; size: number } {
  const size = selectionSize(list);
  if (size === 0 && getPendingLists()[list]) return { id: draftId(list), size: selectionSize(draftId(list)) };
  return { id: list, size };
}

/**
 * The picks as the person last chose them, for the Apps tab's rows: the draft while a
 * change waits, else the list. Removed apps sleep until the change lands (the pending note
 * says so), but they're gone from the rows at once, so a swiped-away row stays away.
 */
export function editedSelection(list: StandingList): { id: SelectionId; size: number } {
  const pending = getPendingLists()[list];
  if (pending && (pending.empty || hasSelection(draftId(list)))) {
    return { id: draftId(list), size: selectionSize(draftId(list)) };
  }
  return { id: list, size: selectionSize(list) };
}

/** The picks after a pending handoff, including an empty edit or an emergency restoration. */
export function selectionSizeAfterChange(list: StandingList): number {
  const pending = getPendingLists()[list];
  if (!pending || (!pending.empty && !hasSelection(draftId(list)))) return selectionSize(list);
  return selectionSize(draftId(list));
}

/**
 * Gets the draft ready and returns its id, for Apple's picker. If removals are already
 * waiting, the draft still holds them, so the picker opens on the list as it will be.
 */
export function beginListEdit(list: StandingList): DraftId {
  // Also when a change is waiting but its draft is gone: `editedSelection` shows the live list
  // then, so the edit starts from it too (a swipe would otherwise find nothing to remove).
  const pending = getPendingLists()[list];
  if (!pending || (!pending.empty && !hasSelection(draftId(list)))) copySelection(list, draftId(list));
  return draftId(list);
}

/**
 * Applies the picker's draft. Returns `'now'` when nothing was removed, or `'bedtime'` when
 * removals wait until `takeEffectAt`. Afterwards, re-shield (`reapplyStandingBlocks`) and
 * re-arm a limit whose list changed, since iOS keeps its own copy of a limit's picks.
 */
export function finishListEdit(list: StandingList, takeEffectAt: Date): 'now' | 'bedtime' {
  const draft = draftId(list);
  const live = { activitySelectionId: list };
  const next = { activitySelectionId: draft };
  const waiting = getPendingLists()[list];
  // The live list is empty because an emergency unlock parked its picks in the draft for the
  // rest of tonight (`pauseNightUntil`). Copying the draft live now would put the bedtime
  // apps back to sleep in a paused night; it stays the list from the end of the pause
  // instead, never earlier (an edit made with nothing armed would start at midnight).
  if (selectionSize(list) === 0 && waiting) {
    setPending(list, { from: waiting.from, empty: selectionSize(draft) === 0 });
    return 'bedtime';
  }
  if (selectionSize(list) === 0 || (selectionSize(draft) > 0 && containsAll(live.activitySelectionId, next.activitySelectionId))) {
    copySelection(draft, list);
    clearSelection(draft);
    setPending(list, null);
    return 'now';
  }
  if (selectionSize(draft) > 0) union(live, next, { persistAsActivitySelectionId: list, stripToken: true });
  // Removals already waiting stay in the draft, so they now start with these: never earlier
  // than they were due (a second edit once a night is armed would otherwise pull a change that
  // waits for midnight forward to that bedtime).
  const from = waiting ? Math.max(waiting.from, takeEffectAt.getTime()) : takeEffectAt.getTime();
  const kept = !!waiting && waiting.from > takeEffectAt.getTime();
  const dated = kept ? waiting.dated : Date.now();
  const awake = kept ? waiting.awake : list === 'night' && bedtimeListAwake ? bedtimeListAwake(new Date(dated!)) : undefined;
  setPending(list, {
    from,
    empty: selectionSize(draft) === 0,
    ...(dated === undefined ? {} : { dated }),
    ...(awake === undefined ? {} : { awake }),
  });
  return 'bedtime';
}

/**
 * The monitor extension swaps in a waiting list at an interval start up to this long before its
 * `from` (`settleLocturneLists`: iOS can start a bedtime window a little early).
 */
const SETTLE_SLACK_MS = 2 * 60_000;

/**
 * Moves waiting list changes later, never earlier: each to `dueAt(list, dated, awake)` (worked
 * out again for the moment it was dated, and whether the bedtime list was awake then) when that's
 * later. For when a looser edit's start was worked out from windows or a routine edit that have
 * changed since (`redateLooserEdits` in lock-controller.ts). With `earlier` it may move earlier
 * too, never before now: a removal made by day, when an earlier bedtime saved since starts a
 * night it would otherwise sleep through and wake in the middle of. One already due, or due
 * within the extension's slack (it may have swapped it), is left alone, and so are the bedtime
 * picks parked by an emergency unlock (no `dated`, or the live list emptied while they wait:
 * moving the change later would keep the bedtime list empty past the pause's end).
 * Returns the lists moved earlier to now: due, with no window start left to swap them in.
 */
export function delayListChanges(
  dueAt: (list: StandingList, dated: Date, awake: boolean | undefined) => { at: Date; earlier?: boolean },
  now = new Date(),
): StandingList[] {
  const dueNow: StandingList[] = [];
  for (const list of Object.keys(getPendingLists()) as StandingList[]) {
    // Read again for each list: the monitor extension may have settled it a moment ago.
    const pending = getPendingLists()[list];
    if (!pending || pending.dated === undefined || pending.from <= now.getTime() + SETTLE_SLACK_MS) continue;
    if (selectionSize(list) === 0) continue;
    const due = dueAt(list, new Date(pending.dated), pending.awake);
    const at = due.earlier ? Math.max(due.at.getTime(), now.getTime()) : due.at.getTime();
    if (at > pending.from || (due.earlier && at < pending.from)) {
      setPending(list, { ...pending, from: at });
      if (at <= now.getTime()) dueNow.push(list);
    }
  }
  return dueNow;
}

/** A one-off activity whose start swaps in a waiting list change no window would reach in time. */
const SETTLE_ACTIVITY = 'locturne-settle';
/** When the settle activity starts (ms), while one is registered. */
const SETTLE_AT_KEY = 'locturne.settleAt';
/** iOS monitors about 20 activities at once: 16 night windows at most, Block now, three limits. */
const ACTIVITY_CAP = 20;
/** iOS's shortest monitoring interval. */
const SHORTEST_INTERVAL_MS = 15 * 60_000;

/**
 * Is there room for the settle activity next to `windows` night windows, with Block now and
 * every daily limit kept free? Those are registered later, when they're asked for, and iOS
 * refuses one past its cap: a 16-window night leaves no room (round 53).
 */
function settleFits(windows: number): boolean {
  return windows + 1 + MAX_LIMITS + 1 <= ACTIVITY_CAP;
}

/**
 * Before registering `name`: if iOS is at its cap, the settle activity gives up its slot (a
 * night window, Block now or a limit matters more; the next sync registers it again if there's
 * room).
 */
function makeRoomFor(name: string): void {
  const activities = getActivities();
  if (activities.includes(name) || !activities.includes(SETTLE_ACTIVITY)) return;
  if (activities.length >= ACTIVITY_CAP) stopListSettle();
}

function stopListSettle(): void {
  if (sharedGet<number>(SETTLE_AT_KEY) === undefined && !hasActivity(SETTLE_ACTIVITY)) return;
  stopMonitoring([SETTLE_ACTIVITY]);
  userDefaultsRemove(SETTLE_AT_KEY);
}

/**
 * A moment's calendar parts, which iOS reads on the wall clock. `want` itself if those parts
 * name it, else the first quarter-hour after it whose parts do: in the autumn repeated hour
 * they name the first pass, an hour early (`settleLocturneLists` would find nothing due yet).
 */
function wallParts(ms: number) {
  const d = new Date(ms);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
}
/** The wall-clock reading of a moment, as a number that orders readings. */
function wallStamp(ms: number): number {
  const p = wallParts(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}
/**
 * The settle activity's interval for a change due at `want`: calendar parts iOS reads on the wall
 * clock, each naming one moment (`at`, the start, is `want` unless the autumn repeated hour makes
 * it ambiguous), and an end at least iOS's shortest interval later and after the start on the
 * wall clock too (across the autumn change, 01:50 + 15 min reads 01:05).
 */
export function settleInterval(want: number) {
  const at = unambiguous(want);
  let end = unambiguous(at + SHORTEST_INTERVAL_MS);
  while (wallStamp(end) - wallStamp(at) < SHORTEST_INTERVAL_MS) end = unambiguous(end + SHORTEST_INTERVAL_MS);
  return { at, intervalStart: wallParts(at), intervalEnd: wallParts(end) };
}

function unambiguous(ms: number): number {
  const named = (t: number) => {
    const p = wallParts(t);
    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second).getTime() === t;
  };
  let t = ms;
  while (!named(t)) t += SHORTEST_INTERVAL_MS;
  return t;
}

/**
 * Makes sure a waiting bedtime or always list change lands at its `from` with Locturne closed.
 * The monitor extension swaps lists at any activity's interval start (`settleLocturneLists`, run
 * first in `intervalDidStart`), normally the bedtime window `from` was worked out from. When the
 * windows were armed again since for other times (a later bedtime saved the same day: no window
 * at 23:00, the first at 02:30), nothing starts then, so a one-off activity is registered at
 * `from`. Only one, for the earliest such change, and only while iOS has room for it. Safe to
 * call at every sync: it re-registers only when the moment changes.
 */
export function scheduleListSettle(now = new Date(), plannedWindows = 0): void {
  if (!isAvailable()) return;
  // Not while new windows are being registered: the old ones are already stopped, so the cap
  // check below would count too few and the settle could take a slot the windows need.
  if (nightArming !== null) return;
  let want: number | null = null;
  if (!isStoodDown() && getArmedNight()) {
    for (const list of ['night', 'always'] as const) {
      // Looser edits only (`dated`): the bedtime picks an emergency unlock parked come back with
      // the next window that starts, not at a moment of their own.
      const pending = getPendingLists()[list];
      if (pending?.dated === undefined || selectionSize(list) === 0) continue;
      const from = pending.from;
      const landed = landsAt(list, now, false);
      if (!landed || landed.waitsForOpen || from <= now.getTime() + 60_000) continue;
      if (landed.at.getTime() <= from + SETTLE_SLACK_MS) continue;
      want = want === null ? from : Math.min(want, from);
    }
  }
  // Calendar parts name it on the wall clock, so it starts at the first moment they name alone.
  if (want !== null) want = settleInterval(want).at;
  const have = sharedGet<number>(SETTLE_AT_KEY) ?? null;
  // Unless iOS has dropped it meanwhile (it can drop every activity): then register it again.
  if (want !== null && want === have && hasActivity(SETTLE_ACTIVITY)) return;
  if (want === null && have === null) return;
  if (have !== null) {
    stopMonitoring([SETTLE_ACTIVITY]);
    userDefaultsRemove(SETTLE_AT_KEY);
  }
  if (want === null) return;
  // Room for it next to the windows armed and the ones the next arming plans, with Block now and
  // every limit kept free; and next to whatever else iOS has now.
  if (!settleFits(Math.max(armedWindowNames().length, plannedWindows))) return;
  if (getActivities().filter((name) => name !== SETTLE_ACTIVITY).length >= ACTIVITY_CAP) return;
  const { at, intervalStart, intervalEnd } = settleInterval(want);
  userDefaultsSet(SETTLE_AT_KEY, at);
  startMonitoring(SETTLE_ACTIVITY, { intervalStart, intervalEnd, repeats: false }, []).catch(() => {
    // iOS refused it: the next window or open settles the change, and the next sync tries again.
    userDefaultsRemove(SETTLE_AT_KEY);
  });
}

/**
 * When the phone really swaps in the bedtime or always list's waiting change: the first interval
 * start of any activity at or after its `from` (less the extension's slack), which is a night
 * window's start or a daily limit's midnight (`settleLocturneLists` runs at every one), or the
 * next open of Locturne when neither is armed. Null with nothing waiting. A daily limit's own
 * list isn't here: Locturne swaps it on the first open after `from` (`settleLimitChanges`).
 * `sleepsFirst`: a night window starts before then, so an app removed from the bedtime list may
 * sleep first, from that window until the swap.
 */
export function listChangeLandsAt(
  list: 'night' | 'always',
  now = new Date(),
): { at: Date; waitsForOpen: boolean; sleepsFirst: boolean } | null {
  return landsAt(list, now, true);
}

/** `listChangeLandsAt`, with or without the one-off settle activity (`scheduleListSettle`). */
function landsAt(list: 'night' | 'always', now: Date, settle: boolean): { at: Date; waitsForOpen: boolean; sleepsFirst: boolean } | null {
  const from = listChangeStarts(list);
  if (!from) return null;
  if (isStoodDown()) return { at: from, waitsForOpen: true, sleepsFirst: false };
  const armed = getArmedNight();
  const windows = armed && armedWindowNames().length > 0 ? planNightWindows(armed.bedtime, armed.morningStart) : [];
  const limits = getLimits().some((limit) => hasSelection(limit.id));
  const earliest = from.getTime() - SETTLE_SLACK_MS;
  let at: number | null = null;
  let sleepsFirst = false;
  for (let day = -1; day <= 8; day++) {
    for (const w of windows) {
      const t = wallClock(from, w.start, day).getTime();
      if (t >= earliest) at = at === null ? t : Math.min(at, t);
    }
    const midnight = wallClock(from, 0, day).getTime();
    if (limits && midnight >= earliest) at = at === null ? midnight : Math.min(at, midnight);
  }
  const settleAt = settle && hasActivity(SETTLE_ACTIVITY) ? (sharedGet<number>(SETTLE_AT_KEY) ?? null) : null;
  if (settleAt !== null && settleAt >= earliest) at = at === null ? settleAt : Math.min(at, settleAt);
  if (at === null) return { at: from, waitsForOpen: true, sleepsFirst: false };
  for (let day = -1; day <= 8; day++) {
    for (const w of windows) {
      const t = wallClock(now, w.start, day).getTime();
      if (t > now.getTime() && t < at) sleepsFirst = true;
    }
  }
  return { at: new Date(at), waitsForOpen: false, sleepsFirst };
}

/**
 * Swaps in every draft whose bedtime has passed, and returns which lists changed. The old
 * picks are unshielded first, so removed apps really wake; re-shield and re-arm limits after.
 */
export function settleListChanges(now = new Date(), { limits = true } = {}): StandingList[] {
  const settled: StandingList[] = [];
  for (const list of Object.keys(getPendingLists()) as StandingList[]) {
    // A daily limit's picks swap only with its re-arm (`settleLimitChanges`).
    if (!limits && list.startsWith('limit-')) continue;
    // Read again for each list: the monitor extension may have settled it a moment ago.
    const pending = getPendingLists()[list];
    if (!pending || pending.from > now.getTime()) continue;
    if (hasSelection(draftId(list)) || pending.empty) {
      if (hasSelection(list)) unshield(list);
      copySelection(draftId(list), list);
      clearSelection(draftId(list));
    }
    setPending(list, null);
    settled.push(list);
  }
  return settled;
}

/** Forgets a list's picks, so a reused limit slot opens Apple's picker empty. */
export function clearSelection(id: SelectionId): void {
  const ids = sharedGet<Record<string, string>>(SELECTION_IDS_KEY) ?? {};
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
/** How far ahead of now a used-up moment still counts as today's (a clock set back a day). */
const USED_UP_AHEAD_MS = 26 * 60 * 60 * 1000;
/** When it was used up (ms), written by the extension with the day. */
const usedUpAtKey = (id: LimitId) => `locturne.limitReachedAt.${id}`;

/** Forgets a limit's used-up mark: the day and the moment. */
function forgetUsedUp(id: LimitId): void {
  userDefaultsRemove(usedUpKey(id));
  userDefaultsRemove(usedUpAtKey(id));
}

/**
 * Was the limit used up today? By the moment it happened, against local midnight now: right
 * across a flight either way (a day counted in Tokyo isn't LA's), and still today's with the
 * clock set back (the real moment is after the false midnight). A mark from an older
 * extension has only the day: then the day decides.
 */
function usedUpToday(id: LimitId, now: Date): boolean {
  const at = sharedGet<number>(usedUpAtKey(id));
  if (typeof at === 'number') {
    // At least `minutes` after midnight (#82's bound): only then can the whole allowance have
    // been used today. A flight west can put the moment just after the new midnight.
    const minutes = getLimits().find((l) => l.id === id)?.minutes ?? 0;
    // And not more than a day ahead: a mark from a clock set forward (then put back) would
    // otherwise hold the apps for every real day until that moment comes round.
    return (
      at >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + minutes * 60_000 &&
      at < now.getTime() + USED_UP_AHEAD_MS
    );
  }
  return sharedGet<string>(usedUpKey(id)) === dateKey(now);
}

export function getLimits(): DailyLimit[] {
  const limits = sharedGet<DailyLimit[]>(LIMITS_KEY) ?? [];
  // A removal waiting for bedtime is `minutes: null`, which is stored without the field.
  return limits.map((l) => (l.pending ? { ...l, pending: { ...l.pending, minutes: l.pending.minutes ?? null } } : l));
}

export function saveLimits(limits: DailyLimit[]): void {
  userDefaultsSet(LIMITS_KEY, toPlist(limits));
}

export function limitUsedUpToday(id: LimitId, now = new Date()): boolean {
  return sharedGet<string>(usedUpKey(id)) !== undefined && usedUpToday(id, now);
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
  // Without a subscription the limit is only saved; `standUp` arms it.
  if (!selection || isStoodDown()) return;
  const previousDay = sharedGet<string>(usedUpKey(limit.id));
  const previousAt = sharedGet<number>(usedUpAtKey(limit.id));
  // A looser limit starts again from what's been used today, so forget today's used-up mark.
  if (fresh) forgetUsedUp(limit.id);
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
  // What iOS will count, recorded before it starts, so `settleLimitChanges` can tell when the
  // live picks have moved on from it. Put back if iOS refuses: it still counts the old.
  const armedKey = `${LIMIT_ARMED_PICKS_PREFIX}${limit.id}`;
  const before = sharedGet<string>(armedKey);
  sharedSet(armedKey, selection);
  makeRoomFor(limit.id);
  try {
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
  } catch (error) {
    if (before === undefined) sharedRemove(armedKey);
    else sharedSet(armedKey, before);
    // A refused replacement still enforces the old allowance. Keep its reached mark,
    // unless standing down cleared it or the extension recorded a newer threshold.
    if (fresh && !isStoodDown() && sharedGet<string>(usedUpKey(limit.id)) === undefined) {
      if (previousDay !== undefined) sharedSet(usedUpKey(limit.id), previousDay);
      if (previousAt !== undefined) sharedSet(usedUpAtKey(limit.id), previousAt);
    }
    throw error;
  }
  // Past usage can fire the new threshold before registration returns. Reapply it (and
  // overlapping night/always rules) after lifting the old allowance's shield.
  if (fresh) {
    unshield(limit.id);
    reapplyStandingBlocks();
  }
}

const LIMIT_ARMED_PICKS_PREFIX = 'locturne.limitArmedPicks.';

/** Has the limit's list changed since iOS was handed it? Then iOS still counts the old apps. */
function armedPicksStale(id: LimitId): boolean {
  const armed = sharedGet<string>(`${LIMIT_ARMED_PICKS_PREFIX}${id}`);
  return armed !== undefined && armed !== getFamilyActivitySelectionId(id);
}

/** Stops a limit, wakes its apps (unless another rule holds them) and forgets its picks. */
export function removeLimit(id: LimitId): void {
  stopMonitoring([id]);
  cleanUpAfterActivity(id);
  forgetUsedUp(id);
  sharedRemove(`${LIMIT_ARMED_PICKS_PREFIX}${id}`);
  unshield(id);
  clearSelection(id);
  clearSelection(draftId(id));
  setPending(id, null);
  reapplyStandingBlocks();
}

/**
 * A limit used up on an earlier day is lifted by its window's midnight start in the monitor
 * extension. If iOS skipped that (the phone was off at midnight), its apps would stay asleep
 * all day while the app says the limit isn't used up. Backstop: lift it here.
 */
function liftYesterdaysLimits(now: Date): void {
  if (!isAvailable()) return;
  let lifted = false;
  for (const limit of getLimits()) {
    // Not used up today (`usedUpToday`): an earlier day, or a flight that moved midnight.
    if (sharedGet<string>(usedUpKey(limit.id)) === undefined || usedUpToday(limit.id, now)) continue;
    forgetUsedUp(limit.id);
    unshield(limit.id);
    lifted = true;
  }
  if (lifted) reapplyStandingBlocks();
}

/**
 * Applies everything loosened that was waiting for a bedtime that has now passed: list
 * removals, then looser or removed limits. Run when the app opens; until then the stricter
 * setting simply stays, which is the safe side.
 */
export async function settleLimitChanges(now = new Date()): Promise<void> {
  liftYesterdaysLimits(now);
  const lists = settleListChanges(now);
  const settled = settleLimits(getLimits(), now);
  // Picks that moved on from what iOS counts with no waiting edit left for `lists` to show
  // (a re-arm iOS refused, or a swap an older build's extension made at bedtime).
  const swapped = settled.limits.filter((l) => armedPicksStale(l.id)).map((l) => l.id);
  // A saved limit can outlive its native activity: registration failed, iOS
  // dropped monitoring, or access was revoked and restored. Unchanged picks
  // alone are no evidence that iOS still counts them.
  const missing = isAvailable() && !isStoodDown()
    ? settled.limits.filter((l) => hasSelection(l.id) && !hasActivity(l.id)).map((l) => l.id)
    : [];
  if (!lists.length && !swapped.length && !missing.length && !settled.rearm.length && !settled.removed.length) return;
  try {
    for (const id of settled.removed) removeLimit(id);
    saveLimits(getLimits().filter((l) => !settled.removed.includes(l.id)));
    // Each looser limit is saved only once iOS has it. If iOS refuses, it stays pending, the
    // stricter one keeps being enforced (the safe side), and the next open tries again.
    for (const limit of settled.rearm) {
      await armLimit(limit, { fresh: true });
      saveLimits(getLimits().map((l) => (l.id === limit.id ? limit : l)));
    }
    // A limit whose apps changed at bedtime: hand iOS the new picks.
    for (const limit of settled.limits) {
      const changed = lists.includes(limit.id) || swapped.includes(limit.id);
      if ((!changed && !missing.includes(limit.id)) || settled.rearm.includes(limit)) continue;
      // Emptied at bedtime: nothing to count, so stop counting the old picks.
      if (!getFamilyActivitySelectionId(limit.id)) {
        stopMonitoring([limit.id]);
        forgetUsedUp(limit.id);
        sharedRemove(`${LIMIT_ARMED_PICKS_PREFIX}${limit.id}`);
      }
      // Changed picks start fresh; merely restoring missing monitoring keeps
      // today's reached mark, so recovery cannot grant a second allowance.
      else await armLimit(limit, { fresh: changed });
    }
  } finally {
    // List swaps unshield the old picks before awaiting registration. Restore
    // every surviving rule even if a native registration rejects.
    reapplyStandingBlocks();
  }
}

/*
 * The emergency unlock's night pause (src/lib/emergency.ts). The night windows re-shield the
 * bedtime list every 45 minutes, and the monitor extension marks the night held at each
 * start, so unshielding alone would only last until the next window. Instead the bedtime
 * picks are parked in the list's draft, exactly like an edit that removes apps: the live
 * list is empty for the rest of tonight, so each window start shields nothing, and at the
 * next bedtime the extension's `settleLocturneLists` (or `settleListChanges` here, if the
 * app opens first) puts the picks back before the window shields them. The windows stay
 * armed throughout, so nothing has to re-arm and the user does nothing.
 */

/**
 * Wakes the bedtime apps for the rest of tonight; they sleep again from `until` (the next
 * bedtime). If an edit to the list is already waiting, its draft is the list as it will be,
 * so it stays and starts at `until` too: never later, since the live list is empty until
 * then, and never earlier, which would end the pause in the middle of tonight (an edit made
 * with nothing armed starts at midnight). Re-shields every other rule.
 */
export function pauseNightUntil(until: Date, now = new Date()): void {
  // Stood down, nothing is asleep: parking the picks would leave a resubscribe tonight empty.
  if (!isAvailable() || isStoodDown()) return;
  // Not a daily limit's: its picks swap only with a re-arm of iOS's count, which isn't here.
  settleListChanges(now, { limits: false });
  const waiting = getPendingLists().night;
  if (hasSelection('night')) {
    if (!waiting) copySelection('night', draftId('night'));
    unshield('night');
    clearSelection('night');
  }
  // Keep the pause even when its list is empty. Otherwise an app added before
  // `until` becomes live immediately despite Home promising that tonight is paused.
  setPending('night', { from: until.getTime(), ...(hasSelection(draftId('night')) ? {} : { empty: true }) });
  userDefaultsSet(NIGHT_HELD_KEY, false);
  reapplyStandingBlocks();
}

/**
 * Brings forward when the bedtime picks parked by `pauseNightUntil` come back, to `until` (an
 * earlier bedtime armed during the pause: `endPauseAtNextBedtime` in lock-controller.ts). Only
 * while they're parked (the live list empty) and only ever earlier.
 */
export function moveNightPause(until: Date): void {
  const waiting = getPendingLists().night;
  if (!waiting || waiting.from <= until.getTime() || selectionSize('night') > 0) return;
  setPending('night', { ...waiting, from: until.getTime() });
}
