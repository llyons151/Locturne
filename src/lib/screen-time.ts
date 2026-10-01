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
  AuthorizationStatus,
  blockSelection,
  getAuthorizationStatus,
  getFamilyActivitySelectionId,
  isAvailable,
  isShieldActive,
  pollAuthorizationStatus,
  requestAuthorization,
  unblockSelection,
  updateShield,
} from 'react-native-device-activity';

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
