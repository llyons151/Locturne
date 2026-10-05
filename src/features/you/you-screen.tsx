'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { PrimaryButton } from '@/components/buttons';
import { SwitchRow } from '@/components/controls';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { armIfPaid } from '@/hooks/use-app-start';
import { useProtection } from '@/hooks/use-protection';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/lib/links';
import {
  getNotificationPermission,
  getNotificationPrefs,
  getTrialEnd,
  setNotificationPrefs,
  type NotificationPermission,
  type NotificationPrefs,
} from '@/lib/notifications';
import { lapseStillCovers, onLockChange, readLock, subscriptionEnded } from '@/lib/lock-controller';
import { getPassesLeft } from '@/lib/passes';
import { getRoutine } from '@/lib/routine';
import { currentPlan, manageSubscriptions, restore, type PlanId } from '@/lib/purchases';
import { getScanCode } from '@/lib/scan';
import { getArmedNight, isStoodDown, type Protection } from '@/lib/screen-time';
import { noOrphan } from '@/lib/text';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type } from '@/theme';

import { lapseLine } from './lapse-line';

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
 * plan in src/lib/notifications.ts. Beta diagnostics hide behind a long press on the version
 * line, so App Review never sees a "beta" row.
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
  return new Date(year, month, 1).toLocaleDateString(undefined, {
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
      : status === 'on' && getRoutine().activeNights.length === 0
        ? { ...STATUS.on, line: 'Screen Time access is on. Every night is switched off in Routine.' }
        : status === 'on' && !getArmedNight()
          ? { ...STATUS.on, line: 'Screen Time access is on, but bedtime isn’t scheduled yet.' }
        : STATUS[status];
  const version = Constants.expoConfig?.version;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
    >
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
        You
      </Text>

      <View style={[styles.status, (status === 'off' || status === 'notSetUp') && styles.statusOff]} accessibilityLiveRegion="polite">
        <View style={styles.statusRow}>
          <SymbolView name={sym(s.icon, s.android)} size={18} tintColor={Nocturne.text} style={styles.statusIcon} />
          <Text style={styles.statusText}>{noOrphan(s.line)}</Text>
        </View>
        {status === 'off' ? <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} /> : null}
      </View>

      <Section label="Ways out" footer={`Passes refill on ${refillDate(new Date())}. For sick days, travel, or a baby asleep in the room.`}>
        <ValueRow
          icon={sym('ticket.fill', 'confirmation_number')}
          title="Passes"
          value={`${passesLeft} left`}
          onPress={() => router.push('/exits')}
        />
        <ValueRow icon={sym('lock.open.fill', 'lock_open')} title="Emergency unlock" value="" onPress={() => router.push('/exits')} />
        <ValueRow
          icon={sym('figure.roll', 'accessible')}
          title="Can’t walk or use stairs"
          value=""
          onPress={cantWalk}
          last
        />
      </Section>

      <Section
        label="Notifications"
        footer={
          permission === 'denied'
            ? 'Notifications are off for Locturne in Settings, so these stay quiet until you turn them on there.'
            : 'He keeps it short. No streaks, no guilt.'
        }
      >
        <SwitchRow icon={sym('moon.fill', 'bedtime')} title="Bedtime heads-up" value={alerts.bedtime} onChange={toggle('bedtime')} />
        <SwitchRow
          icon={sym('sunrise.fill', 'wb_twilight')}
          title="Morning nudge"
          value={alerts.morning}
          onChange={toggle('morning')}
          last={!inTrial}
        />
        {inTrial ? (
          <SwitchRow icon={sym('calendar', 'calendar_month')} title="Trial reminder" value={alerts.trial} onChange={toggle('trial')} last />
        ) : null}
      </Section>

      <Section label="Subscription">
        {plan === null ? (
          // Left at the paywall, or the subscription ended: the plans, with the saved setup.
          <ValueRow
            icon={sym('creditcard.fill', 'credit_card')}
            title="Subscribe"
            value=""
            onPress={() => router.push('/onboarding?resume=paywall')}
          />
        ) : (
          <ValueRow
            icon={sym('creditcard.fill', 'credit_card')}
            title="Manage subscription"
            value={plan ? PLAN_LABEL[plan] : ''}
            onPress={manage}
          />
        )}
        <ValueRow
          icon={sym('arrow.clockwise', 'refresh')}
          title="Restore purchases"
          value={restoring ? 'Checking…' : ''}
          onPress={restorePurchases}
          last
        />
      </Section>

      <Section label="Help">
        <ValueRow icon={sym('questionmark.circle.fill', 'help')} title="Help" value="" onPress={() => open(LEGAL_URLS.support)} />
        <ValueRow icon={sym('envelope.fill', 'mail')} title="Send feedback" value="" onPress={sendFeedback} />
        <ValueRow icon={sym('star.fill', 'star')} title="Rate Locturne" value="" onPress={rate} />
        <ValueRow icon={sym('hand.raised.fill', 'privacy_tip')} title="Privacy Policy" value="" onPress={() => open(LEGAL_URLS.privacy)} />
        <ValueRow icon={sym('doc.text.fill', 'description')} title="Terms of Use" value="" onPress={() => open(LEGAL_URLS.terms)} last />
      </Section>

      {__DEV__ ? (
        <Section label="Developer">
          <ValueRow
            icon={sym('hammer.fill', 'build')}
            title="Screen Time lab"
            value=""
            onPress={() => router.push('/screen-time-lab')}
            last
          />
        </Section>
      ) : null}

      {/* Long press for beta diagnostics: what iOS ran overnight, to paste into a bug report. */}
      <Pressable onLongPress={() => router.push('/diagnostics')} delayLongPress={800} accessibilityRole="text">
        <Text style={styles.footer}>Locturne{version ? ` ${version}` : ''}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3, marginBottom: Gap.block },

  status: {
    gap: Space.l,
    padding: Space.l,
    marginBottom: Gap.section,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.raised,
    borderWidth: 1,
    borderColor: Nocturne.edge,
  },
  statusOff: { borderColor: Nocturne.text2 },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.m },
  // Centres the icon on the first line of text.
  statusIcon: { marginTop: 2 },
  statusText: { flex: 1, color: Nocturne.text, ...Type.secondary },

  footer: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },
});
