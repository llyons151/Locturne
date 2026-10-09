'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { PrimaryButton } from '@/components/buttons';
import { SwitchRow } from '@/components/controls';
import { Card, sym, ValueRow } from '@/components/grouped-list';
import { armIfPaid } from '@/hooks/use-app-start';
import { useProtection } from '@/hooks/use-protection';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/lib/links';
import {
  getNotificationPermission,
  getNotificationPrefs,
  getTrialEnd,
  rescheduleNotifications,
  setNotificationPrefs,
  type NotificationPermission,
  type NotificationPrefs,
} from '@/lib/notifications';
import { lapseStillCovers, onLockChange, readLock, subscriptionEnded, syncLock } from '@/lib/lock-controller';
import { getTone, setTone, type Tone } from '@/lib/tone';
import { getPassesLeft } from '@/lib/passes';
import { nextNightOn } from '@/lib/routine';
import { currentPlan, manageSubscriptions, restore, type PlanId } from '@/lib/purchases';
import { getScanCode } from '@/lib/scan';
import { bedtimeAppsAhead } from '@/lib/emergency';
import { getArmedNight, isStoodDown, selectionSize, type Protection } from '@/lib/screen-time';
import { noOrphan } from '@/lib/text';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { lapseLine } from './lapse-line';
import { TonePicker } from './tone-picker';

/**
 * The You tab: everything that isn't tonight. Routine holds the schedule and the wake-up
 * method, Apps holds both lists, so this is where you check he's working, find the ways
 * out, and manage notifications and the subscription.
 *
 * Order (GAME_PLAN): honest status first, then the humane exits, then account things. No
 * stats or charts; history lives on the morning share card.
 *
 * Passes, the emergency unlock and the scan code open the exits and scan screens; the plan
 * and Restore are src/lib/purchases.ts; the notification switches are saved and redo the
 * plan in src/lib/notifications.ts. Beta diagnostics hide behind a long press on the You
 * title, so App Review never sees a "beta" row.
 */

const PLAN_LABEL: Record<PlanId, string> = { annual: 'Annual', monthly: 'Monthly' };

const STATUS: Record<Protection, { icon: string; android: string; line: string }> = {
  on: { icon: 'lock.fill', android: 'lock', line: 'Screen Time access is on. Your apps sleep on schedule.' },
  // VOICE.md, "Access revoked": clear first, one small wink.
  off: {
    icon: 'exclamationmark.triangle.fill',
    android: 'warning',
    line: 'Screen Time access is off, so I can’t block anything. Turn it back on in Settings. Until then I’m just a raccoon.',
  },
  notSetUp: {
    icon: 'exclamationmark.triangle.fill',
    android: 'warning',
    line: 'Screen Time access isn’t on yet, so I can’t block anything. Set it up from the Apps tab.',
  },
  unavailable: { icon: 'iphone', android: 'smartphone', line: 'Blocking needs Screen Time, which only iPhone has.' },
};

/** The 1st after the month of the morning `now` belongs to: passes count by mornings (passes.ts). */
function refillDate(now: Date) {
  const [year, month] = readLock(now).morningKey.split('-').map(Number);
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

const open = (url: string) => Linking.openURL(url).catch(() => {});

function sendFeedback() {
  const version = Constants.expoConfig?.version;
  const subject = encodeURIComponent(`Locturne${version ? ` ${version}` : ''} feedback`);
  Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() =>
    Alert.alert('No mail app', `Write to ${SUPPORT_EMAIL}. I read everything. Slowly.`),
  );
}

/**
 * The App Store's write-a-review page once `ios.appStoreUrl` is in app.json (it needs the
 * app's Apple ID); until then Apple's in-app prompt, which iOS may decline to show.
 */
function rate() {
  const store = StoreReview.storeUrl();
  if (store) open(`${store}${store.includes('?') ? '&' : '?'}action=write-review`);
  else StoreReview.requestReview().catch(() => {});
}

