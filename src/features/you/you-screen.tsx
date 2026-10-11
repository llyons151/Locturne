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
import { getFirstMorning, getMorningsWon } from '@/lib/morning-proof';
import { getTone, setTone, type Tone } from '@/lib/tone';
import { getPassesLeft } from '@/lib/passes';
import { currentPlan, manageSubscriptions, restore, type PlanId } from '@/lib/purchases';
import { getScanCode } from '@/lib/scan';
import { APP_FONT, DISPLAY_MAX_SCALE, Gap, Nocturne, NUMBER_FONT, Radius, Space, Type } from '@/theme';

import { morningsLabel } from '@/features/home/week';
import { applyRoutineEdit, getSetRoutine } from '@/features/routine/apply-edit';

import { refusal, SIGN_OFF } from './fire-loc';
import { LocCard } from './loc-card';

// Dev only: loaded only in a dev build, so the push-up preview never ships (`__DEV__` is false
// in a release bundle, which drops the require).
const PushupsPreviewCard: () => React.JSX.Element | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('@/features/dev/wake-lab/pushups-preview-card') as typeof import('@/features/dev/wake-lab/pushups-preview-card')).PushupsPreviewCard
  : () => null;

/**
 * The You tab: everything that isn't tonight. Routine holds the schedule and the wake-up
 * method, Apps holds both lists, and Home says whether he's working, so this is where you
 * find your record, Loc, the ways out, the step target, notifications and the subscription.
 *
 * Round 2 (docs/SETTINGS_INSPIRATION.md, 2026-10-10): your record first, one big number like
 * Brink's profile; then the plan card (Jomo); then Loc, whose tone you set by hearing him
 * (CARROT Weather); then titled groups of rows, the humane exits before account things. Help
 * is a quiet row now, and the page ends on a joke: "Fire Loc" (CARROT's Self-Destruct).
 *
 * Passes, the emergency unlock and the scan code open the exits and scan screens; the plan
 * and Restore are src/lib/purchases.ts; the notification switches are saved and redo the
 * plan in src/lib/notifications.ts. Beta diagnostics hide behind a long press on the You
 * title, so App Review never sees a "beta" row.
 */

const PLAN_LABEL: Record<PlanId, string> = { annual: 'Annual', monthly: 'Monthly' };

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

