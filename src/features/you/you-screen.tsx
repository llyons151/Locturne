'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import Constants from 'expo-constants';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwitchRow } from '@/components/controls';
import { Card, ControlRow, sym, ValueRow } from '@/components/grouped-list';
import * as haptic from '@/lib/haptics';
import { armIfPaid } from '@/hooks/use-app-start';
import { useTopOnLeave } from '@/hooks/use-top-on-leave';
import { LEGAL_URLS, SUPPORT_EMAIL } from '@/lib/links';
import {
  getNotificationPrefs,
  getTrialEnd,
  setNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/notifications';
import { onLockChange, readLock } from '@/lib/lock-controller';
import { getMorningsWon } from '@/lib/morning-proof';
import { getPassesLeft, PASSES_PER_MONTH } from '@/lib/passes';
import { currentPlan, manageSubscriptions, restore, type PlanId } from '@/lib/purchases';
import { endTestLock, getTestLock, isScreenTimeAvailable, startTestLock } from '@/lib/screen-time';
import type { WakeMethod } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import { APP_FONT, Gap, Nocturne, Space, Type } from '@/theme';

import { RehearsalSection } from '@/features/dev/rehearsal/rehearsal-section';
import { useMoon } from '@/features/moons/moon-theme';
import { LAB_METHODS } from '@/features/dev/wake-lab/wake-lab';
import { fakeTheMorning } from '@/features/dev/wake-lab/wake-preview';

import { refusal, SIGN_OFF } from './fire-loc';
import { LocProfile } from './loc-profile';

/**
 * The You tab: everything that isn't tonight. Routine holds the schedule and the wake-up
 * method, Apps holds both lists, and Home says whether he's working, so this is where you
 * find your record, Loc, the ways out, the step target, notifications and the subscription.
 *
 * Round 2 (docs/SETTINGS_INSPIRATION.md, 2026-10-10): your record first, one big number like
 * Brink's profile; then the plan card (Jomo); then Loc; then titled groups of rows, the humane exits before account things. Help
 * is a quiet row now, and the page ends on a joke: "Fire Loc" (CARROT's Self-Destruct).
 *
 * Passes, the emergency unlock and the scan code open the exits and scan screens; the plan
 * and Restore are src/lib/purchases.ts; the notification switches are saved and redo the
 * plan in src/lib/notifications.ts. Beta diagnostics hide behind a long press on the You
 * title, so App Review never sees a "beta" row.
 */

const PLAN_LABEL: Record<PlanId, string> = { annual: 'Annual', monthly: 'Monthly' };

/** The 1st after the month of the morning `now` belongs to: passes count by mornings (passes.ts). */
function refillDate(now: Date) {
  const [year, month] = readLock(now).morningKey.split('-').map(Number);
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const open = (url: string) => Linking.openURL(url).catch(() => {});


function preview(href: Href, method?: WakeMethod) {
  fakeTheMorning(method);
  // Home is the tab next door: switch to it rather than stack a second Home.
  if (href === '/') router.navigate('/');
  else router.push(href);
}

const METHOD_ICONS: Record<WakeMethod, ReturnType<typeof sym>> = {
  steps: sym('figure.walk', 'directions_walk'),
  downstairs: sym('figure.stairs', 'stairs'),
  scan: sym('barcode.viewfinder', 'barcode_scanner'),
  place: sym('mappin.and.ellipse', 'location_on'),
  pushups: sym('figure.strengthtraining.functional', 'fitness_center'),
};

/**
 * Dev and preview builds: the bedtime apps really sleep, then Home's test morning for `method`
 * (user 2026-10-28: test it as it really appears, from Home's button); winning it wakes them
 * (`pretendWoke`).
 */
function testLock(method: WakeMethod) {
  if (!isScreenTimeAvailable()) return Alert.alert('iPhone only', 'The test lock needs Screen Time, so run it on the phone.');
  // Tests the real thing (user 2026-10-29): with no code or place set up, the test morning fell
  // back on a made-up one that can never be reached.
  if (methodInUse(method) !== method) {
    const scan = method === 'scan';
    return Alert.alert(
      scan ? 'No code yet' : 'No place yet',
      scan ? 'The test scans your real code, so set one up first.' : 'The test checks you in at your real place, so pick one first.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: scan ? 'Set up a code' : 'Pick a place', onPress: () => router.push(scan ? '/code' : '/place-pick') },
      ],
    );
  }
  if (!startTestLock(method)) {
    return Alert.alert('Nothing to lock', 'Allow Screen Time and pick some bedtime apps in Apps first. The test locks those.');
  }
  haptic.done();
  preview('/', method);
}

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
  const moon = useMoon();
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);

  const [alerts, setAlerts] = useState<NotificationPrefs>(getNotificationPrefs);
  const toggle = (key: keyof NotificationPrefs) => (on: boolean) => {
    const next = { ...alerts, [key]: on };
    setAlerts(next);
    setNotificationPrefs(next).catch(() => {});
  };
  // Read again whenever the tab comes back into view: a pass spent on the exits screen or a
  // trial that ended since must show here.
  const read = () => ({
    // Only someone in a trial has a reminder to switch off.
    inTrial: (getTrialEnd()?.getTime() ?? 0) > Date.now(),
    trialEnd: getTrialEnd(),
    passesLeft: getPassesLeft(),
    mornings: getMorningsWon(),
    // A test lock left on (dev and preview builds): the way back to it.
    testRun: getTestLock(),
  });
  const [{ inTrial, trialEnd, passesLeft, mornings, testRun }, setFacts] = useState(read);

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
      {/* No page title (user, 2026-10-10: "remove the you"). Loc as the profile picture and your
          mornings under him, like CapWords' profile (user reference, 2026-10-14). Long press the
          mornings for beta diagnostics: what iOS ran overnight, to paste into a bug report. */}
      <LocProfile mornings={mornings} onLongPress={() => router.push('/diagnostics')} />
      <View style={styles.divider} />

      {/* Brink's profile (user reference, 2026-10-14): the plan's name and state, then what you can do about it. */}
      <Text style={styles.heading} accessibilityRole="header">
        Subscription
      </Text>
      <Card
        footer={
          inTrial && trialEnd ? `Your trial ends on ${trialDate(trialEnd)}.` : plan === null ? 'Nothing sleeps without one.' : undefined
        }
      >
        <ControlRow icon={sym('moon.stars.fill', 'bedtime')} title="Locturne">
          <Text style={styles.planValue}>
            {plan === null ? 'None' : plan ? `${PLAN_LABEL[plan]}${inTrial ? ' trial' : ''}` : ' '}
          </Text>
        </ControlRow>
        {plan === null ? (
          <ValueRow icon={sym('sparkles', 'auto_awesome')} title="Subscribe" value="" onPress={() => router.push('/onboarding?resume=paywall')} />
        ) : (
          <>
            <ValueRow icon={sym('gearshape', 'settings')} title="Manage subscription" value="" onPress={manage} />
            {/* The cancel flow on the way to Apple's sheet (features/cancel). Manage stays direct, for switching plans. */}
            <ValueRow icon={sym('xmark.circle', 'cancel')} title="Cancel subscription" value="" onPress={() => router.push('/cancel')} />
          </>
        )}
        <ValueRow icon={sym('arrow.clockwise', 'restore')} title="Restore purchases" value={restoring ? 'Checking…' : ''} onPress={restorePurchases} last />
      </Card>

      <Text style={styles.heading} accessibilityRole="header">
        Ways out
      </Text>
      <Card footer={`${PASSES_PER_MONTH} a month, for sick days, travel and emergencies. The only way out early. Refills ${refillDate(new Date())}.`}>
        <ValueRow icon={sym('ticket.fill', 'confirmation_number')} title="Passes" value={`${passesLeft} left`} onPress={() => router.push('/exits')} last />
      </Card>

      <Text style={styles.heading} accessibilityRole="header">
        Notifications
      </Text>
      <Card>
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
        <ValueRow icon={sym('hand.raised.fill', 'privacy_tip')} title="Privacy Policy" value="" onPress={() => open(LEGAL_URLS.privacy)} />
        <ValueRow icon={sym('doc.text.fill', 'description')} title="Terms of Use" value="" onPress={() => open(LEGAL_URLS.terms)} last />
      </Card>

      {/* Dev and preview builds only: wear any moon, all unlocked, to test them (features/moons). */}
      {__DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1' ? (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            Moon
          </Text>
          <Card footer="Every moon, unlocked for testing: your ladder from the moon lab, then all the others.">
            <ValueRow icon={sym('moon.circle.fill', 'dark_mode')} title="Moon" value={moon.name} onPress={() => router.push('/moons' as Href)} last />
          </Card>
        </>
      ) : null}

      {/* Dev and preview builds only: the whole onboarding again from the first screen. */}
      {__DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1' ? (
        <Card footer="The whole onboarding again from the start. Finishing it saves its answers as your routine.">
          <ValueRow icon={sym('arrow.counterclockwise', 'replay')} title="Redo onboarding" value="" onPress={() => router.push('/onboarding?paywall=1')} last />
        </Card>
      ) : null}

      {/* Dev and preview builds only: a real lock on the bedtime apps, woken by one method (wake-lab.tsx). */}
      {__DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1' ? (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            Morning unlocks
          </Text>
          {testRun ? (
            <Card footer="A test lock is still on. Your bedtime apps stay asleep until its test morning on Home is won, or it's ended here.">
              <ValueRow
                icon={sym('lock.fill', 'lock')}
                title="Back to the test morning"
                value=""
                onPress={() => preview('/', testRun.method as WakeMethod)}
              />
              <ValueRow
                icon={sym('lock.open.fill', 'lock_open')}
                title="End the test lock"
                value=""
                onPress={() => {
                  haptic.tap();
                  endTestLock();
                  setFacts(read());
                }}
                last
              />
            </Card>
          ) : (
            <Card footer="Your bedtime apps sleep right away, for real. Home opens a test morning for the method: win it to wake them. Nothing is recorded and your routine doesn't change.">
              {LAB_METHODS.map((m, i) => (
                <ValueRow
                  key={m.value}
                  icon={METHOD_ICONS[m.value]}
                  title={m.title}
                  value=""
                  onPress={() => testLock(m.value)}
                  last={i === LAB_METHODS.length - 1}
                />
              ))}
            </Card>
          )}
        </>
      ) : null}

      {/* Dev and preview builds only: a real night of minutes from iOS, run with Locturne closed (features/dev/rehearsal). */}
      {__DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1' ? <RehearsalSection headingStyle={styles.heading} icons={METHOD_ICONS} /> : null}

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

  planValue: { color: Nocturne.text2, fontSize: 17 },
  pressed: { opacity: 0.7 },

  // A short hairline between the profile and the settings, as in CapWords, the same space
  // either side of it (the heading under it brings its own Space.s).
  divider: {
    alignSelf: 'center',
    width: '60%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: Nocturne.edge,
    marginTop: Space.xl,
    marginBottom: Space.xl - Space.s,
  },

  // The last thing on the page, as far from the panel's bottom edge as from its sides.
  fire: { marginBottom: 0 },
  fireRow: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  fireText: { color: '#FF453A', fontSize: 17 },
  // The version and his line, a section's gap either side (cards keep Space.l under them), then Fire Loc last.
  signOff: { color: Nocturne.text3, ...Type.caption, textAlign: 'center', marginTop: Gap.section - Space.l, marginBottom: Gap.section },

  // Group headings outside the cards in grey, as in Brink's profile (user reference, 2026-10-14),
  // lined up with the rows' icons.
  heading: {
    ...APP_FONT,
    color: Nocturne.text2,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
    marginLeft: Space.l,
    marginTop: Space.s,
    marginBottom: Space.s,
  },
});