export function YouScreen() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  // Checks the schedules and shields too, since iOS keeps reporting access as on after
  // it's revoked, until the app restarts.
  const [status] = useProtection();

  const [alerts, setAlerts] = useState<NotificationPrefs>(getNotificationPrefs);
  const [tone, setToneShown] = useState<Tone>(getTone);
  // His words only, so it applies now: the shield's text and the planned notes follow at once.
  const changeTone = (next: Tone) => {
    setTone(next);
    setToneShown(next);
    syncLock(new Date());
    rescheduleNotifications().catch(() => {});
  };
  const toggle = (key: keyof NotificationPrefs) => (on: boolean) => {
    const next = { ...alerts, [key]: on };
    setAlerts(next);
    setNotificationPrefs(next).catch(() => {});
  };
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  // Re-read on return from Settings: iOS doesn't restart the app when this one changes.
  useEffect(() => {
    const check = () => getNotificationPermission().then(setPermission, () => {});
    check();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => sub.remove();
  }, []);
  // Read again whenever the tab comes back into view: a pass spent on the exits screen or a
  // trial that ended since must show here.
  const read = () => ({
    // Only someone in a trial has a reminder to switch off.
    inTrial: (getTrialEnd()?.getTime() ?? 0) > Date.now(),
    passesLeft: getPassesLeft(),
  });
  const [{ inTrial, passesLeft }, setFacts] = useState(read);

  // Undefined until the store answers, so a subscriber never sees "Subscribe" flash by.
  // Asked again on focus: the paywall may have just sold one.
  const [plan, setPlan] = useState<PlanId | null | undefined>(undefined);
  // The facts and the plan, and with them the status line (read during render).
  const refresh = useCallback(() => {
    setFacts(read());
    currentPlan().then(setPlan, () => {});
  }, []);
  useFocusEffect(refresh);
  // And on every sync and return to the foreground, like Home and Apps: the store's answer
  // lands after the foreground read, and a lapse found then stands everything down.
  useEffect(() => onLockChange(refresh), [refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  // Setting up a code is refused from bed (scan.ts): then the morning scan if there's a code,
  // or the ways out that work without one.
  const cantWalk = () => {
    const { phase } = readLock();
    if (phase !== 'night' && phase !== 'morning') return router.push({ pathname: '/scan', params: { mode: 'setup' } });
    router.push(getScanCode() ? '/scan?mode=morning' : '/exits');
  };
  // Apple's sheet (cancel, or switch plans in the group); its web page where there's no sheet.
  const manage = () => {
    const page = () => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
    manageSubscriptions()
      .then((shown) => (shown ? null : page()))
      .catch(page)
      .finally(() => currentPlan().then(setPlan, () => {}));
  };
  const [restoring, setRestoring] = useState(false);
  const restorePurchases = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const { entitled } = await restore();
      if (entitled) {
        currentPlan().then(setPlan, () => {});
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

  // Access being on isn't the same as apps sleeping: a lapsed subscription or a night that
  // never got scheduled says so here, like Home and Apps do.
  const s =
    status === 'on' && isStoodDown()
      ? { ...STATUS.on, line: 'Screen Time access is on, but there’s no subscription, so nothing sleeps.' }
      : // A lapse found mid-night or mid-morning: that one finishes, nothing after it.
        status === 'on' && subscriptionEnded()
        ? { ...STATUS.on, line: lapseLine(lapseStillCovers() ?? (readLock().phase === 'day' ? 'day' : null)) }
      : // Every night off, counting an edit waiting to turn one back on (`nextNightOn` follows it).
        status === 'on' && nextNightOn(new Date()) === null
        ? { ...STATUS.on, line: 'Screen Time access is on. Every night is switched off in Routine.' }
        : status === 'on' && !getArmedNight()
          ? { ...STATUS.on, line: 'Screen Time access is on, but bedtime isn’t scheduled yet.' }
        : // An emptied bedtime list (as it stands at the next bedtime): nothing sleeps then.
          status === 'on' && !bedtimeAppsAhead()
          ? {
              ...STATUS.on,
              line: `Screen Time access is on, but no bedtime apps are picked, so nothing sleeps at bedtime.${selectionSize('always') > 0 ? ' Always-asleep apps still sleep.' : ''}`,
            }
        : STATUS[status];
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
    >
      {/* Long press for beta diagnostics: what iOS ran overnight, to paste into a bug report. */}
      <Pressable onLongPress={() => router.push('/diagnostics')} delayLongPress={800} style={styles.titleWrap}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
          You
        </Text>
      </Pressable>

      <Card icon={sym(s.icon, s.android)} title="Screen Time" warn={status === 'off' || status === 'notSetUp'}>
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Text style={styles.statusText}>{noOrphan(s.line)}</Text>
          {status === 'off' ? <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} /> : null}
        </View>
      </Card>

      <Card
        icon={sym('door.left.hand.open', 'door_open')}
        title="Ways out"
        footer={`Passes refill on ${refillDate(new Date())}. For sick days, travel, or a baby asleep in the room.`}
      >
        <ValueRow title="Passes" value={`${passesLeft} left`} onPress={() => router.push('/exits')} />
        <ValueRow title="Emergency unlock" value="" onPress={() => router.push('/exits')} />
        <ValueRow title="Can’t walk or use stairs" value="" onPress={cantWalk} last />
      </Card>

      <Card
        icon={sym('theatermasks.fill', 'theater_comedy')}
        title="How grumpy Loc is"
        footer="How he talks on the block screen and in notifications. It changes his words, never the rules, so it applies straight away."
      >
        <TonePicker value={tone} onChange={changeTone} />
      </Card>

      <Card
        icon={sym('bell.fill', 'notifications')}
        title="Notifications"
        footer={
          permission === 'denied'
            ? 'Notifications are off for Locturne in Settings, so these stay quiet until you turn them on there.'
            : 'He keeps it short. No streaks, no guilt.'
        }
      >
        <SwitchRow title="Bedtime heads-up" value={alerts.bedtime} onChange={toggle('bedtime')} />
        <SwitchRow title="Morning nudge" value={alerts.morning} onChange={toggle('morning')} last={!inTrial} />
        {inTrial ? <SwitchRow title="Trial reminder" value={alerts.trial} onChange={toggle('trial')} last /> : null}
      </Card>

      <Card icon={sym('creditcard.fill', 'credit_card')} title="Subscription">
        {plan === null ? (
          // Left at the paywall, or the subscription ended: the plans, with the saved setup.
          <ValueRow title="Subscribe" value="" onPress={() => router.push('/onboarding?resume=paywall')} />
        ) : (
          <ValueRow title="Manage subscription" value={plan ? PLAN_LABEL[plan] : ''} onPress={manage} />
        )}
        <ValueRow title="Restore purchases" value={restoring ? 'Checking…' : ''} onPress={restorePurchases} last />
      </Card>

      <Card icon={sym('questionmark.circle.fill', 'help')} title="Help">
        <ValueRow title="Help" value="" onPress={() => open(LEGAL_URLS.support)} />
        <ValueRow title="Send feedback" value="" onPress={sendFeedback} />
        <ValueRow title="Rate Locturne" value="" onPress={rate} />
        <ValueRow title="Privacy Policy" value="" onPress={() => open(LEGAL_URLS.privacy)} />
        <ValueRow title="Terms of Use" value="" onPress={() => open(LEGAL_URLS.terms)} last />
      </Card>

      {__DEV__ ? (
        <Card icon={sym('hammer.fill', 'build')} title="Developer">
          <ValueRow title="Screen Time lab" value="" onPress={() => router.push('/screen-time-lab')} last />
        </Card>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3 },
  // Only as wide as the word, so a long press elsewhere up top does nothing.
  titleWrap: { alignSelf: 'flex-start', marginBottom: Gap.block },

  // Lined up with the card's header, like the rows under it.
  status: { gap: Space.l, paddingHorizontal: Space.l, paddingTop: Space.xs, paddingBottom: Space.l },
  statusText: { color: Nocturne.text, ...Type.secondary },

});