/** "Sep 30", or "Sep 30, 2025" from another year, for a `morningKey`. */
function dayOf(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const sameYear = year === new Date().getFullYear();
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

/** Asks, then he refuses. Changes nothing (fire-loc.ts). */
function fireLoc() {
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
    mornings: getMorningsWon(),
    first: getFirstMorning(),
  });
  const [{ inTrial, trialEnd, passesLeft, stepGoal, mornings, first }, setFacts] = useState(read);
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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: Gap.gutter }]}
    >
      {/* No page title (user, 2026-10-10: "remove the you"); the record leads. Long press it for
          beta diagnostics: what iOS ran overnight, to paste into a bug report. */}
      <Pressable
        onLongPress={() => router.push('/diagnostics')}
        delayLongPress={800}
        style={styles.record}
        accessible
        accessibilityLabel={`${mornings} ${morningsLabel(mornings)} out of bed${first ? `, since ${dayOf(first)}` : ''}`}
      >
        <Text style={styles.recordNumber} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
          {mornings}
        </Text>
        <Text style={styles.recordLabel}>{morningsLabel(mornings)} out of bed</Text>
        <Text style={styles.recordSince}>{first ? `Since ${dayOf(first)}. Never resets.` : 'Your first one is the next morning.'}</Text>
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

      <Text style={styles.heading} accessibilityRole="header">
        Loc
      </Text>
      <LocCard tone={tone} onChange={changeTone} />

      <Text style={styles.heading} accessibilityRole="header">
        Ways out
      </Text>
      <Card footer={`For sick days and travel. Passes refill on ${refillDate(new Date())}.`}>
        <ValueRow icon={sym('ticket.fill', 'confirmation_number')} title="Passes" value={`${passesLeft} left`} onPress={() => router.push('/exits')} />
        <ValueRow icon={sym('light.beacon.max.fill', 'emergency')} title="Emergency unlock" value="" onPress={() => router.push('/exits')} />
        <ValueRow icon={sym('figure.roll', 'accessible')} title="Can’t walk or use stairs" value="" onPress={cantWalk} last />
      </Card>

      <Text style={styles.heading} accessibilityRole="header">
        Wake-up
      </Text>
      <Card footer="A new target starts from the next bedtime.">
        <MenuRow icon={sym('figure.walk', 'directions_walk')} title="Step target" value={stepGoal} options={STEP_GOALS} onChange={setStepGoal} last />
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
        <ValueRow icon={sym('questionmark.bubble.fill', 'help')} title="Help & feedback" value="" onPress={helpOrFeedback} />
        <ValueRow icon={sym('star.fill', 'star')} title="Rate Locturne" value="" onPress={rate} />
        <ValueRow icon={sym('arrow.clockwise', 'restore')} title="Restore purchases" value={restoring ? 'Checking…' : ''} onPress={restorePurchases} />
        <ValueRow icon={sym('hand.raised.fill', 'privacy_tip')} title="Privacy Policy" value="" onPress={() => open(LEGAL_URLS.privacy)} />
        <ValueRow icon={sym('doc.text.fill', 'description')} title="Terms of Use" value="" onPress={() => open(LEGAL_URLS.terms)} last />
      </Card>

      {__DEV__ ? (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            Developer
          </Text>
          <Card>
            <ValueRow icon={sym('hammer.fill', 'build')} title="Screen Time lab" value="" onPress={() => router.push('/screen-time-lab')} last />
          </Card>
          {/* Each wake-up method's real flow at any hour; a pass records nothing (features/dev/wake-lab). */}
          <Card>
            <ValueRow icon={sym('figure.walk', 'directions_walk')} title="Test walk steps" value="" onPress={() => router.push('/wake-lab?method=steps')} />
            <ValueRow icon={sym('figure.stairs', 'stairs')} title="Test go downstairs" value="" onPress={() => router.push('/wake-lab?method=downstairs')} />
            <ValueRow icon={sym('barcode.viewfinder', 'barcode_scanner')} title="Test scan a code" value="" onPress={() => router.push('/wake-lab?method=scan')} />
            <ValueRow icon={sym('mappin.and.ellipse', 'location_on')} title="Test get to a place" value="" onPress={() => router.push('/wake-lab?method=place')} />
            <ValueRow
              icon={sym('figure.strengthtraining.functional', 'fitness_center')}
              title="Test push-ups"
              value=""
              onPress={() => router.push('/wake-lab?method=pushups')}
              last
            />
          </Card>
          {/* Every state of the push-ups screen, with a pretend body, for the browser (features/dev/wake-lab). */}
          <PushupsPreviewCard />
        </>
      ) : null}

      <Text style={styles.signOff}>
        Locturne {Constants.expoConfig?.version ?? ''}
        {'\n'}
        {SIGN_OFF}
      </Text>

      <Card style={styles.fire}>
        <Pressable
          onPress={() => {
            haptic.tap();
            fireLoc();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.fireRow, pressed && styles.pressed]}
        >
          <Text style={styles.fireText}>Fire Loc</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  // Only as wide as the word, so a long press elsewhere up top does nothing.

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

  // Your record, centered under the title: the one big number on the tab.
  record: { alignItems: 'center', marginBottom: Gap.section },
  recordNumber: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 72, lineHeight: 78 },
  recordLabel: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  recordSince: { color: Nocturne.text2, ...Type.caption, marginTop: 4 },

  // The last thing on the page, as far from the panel's bottom edge as from its sides.
  fire: { marginBottom: 0 },
  fireRow: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  fireText: { color: '#FF453A', fontSize: 17 },
  // The version and his line, a section's gap either side (cards keep Space.l under them), then Fire Loc last.
  signOff: { color: Nocturne.text3, ...Type.caption, textAlign: 'center', marginTop: Gap.section - Space.l, marginBottom: Gap.section },

  // Group headings outside the cards, in the app's large light titles (Routine's title, Apps'
  // Bedtime | Limits; user, 2026-10-10), a size down since there are several on the page.
  heading: {
    ...APP_FONT,
    color: Nocturne.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '300',
    letterSpacing: -0.5,
    marginLeft: Space.xs,
    marginTop: Space.s,
    marginBottom: Space.s,
  },
});
