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

import { WINDOW_PREFIX, type NightWindow } from './night-plan.ts';

/** The two lists from GAME_PLAN: apps that sleep at night, and apps that always sleep. */
export type SelectionId = 'night' | 'always';

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

/** Shield every app in the list. Stays up with the app closed, until `wakeApps`. */
export function sleepApps(id: SelectionId): void {
  blockSelection({ activitySelectionId: id }, TRIGGER);
}

export function wakeApps(id: SelectionId): void {
  unblockSelection({ activitySelectionId: id }, TRIGGER);
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
