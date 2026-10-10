'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { type MenuOption } from '@/components/control-types';
import { MenuRow, SwitchRow } from '@/components/controls';
import { Card, sym, ValueRow } from '@/components/grouped-list';
import * as haptic from '@/lib/haptics';
import { armIfPaid } from '@/hooks/use-app-start';
import { useTopOnLeave } from '@/hooks/use-top-on-leave';
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
import { onLockChange, readLock, syncLock } from '@/lib/lock-controller';
import { getTone, setTone, TONE_LABEL, TONES, type Tone } from '@/lib/tone';
import { getPassesLeft } from '@/lib/passes';
import { currentPlan, manageSubscriptions, restore, type PlanId } from '@/lib/purchases';
import { getScanCode } from '@/lib/scan';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type } from '@/theme';

import { applyRoutineEdit, getSetRoutine } from '@/features/routine/apply-edit';

/**
 * The You tab: everything that isn't tonight. Routine holds the schedule and the wake-up
 * method, Apps holds both lists, and Home says whether he's working, so this is where you
 * find the ways out, set the step target once, and manage notifications and the subscription.
 *
 * Laid out like Jomo's Settings (user's reference, 2026-10-09): the plan card, a Help &
 * Feedback banner, then titled groups of rows, the humane exits before account things.
 * No stats or charts; history lives on the morning share card.
 *
 * Passes, the emergency unlock and the scan code open the exits and scan screens; the plan
 * and Restore are src/lib/purchases.ts; the notification switches are saved and redo the
 * plan in src/lib/notifications.ts. Beta diagnostics hide behind a long press on the You
 * title, so App Review never sees a "beta" row.
 */

const PLAN_LABEL: Record<PlanId, string> = { annual: 'Annual', monthly: 'Monthly' };

const TONE_OPTIONS: MenuOption<Tone>[] = TONES.map((t) => ({ value: t, label: TONE_LABEL[t] }));

const STEP_GOALS: MenuOption<number>[] = [100, 200, 300, 500].map((n) => ({ value: n, label: `${n} steps` }));

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

/** Help or feedback, picked from the system's action sheet (the web preview opens Help). */
function helpOrFeedback() {
  if (Platform.OS !== 'ios') return open(LEGAL_URLS.support);
  ActionSheetIOS.showActionSheetWithOptions(
    { options: ['Help', 'Send feedback', 'Cancel'], cancelButtonIndex: 2 },
    (i) => (i === 0 ? open(LEGAL_URLS.support) : i === 1 ? sendFeedback() : null),
  );
}

const trialDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);

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
    trialEnd: getTrialEnd(),
    passesLeft: getPassesLeft(),
    // As set, a waiting edit included: Routine's banner says when it starts.
    stepGoal: getSetRoutine().stepGoal,
  });
  const [{ inTrial, trialEnd, passesLeft, stepGoal }, setFacts] = useState(read);
  const setStepGoal = (goal: number) => {
    applyRoutineEdit({ ...getSetRoutine(), stepGoal: goal });
    setFacts(read());
  };

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

  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
    >
      {/* Long press for beta diagnostics: what iOS ran overnight, to paste into a bug report. */}
      <Pressable onLongPress={() => router.push('/diagnostics')} delayLongPress={800} style={styles.titleWrap}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
          You
        </Text>
      </Pressable>

      <Card>
        <View style={styles.plan}>
          <View style={styles.planText}>
            <Text style={styles.planLabel}>Current plan</Text>
            <Text style={styles.planName}>
              {plan === null ? 'None' : plan ? `${PLAN_LABEL[plan]}${inTrial ? ' (Trial)' : ''}` : ' '}
            </Text>
            {inTrial && trialEnd ? (
              <View style={styles.planNote}>
                <SymbolView name={sym('clock.fill', 'schedule')} size={12} tintColor={Nocturne.text2} />
                <Text style={styles.planNoteText}>Trial ends on {trialDate(trialEnd)}</Text>
              </View>
            ) : plan === null ? (
              <Text style={styles.planNoteText}>Nothing sleeps without one.</Text>
            ) : null}
          </View>
          {plan !== undefined ? (
            <Pressable
              onPress={() => {
                haptic.tap();
                if (plan === null) router.push('/onboarding?resume=paywall');
                else manage();
              }}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            >
              <Text style={styles.pillText}>{plan === null ? 'Subscribe' : 'Manage'}</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <Pressable
        onPress={() => {
          haptic.tap();
          helpOrFeedback();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      >
        <SymbolView name={sym('exclamationmark.bubble.fill', 'feedback')} size={22} tintColor={Nocturne.onCta} />
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Help & Feedback</Text>
          <Text style={styles.bannerLine}>Get help or tell me what’s broken.</Text>
        </View>
        <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.onCta} />
      </Pressable>

      <Text style={styles.heading} accessibilityRole="header">
        Ways out
      </Text>
      <Card footer={`Passes refill on ${refillDate(new Date())}. For sick days, travel, or a baby asleep in the room.`}>
        <ValueRow icon={sym('ticket.fill', 'confirmation_number')} title="Passes" value={`${passesLeft} left`} onPress={() => router.push('/exits')} />
        <ValueRow icon={sym('light.beacon.max.fill', 'emergency')} title="Emergency unlock" value="" onPress={() => router.push('/exits')} />
        <ValueRow icon={sym('figure.roll', 'accessible')} title="Can’t walk or use stairs" value="" onPress={cantWalk} last />
      </Card>

      <Text style={styles.heading} accessibilityRole="header">
        General
      </Text>
      <Card footer="Steps count for the walking wake-up and the fallback; a new target starts from the next bedtime. Loc’s tone changes his words, never the rules, so it applies now.">
        <MenuRow icon={sym('figure.walk', 'directions_walk')} title="Step target" value={stepGoal} options={STEP_GOALS} onChange={setStepGoal} />
        <MenuRow icon={sym('theatermasks.fill', 'theater_comedy')} title="How grumpy Loc is" value={tone} options={TONE_OPTIONS} onChange={changeTone} last />
      </Card>

      <Text style={styles.heading} accessibilityRole="header">
        Notifications
      </Text>
      <Card
        footer={
          permission === 'denied'
            ? 'Notifications are off for Locturne in Settings, so these stay quiet until you turn them on there.'
            : 'He keeps it short. No streaks, no guilt.'
        }
      >
        <SwitchRow icon={sym('moon.fill', 'bedtime')} title="Bedtime heads-up" value={alerts.bedtime} onChange={toggle('bedtime')} />
        <SwitchRow icon={sym('sunrise.fill', 'wb_twilight')} title="Morning nudge" value={alerts.morning} onChange={toggle('morning')} last={!inTrial} />
        {inTrial ? <SwitchRow icon={sym('calendar', 'event')} title="Trial reminder" value={alerts.trial} onChange={toggle('trial')} last /> : null}
      </Card>

      <Text style={styles.heading} accessibilityRole="header">
        About
      </Text>
      <Card>
        <ValueRow icon={sym('star.fill', 'star')} title="Rate Locturne" value="" onPress={rate} />
        <ValueRow icon={sym('arrow.clockwise', 'restore')} title="Restore purchases" value={restoring ? 'Checking…' : ''} onPress={restorePurchases} />
        <ValueRow icon={sym('hand.raised.fill', 'privacy_tip')} title="Privacy Policy" value="" onPress={() => open(LEGAL_URLS.privacy)} />
        <ValueRow icon={sym('doc.text.fill', 'description')} title="Terms of Use" value="" onPress={() => open(LEGAL_URLS.terms)} last />
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

  plan: { flexDirection: 'row', alignItems: 'center', gap: Space.m, padding: Space.l },
  planText: { flex: 1, gap: 2 },
  planLabel: { color: Nocturne.text2, ...Type.secondary },
  planName: { color: Nocturne.accent ?? Nocturne.text, fontSize: 22, fontWeight: '700' },
  planNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  planNoteText: { color: Nocturne.text2, ...Type.caption },
  pill: {
    paddingHorizontal: Space.l,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Nocturne.frost,
  },
  pillText: { color: Nocturne.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.7 },

  // The one filled card on the tab, as in the reference: help is always one tap away.
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    padding: Space.l,
    marginBottom: Gap.section,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.accent ?? Nocturne.cta,
  },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  bannerLine: { color: Nocturne.onCta, ...Type.secondary, opacity: 0.75 },

  // Title-case group headings outside the cards, like the reference's "General".
  heading: { color: Nocturne.text2, fontSize: 20, fontWeight: '700', marginLeft: Space.xs, marginTop: Space.s, marginBottom: Space.s },
});
