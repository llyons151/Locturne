/**
 * Starts PostHog once, at startup (the root layout calls this after `startPurchases`), and
 * plugs it into `analytics.ts`. Without a real key in app.json
 * (`expo.extra.posthog.apiKey`, a `phc_` key), or on the web preview, nothing is sent.
 *
 * Settings that the privacy policy depends on (docs/ANALYTICS.md, "Privacy"):
 * - no session replay and no touch autocapture: the screen shows the picked apps' names;
 * - error tracking on (the policy lists "error reports");
 * - main app only. The Screen Time extensions never load this.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { usePathname } from 'expo-router';
import PostHog from 'posthog-react-native';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import {
  ONBOARDING_VERSION,
  registerProperties,
  setAnalyticsSink,
  track,
  trackScreen,
  type NightVerdictEvent,
} from './analytics';
import { readNightChecks } from './heartbeat';
import { currentMorning } from './lock-state';
import { getProofs, onProofChange } from './morning-proof';
import { getNotificationPermission, ID_PREFIX } from './notifications';
import { isStubbed, setAttributes } from './purchases';
import { getRoutine, toLockSettings } from './routine';
import { sharedGet, sharedSet } from './screen-time';

const DEFAULT_HOST = 'https://us.i.posthog.com';
/** The last night `night_checked` reported, so each night is sent once. */
const NIGHT_REPORTED_KEY = 'locturne.analytics.nightReported';
const PERMISSION_REPORTED_KEY = 'locturne.analytics.notificationPermission';

export function postHogKey(raw: unknown): string | null {
  const key = String(raw ?? '').trim();
  return /^phc_[A-Za-z0-9]+$/.test(key) ? key : null;
}

export function startAnalytics(): void {
  const extra = Constants.expoConfig?.extra as
    | { posthog?: { apiKey?: unknown; host?: unknown; disableGeoip?: unknown } }
    | undefined;
  const apiKey = postHogKey(extra?.posthog?.apiKey);
  if (!apiKey || Platform.OS === 'web') return;

  const client = new PostHog(apiKey, {
    host: typeof extra?.posthog?.host === 'string' ? extra.posthog.host : DEFAULT_HOST,
    // "Application Opened" / "Became Active" / "Installed": the base of the retention views.
    captureAppLifecycleEvents: true,
    enableSessionReplay: false,
    personProfiles: 'always',
    disableGeoip: extra?.posthog?.disableGeoip === true,
    errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false } },
  });

  setAnalyticsSink({
    capture: (event, properties) => void client.capture(event, properties),
    screen: (name) => void client.screen(name),
    register: (properties) => void client.register(properties),
    setPerson: (properties) => client.setPersonProperties(properties),
    optOut: () => void client.optOut(),
  });

  registerProperties({
    // Filter these out in PostHog ("Filter out internal and test users", docs/ANALYTICS.md).
    app_env: __DEV__ ? 'development' : 'production',
    store_stubbed: isStubbed(),
    onboarding_version: ONBOARDING_VERSION,
  });

  // RevenueCat's PostHog integration sends trial conversions, renewals and cancellations to
  // this same person, so retention can be split by who's still paying.
  setAttributes({ $posthogUserId: client.getDistinctId() });

  onProofChange(reportNewestProof);
  watchNotificationTaps();
  const onActive = () => {
    reportNights();
    reportNotificationPermission().catch(() => {});
  };
  onActive();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') onActive();
  });
}

/**
 * `notification_opened` per tap. Only reads: `onNotificationTap` (notifications.ts) clears the
 * launch tap once handled, and useAppStart needs it to open the wake screen.
 */
function watchNotificationTaps(): void {
  if (Platform.OS !== 'ios') return;
  const opened = (response: Notifications.NotificationResponse) =>
    track('notification_opened', { kind: notificationKind(response.notification.request.identifier) });
  const launched = Notifications.getLastNotificationResponse();
  if (launched) opened(launched);
  Notifications.addNotificationResponseReceivedListener(opened);
}

/** `locturne.morning.2026-10-04` → `morning`. Never the date. */
function notificationKind(identifier: string): string {
  return identifier.startsWith(ID_PREFIX) ? identifier.slice(ID_PREFIX.length).split('.')[0] : 'other';
}

/** `notifications_permission` whenever iOS's answer changes (asked, or changed in Settings). */
async function reportNotificationPermission(): Promise<void> {
  const permission = await getNotificationPermission();
  if (permission === 'undetermined' || sharedGet<string>(PERMISSION_REPORTED_KEY) === permission) return;
  sharedSet(PERMISSION_REPORTED_KEY, permission);
  track('notifications_permission', { granted: permission === 'granted' });
}

/** `morning_unlocked` for the proof just recorded. Every way of waking the apps ends in one. */
function reportNewestProof(): void {
  const proofs = getProofs();
  const proof = proofs[0];
  if (!proof) return;
  const at = new Date(proof.at);
  const start = currentMorning(at, toLockSettings(getRoutine(at))).start;
  track('morning_unlocked', {
    method: proof.kind,
    minutes_after_start: Math.round((proof.at - start.getTime()) / 60_000),
    morning_number: proofs.length,
  });
}

/**
 * `night_checked` for every finished night not reported yet, oldest first: did the bedtime
 * block really start (the heartbeat's verdict)? This is how often the product works.
 */
export function reportNights(now = new Date()): void {
  let checks;
  try {
    checks = readNightChecks(now);
  } catch {
    return;
  }
  const last = sharedGet<string>(NIGHT_REPORTED_KEY) ?? '';
  const finished = checks
    .filter((c) => c.verdict !== 'unknown' && c.end.getTime() <= now.getTime() && c.morningKey > last)
    .reverse();
  for (const check of finished) {
    track('night_checked', {
      verdict: check.verdict as NightVerdictEvent,
      late_by_minutes: check.lateBy,
    });
  }
  if (finished.length) sharedSet(NIGHT_REPORTED_KEY, finished[finished.length - 1].morningKey);
}

/** A screen event per route (the tabs, wake, scan, exits). Onboarding sends its own steps. */
export function useScreenViews(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== '/onboarding') trackScreen(pathname);
  }, [pathname]);
}
