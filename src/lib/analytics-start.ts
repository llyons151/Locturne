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
import PostHog, { PostHogPersistedProperty } from 'posthog-react-native';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import {
  ONBOARDING_VERSION,
  finishAnalyticsStartup,
  registerProperties,
  redactAnalyticsUrls,
  setAnalyticsEligibilityHandler,
  setAnalyticsSink,
  stopForChild,
  track,
  trackScreen,
  type NightVerdictEvent,
} from './analytics';
import { readNightChecks } from './heartbeat';
import { currentMorning } from './lock-state';
import { getProofs, onProofChange, proofMorningStart } from './morning-proof';
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
  // Onboarding stopped asking age on 2026-10-05, so no answer means allowed. Only an install
  // from before that said it was under 13 (stored `false`) stays stopped.
  const key = 'locturne.analytics.eligible';
  let initialized = false;
  const initialize = () => {
    if (initialized) return;
    initialized = true;
    initializeAnalytics();
  };
  setAnalyticsEligibilityHandler((allowed) => {
    sharedSet(key, allowed);
    if (allowed) initialize();
  });
  if (sharedGet<boolean>(key) === false) stopForChild();
  else initialize();
}

function initializeAnalytics(): void {
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
    before_send: redactAnalyticsUrls,
  });

  const optOut = () => {
    void client.optOut().catch(() => {});
    client.setPersistedProperty(PostHogPersistedProperty.Queue, null);
    // Unlink subscription events too; an empty attribute deletes the RevenueCat link.
    setAttributes({ $posthogUserId: '' });
  };
  setAnalyticsSink({
    capture: (event, properties) => void client.capture(event, properties),
    screen: (name) => void client.screen(name),
    register: (properties) => void client.register(properties),
    setPerson: (properties) => client.setPersonProperties(properties),
    // `optOut` only stops new events: what's already queued would still upload, and "nothing
    // more is sent" (privacy.html, under 13) has to hold for those too.
    optOut,
  });

  registerProperties({
    // Filter these out in PostHog ("Filter out internal and test users", docs/ANALYTICS.md).
    app_env: __DEV__ ? 'development' : 'production',
    store_stubbed: isStubbed(),
    onboarding_version: ONBOARDING_VERSION,
  });

  // RevenueCat's PostHog integration sends trial conversions, renewals and cancellations to
  // this same person, so retention can be split by who's still paying.
  // The id only exists once the SDK's storage has loaded (an empty one deletes the attribute),
  // and a known under-13 install is never linked.
  client
    .ready()
    .then(() => {
      finishAnalyticsStartup({
        optedOut: client.optedOut,
        getDistinctId: () => client.getDistinctId(),
        optOut,
        link: (id) => setAttributes({ $posthogUserId: id }),
      });
    })
    .catch(() => {});

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

/** Minutes after morning start, coarsely. A pass or emergency can come before it. */
export function afterStartBucket(minutes: number): string {
  if (minutes < 0) return 'before';
  if (minutes < 5) return '<5';
  if (minutes < 15) return '5-15';
  if (minutes < 30) return '15-30';
  if (minutes < 60) return '30-60';
  return '60+';
}

const MORNING_COUNT_KEY = 'locturne.analytics.morningCount';

/** Counts every proved morning: the proof list stops at 30, so its length can't. */
function nextMorningNumber(kept: number): number {
  // Installs from before this counter start from the list they have.
  const next = (sharedGet<number>(MORNING_COUNT_KEY) ?? kept - 1) + 1;
  sharedSet(MORNING_COUNT_KEY, next);
  return next;
}

/** `morning_unlocked` for the proof just recorded. Every way of waking the apps ends in one. */
function reportNewestProof(): void {
  const proofs = getProofs();
  const proof = proofs[0];
  if (!proof) return;
  const at = new Date(proof.at);
  // The times the proof was judged under: a routine read now could be an edit saved since.
  const start = proofMorningStart(proof) ?? currentMorning(at, toLockSettings(getRoutine(at))).start;
  track('morning_unlocked', {
    method: proof.kind,
    // Bucketed: the exact minute plus the event time would give away the wake-up time.
    after_start: afterStartBucket(Math.round((proof.at - start.getTime()) / 60_000)),
    morning_number: nextMorningNumber(proofs.length),
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
