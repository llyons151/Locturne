'use no memo';
// Reads the App Group stores during render (passes, mornings, the trial…), which change outside
// React, so the React Compiler stays out (as you-screen did).

/**
 * What Settings knows and does, shared by the SwiftUI page on iPhone (you-screen.ios.tsx) and
 * the web preview's stand-in (you-screen.tsx). Its own file so the iPhone page never imports
 * './you-screen', which on iOS would be itself (docs: the iOS self-import trap).
 */

import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, AppState, Linking, Platform } from 'react-native';

import * as haptic from '@/lib/haptics';
import { armIfPaid } from '@/hooks/use-app-start';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/lib/links';
import { getNotificationPrefs, getTrialEnd, setNotificationPrefs, type NotificationPrefs } from '@/lib/notifications';
import { onLockChange } from '@/lib/lock-controller';
import { getMorningsWon } from '@/lib/morning-proof';
import { getPassesLeft } from '@/lib/passes';
import { currentPlan, currentTrialEnd, manageSubscriptions, restore, type PlanId } from '@/lib/purchases';

import { getOwned, settleMoons } from '@/features/moons/moon-collection';
import { MOONS } from '@/features/moons/moon-data';
import { DEFAULT_MOON } from '@/features/moons/moon-theme';

import { refusal } from './fire-loc';

/** Settings' background: pure black, like the strip it grows out of (user, 2026-11-02). */
export const SETTINGS_BG = '#000000';

export const PLAN_LABEL: Record<PlanId, string> = { annual: 'Annual', monthly: 'Monthly' };

export const appVersion = () => Constants.expoConfig?.version ?? '';

export const open = (url: string) => Linking.openURL(url).catch(() => {});

/** Dev and preview builds: the Developer row and its page (app/(dev)/developer.tsx). */
export const devLabs = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';

/**
 * Every moon you have, after earning any due: Moonlight, which you start with, then the ladder,
 * rare and secret alike (user, 2026-11-02: "3 moons", no "of 10"; a new user has 1).
 */
function moonCount() {
  const owned = getOwned();
  return 1 + MOONS.filter((m) => m.id !== DEFAULT_MOON.id && owned[m.id]).length;
}

export const moonsLabel = (n: number) => (n === 1 ? '1 moon' : `${n} moons`);

const trialDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function sendFeedback() {
  const version = appVersion();
  const subject = encodeURIComponent(`Locturne${version ? ` ${version}` : ''} feedback`);
  Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() =>
    Alert.alert('No mail app', `Write to ${SUPPORT_EMAIL}. I read everything. Slowly.`),
  );
}

/**
 * While a chosen lock holds, iOS won't delete apps (`holdsDeletion` in screen-time.ts): for
 * whoever forgot the deal screen's line (user 2026-11-02).
 */
export function whyNoDeleting() {
  Alert.alert(
    "Why can't I delete apps?",
    'While your apps are asleep for the night, a Block now or a schedule, Locturne holds that, or the lock would be one long-press from gone. Any app, since iOS can’t hold just one. It comes back the moment they wake.',
  );
}

/** Help or feedback, picked from the system's action sheet (the web preview opens Help). */
export function helpOrFeedback() {
  if (Platform.OS !== 'ios') return open(LEGAL_URLS.support);
  ActionSheetIOS.showActionSheetWithOptions(
    { options: ['Help', 'Send feedback', 'Cancel'], cancelButtonIndex: 2 },
    (i) => (i === 0 ? open(LEGAL_URLS.support) : i === 1 ? sendFeedback() : null),
  );
}

/** Asks, then he refuses. Changes nothing (fire-loc.ts). */
export function fireLoc() {
  Alert.alert('Fire Loc?', 'He’ll be removed from Locturne and from your life.', [
    { text: 'Keep him', style: 'cancel' },
    {
      text: 'Fire him',
      style: 'destructive',
      onPress: () => {
        haptic.thud();
        const r = refusal();
        Alert.alert(r.title, r.line, [{ text: r.ok }]);
      },
    },
  ]);
}

