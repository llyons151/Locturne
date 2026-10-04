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
  isSubsetOf,
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

import { settleLimits, type DailyLimit, type LimitId } from './daily-limits.ts';
import { dateKey } from './lock-state.ts';
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

/**
 * Is Locturne actually protecting anything? `getAccess` alone can't say, because it keeps
 * answering "approved" after access is revoked in Settings, until the app restarts. When
 * access goes, iOS also stops every monitored schedule and lifts every shield, so those are
 * checked too: an armed night with no windows left, or a list that should be asleep with no
 * shield up, means protection is off whatever the cached status says.
 */
export type Protection = 'on' | 'off' | 'notSetUp' | 'unavailable';

export function getProtection(): Protection {
  if (!isAvailable()) return 'unavailable';
  const access = getAccess();
  if (access === 'notDetermined') return 'notSetUp';
  if (access === 'denied') return 'off';
  if (getArmedNight() && armedWindowNames().length === 0) return 'off';
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
  return isAvailable() ? userDefaultsGet<T>(key) : (memory.get(key) as T | undefined);
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
 */
export async function armNight(
  windows: NightWindow[],
  list: SelectionId,
  times: { bedtime: number; morningStart: number },
): Promise<void> {
  const before = getArmedNight();
  disarmNight();
  try {
    await monitorNight(windows, list);
  } catch (error) {
    disarmNight();
    if (before) {
      // Keep the record even if iOS refuses these too: the morning stays locked, Home says
      // protection is off (`getProtection`), and the next sync tries again.
      userDefaultsSet(ARMED_KEY, before);
      await monitorNight(planNightWindows(before.bedtime, before.morningStart), list).catch(() => {});
    }
    throw error;
  }
  const armedAt = new Date().toISOString();
  const armed: ArmedNight = { ...times, windows: windows.length, armedAt, since: before ? armedSince(before).toISOString() : armedAt };
  userDefaultsSet(ARMED_KEY, armed);
}

async function monitorNight(windows: NightWindow[], list: SelectionId): Promise<void> {
  for (const w of windows) {
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
  for (const limit of getLimits()) {
    stopMonitoring([limit.id]);
    cleanUpAfterActivity(limit.id);
    userDefaultsRemove(usedUpKey(limit.id));
    unshield(limit.id);
  }
  unshield('always');
  wakeApps('night');
}

/**
 * Subscribed again: re-arms the daily limits and re-shields the always list. The night is
 * armed by `armTonight` / `armIfPaid`, which arm only with a subscription.
 */
export async function standUp(): Promise<void> {
  if (!isStoodDown()) return;
  sharedRemove(STOOD_DOWN_KEY);
  if (!isAvailable()) return;
  for (const limit of getLimits()) await armLimit(limit);
  reapplyStandingBlocks();
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
  return sharedGet<ArmedNight>(ARMED_KEY) ?? null;
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
 * closed. iOS refuses windows under 15 minutes, which the shortest nap already meets.
 */
export async function startNap(list: ActiveNap['list'], minutes: number): Promise<ActiveNap> {
  if (isStoodDown()) throw new Error('Block now needs a subscription.');
  const start = Date.now();
  const nap: ActiveNap = { start, end: start + minutes * 60_000, list };
  // iOS reads the window as clock times. Across the autumn clock change the end's clock time
  // can come before the start's (01:50 + 15 min = 01:05), which iOS takes as tomorrow: the
  // apps would sleep for about a day. Or it lands in the repeated hour, which iOS may read
  // as the first one, ending early. (In spring the clock span is an hour longer, which is fine.)
  const wall = (c: { hour: number; minute: number }) => c.hour * 60 + c.minute;
  const span = (wall(clockOf(nap.end)) - wall(clockOf(start)) + 1440) % 1440;
  if (span < minutes || span > minutes + 60) throw new NapClockChangeError();
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
 * extension's first window after bedtime (`settleLocturneLists` in
 * DeviceActivityMonitorExtension.swift), whichever comes first. Keep the two in step.
 */

const PENDING_LISTS_KEY = 'locturne.pendingLists';

export const draftId = (list: StandingList): DraftId => `${list}-next`;

function getPendingLists(): Partial<Record<StandingList, { from: number }>> {
  return sharedGet<Partial<Record<StandingList, { from: number }>>>(PENDING_LISTS_KEY) ?? {};
}

function setPending(list: StandingList, pending: { from: number } | null): void {
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
 * Gets the draft ready and returns its id, for Apple's picker. If removals are already
 * waiting, the draft still holds them, so the picker opens on the list as it will be.
 */
export function beginListEdit(list: StandingList): DraftId {
  if (!getPendingLists()[list]) copySelection(list, draftId(list));
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
  if (selectionSize(list) === 0 || (selectionSize(draft) > 0 && isSubsetOf(live, next))) {
    copySelection(draft, list);
    clearSelection(draft);
    setPending(list, null);
    return 'now';
  }
  if (selectionSize(draft) > 0) union(live, next, { persistAsActivitySelectionId: list, stripToken: true });
  setPending(list, { from: takeEffectAt.getTime() });
  return 'bedtime';
}

/**
 * Swaps in every draft whose bedtime has passed, and returns which lists changed. The old
 * picks are unshielded first, so removed apps really wake; re-shield and re-arm limits after.
 */
export function settleListChanges(now = new Date()): StandingList[] {
  const settled: StandingList[] = [];
  for (const [list, pending] of Object.entries(getPendingLists()) as [StandingList, { from: number }][]) {
    if (pending.from > now.getTime()) continue;
    if (hasSelection(list)) unshield(list);
    copySelection(draftId(list), list);
    clearSelection(draftId(list));
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

export function getLimits(): DailyLimit[] {
  const limits = sharedGet<DailyLimit[]>(LIMITS_KEY) ?? [];
  // A removal waiting for bedtime is `minutes: null`, which is stored without the field.
  return limits.map((l) => (l.pending ? { ...l, pending: { ...l.pending, minutes: l.pending.minutes ?? null } } : l));
}

export function saveLimits(limits: DailyLimit[]): void {
  userDefaultsSet(LIMITS_KEY, toPlist(limits));
}

export function limitUsedUpToday(id: LimitId): boolean {
  return sharedGet<string>(usedUpKey(id)) === dateKey(new Date());
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
  clearSelection(draftId(id));
  setPending(id, null);
  reapplyStandingBlocks();
}

/**
 * Applies everything loosened that was waiting for a bedtime that has now passed: list
 * removals, then looser or removed limits. Run when the app opens; until then the stricter
 * setting simply stays, which is the safe side.
 */
export async function settleLimitChanges(now = new Date()): Promise<void> {
  const lists = settleListChanges(now);
  const settled = settleLimits(getLimits(), now);
  if (!lists.length && !settled.rearm.length && !settled.removed.length) return;
  saveLimits(settled.limits);
  for (const id of settled.removed) removeLimit(id);
  for (const limit of settled.rearm) await armLimit(limit, { fresh: true });
  // A limit whose apps changed at bedtime: hand iOS the new picks.
  for (const limit of settled.limits) {
    if (lists.includes(limit.id) && !settled.rearm.includes(limit)) await armLimit(limit);
  }
  reapplyStandingBlocks();
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
 * so it stays and only its start moves no later than `until`. Re-shields every other rule.
 */
export function pauseNightUntil(until: Date, now = new Date()): void {
  if (!isAvailable()) return;
  settleListChanges(now);
  const waiting = getPendingLists().night;
  if (hasSelection('night')) {
    if (!waiting) copySelection('night', draftId('night'));
    unshield('night');
    clearSelection('night');
  }
  if (hasSelection(draftId('night'))) {
    setPending('night', { from: Math.min(waiting?.from ?? Infinity, until.getTime()) });
  }
  userDefaultsSet(NIGHT_HELD_KEY, false);
  reapplyStandingBlocks();
}