/**
 * The App Store's write-a-review page once `ios.appStoreUrl` is in app.json (it needs the
 * app's Apple ID); until then Apple's in-app prompt, which iOS may decline to show.
 */
export function rate() {
  const store = StoreReview.storeUrl();
  if (store) open(`${store}${store.includes('?') ? '&' : '?'}action=write-review`);
  else StoreReview.requestReview().catch(() => {});
}

export const subscribe = () => router.push('/onboarding?resume=paywall');
export const cancelSubscription = () => router.push('/cancel');
export const openPasses = () => router.push('/exits');
export const openDeveloper = () => router.push('/developer');
export const openDiagnostics = () => router.push('/diagnostics');

/**
 * Everything the page shows, read again whenever it comes back into view, on every sync and on
 * every return to the foreground: a pass spent on the exits screen, a trial that ended, or a
 * plan the paywall just sold must show here.
 */
export function useSettings() {
  const [alerts, setAlerts] = useState<NotificationPrefs>(getNotificationPrefs);
  const toggle = (key: keyof NotificationPrefs) => (on: boolean) => {
    const next = { ...alerts, [key]: on };
    setAlerts(next);
    setNotificationPrefs(next).catch(() => {});
  };

  // Read-only: it runs as useState's initialiser, so during render (moons settle in `refresh`).
  const read = () => ({
    passesLeft: getPassesLeft(),
    mornings: getMorningsWon(),
    moons: moonCount(),
  });
  const [facts, setFacts] = useState(read);

  // The store's trial end, not the reminder's saved date: that one is gone when "Remind me" was
  // off or renewal was turned off mid-trial. The saved date stands in until the store answers.
  const [trialEnd, setTrialEnd] = useState<Date | null>(getTrialEnd);
  const inTrial = (trialEnd?.getTime() ?? 0) > Date.now();

  // Undefined until the store answers, so a subscriber never sees "Subscribe" flash by.
  const [plan, setPlan] = useState<PlanId | null | undefined>(undefined);
  const askPlan = () => {
    currentPlan().then(setPlan, () => {});
    currentTrialEnd().then(setTrialEnd, () => {});
  };
  const refresh = useCallback(() => {
    // A moon earned while away (a morning won in the background) counts here.
    settleMoons();
    setFacts(read());
    askPlan();
  }, []);
  useFocusEffect(refresh);
  useEffect(() => onLockChange(refresh), [refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  // Apple's sheet (cancel, or switch plans in the group); its web page where there's no sheet.
  const manage = () => {
    const page = () => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
    manageSubscriptions()
      .then((shown) => (shown ? null : page()))
      .catch(page)
      .finally(askPlan);
  };

  const [restoring, setRestoring] = useState(false);
  const restorePurchases = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const { entitled } = await restore();
      if (entitled) {
        askPlan();
        // A routine saved but never armed (declined, or bought on another phone) arms now.
        armIfPaid();
        Alert.alert('You’re subscribed', 'Your subscription is restored.');
      } else {
        Alert.alert('Nothing to restore', 'There’s no Locturne subscription on this Apple ID.');
      }
    } catch {
      Alert.alert('The App Store isn’t answering', 'Check your connection and try again.');
    } finally {
      setRestoring(false);
    }
  };

  /** "Annual", "Annual trial", "None", or blank while the store is asked. */
  const planValue = plan === null ? 'None' : plan ? `${PLAN_LABEL[plan]}${inTrial ? ' trial' : ''}` : '';
  /** Under the plan on the Subscription page. */
  const planNote = inTrial && trialEnd ? `Your trial ends on ${trialDate(trialEnd)}.` : 'Billed by the App Store.';

  return { ...facts, inTrial, trialEnd, alerts, toggle, plan, planValue, planNote, manage, restoring, restorePurchases };
}
