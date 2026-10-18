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

import { type MenuOption } from '@/components/control-types';
import { MenuRow, SwitchRow } from '@/components/controls';
import { Card, ControlRow, sym, ValueRow } from '@/components/grouped-list';
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
import { getMorningsWon } from '@/lib/morning-proof';
import { getTone, setTone, type Tone } from '@/lib/tone';
import { getPassesLeft, PASSES_PER_MONTH } from '@/lib/passes';
import { currentPlan, manageSubscriptions, restore, type PlanId } from '@/lib/purchases';
import type { WakeMethod } from '@/lib/routine';
import { APP_FONT, Gap, Nocturne, Space, Type } from '@/theme';

import { APP_STATES, pickAppState } from '@/features/dev/state-lab/app-states';
import { fakeTheMorning } from '@/features/dev/wake-lab/wake-preview';
import { applyRoutineEdit, getSetRoutine, refuseWhileAsleep } from '@/features/routine/apply-edit';

import { refusal, SIGN_OFF } from './fire-loc';
import { DEMO_LINE, LocCard } from './loc-card';
import { LocMindCard } from './loc-mind-card';
import { LocProfile } from './loc-profile';

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
    month: 'short',
    day: 'numeric',
  });
}

const open = (url: string) => Linking.openURL(url).catch(() => {});

/** Dev (You → UI): a morning screen with every sensor faked, at any hour. */
/** The UI section's Home looks, by app-state id. */
const LOOK_ICONS: Record<string, ReturnType<typeof sym>> = {
  'look-day': sym('sun.max.fill', 'light_mode'),
  'look-evening': sym('sunset.fill', 'wb_twilight'),
  'look-night': sym('moon.zzz.fill', 'bedtime'),
  'look-wake-soon': sym('sunrise.fill', 'wb_twilight'),
  'look-morning': sym('alarm.fill', 'alarm'),
  'look-done': sym('checkmark.circle.fill', 'check_circle'),
  'look-problem': sym('exclamationmark.circle.fill', 'error'),
  'look-plain': sym('moon.fill', 'dark_mode'),
};

function preview(href: Href, method?: WakeMethod) {
  fakeTheMorning(method);
  // Home is the tab next door: switch to it rather than stack a second Home.
  if (href === '/') router.navigate('/');
  else router.push(href);
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
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);

  const [alerts, setAlerts] = useState<NotificationPrefs>(getNotificationPrefs);
  const [tone, setToneShown] = useState<Tone>(getTone);
  // Bumped on a new tone, so Loc says its line up top.
  const [said, setSaid] = useState(0);
  // His words only, so it applies now: the shield's text and the planned notes follow at once.
  const changeTone = (next: Tone) => {
    setTone(next);
    setToneShown(next);
    setSaid((n) => n + 1);
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
  });
  const [{ inTrial, trialEnd, passesLeft, stepGoal, mornings }, setFacts] = useState(read);
  const setStepGoal = (goal: number) => {
    // Not from bed (apply-edit.ts): says so, and the target stays as it was.
    if (!refuseWhileAsleep()) applyRoutineEdit({ ...getSetRoutine(), stepGoal: goal });
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
  // Setting up a code is refused from bed (scan.ts), and a code never stands in for the morning's
  // own method: from bed, a pass is the way out.
  const cantWalk = () => {
    const { phase } = readLock();
    if (phase !== 'night' && phase !== 'morning') return router.push({ pathname: '/scan', params: { mode: 'setup' } });
    router.push('/exits');
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
      {/* No page title (user, 2026-10-10: "remove the you"). Loc as the profile picture and your
          mornings under him, like CapWords' profile (user reference, 2026-10-14). Long press the
          mornings for beta diagnostics: what iOS ran overnight, to paste into a bug report. */}
      <LocProfile line={DEMO_LINE[tone]} say={said} mornings={mornings} onLongPress={() => router.push('/diagnostics')} />
      <View style={styles.divider} />

      <Text style={styles.heading} accessibilityRole="header">
        Loc
      </Text>
      <LocCard tone={tone} onChange={changeTone} />
      <LocMindCard mornings={mornings} />

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
        <ValueRow icon={sym('ticket.fill', 'confirmation_number')} title="Passes" value={`${passesLeft} left`} onPress={() => router.push('/exits')} />
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
          permission === 'denied' ? 'Notifications are off for Locturne in Settings, so these stay quiet until you turn them on there.' : undefined
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
        <ValueRow icon={sym('hand.raised.fill', 'privacy_tip')} title="Privacy Policy" value="" onPress={() => open(LEGAL_URLS.privacy)} />
        <ValueRow icon={sym('doc.text.fill', 'description')} title="Terms of Use" value="" onPress={() => open(LEGAL_URLS.terms)} last />
      </Card>

      {__DEV__ ? (
        <>
          <Text style={styles.heading} accessibilityRole="header">
            UI
          </Text>
          {/* Home in each of its looks (`HomeLook`), from the app-states lab's Looks group. */}
          <Card footer="Home dressed as each state, with nothing real changed. On Home, ‹ › steps through every state. All of them: Developer → App states.">
            {APP_STATES.filter((s) => s.group === 'Looks').map((s, i, all) => (
              <ValueRow
                key={s.id}
                icon={LOOK_ICONS[s.id] ?? sym('house.fill', 'home')}
                title={s.label}
                value=""
                onPress={() => {
                  pickAppState(s.id);
                  router.push('/');
                }}
                last={i === all.length - 1}
              />
            ))}
          </Card>

          {/* Each morning screen on the phone at any hour, every sensor faked (features/dev/wake-lab/wake-preview.ts). */}
          <Card footer="The real screens with fake sensors and a fake morning. Nothing is recorded. More states: Developer → Wake preview.">
            <ValueRow icon={sym('house.fill', 'home')} title="Home, morning" value="" onPress={() => preview('/')} />
            <ValueRow icon={sym('figure.walk', 'directions_walk')} title="Walk steps (on Home)" value="" onPress={() => preview('/', 'steps')} />
            <ValueRow icon={sym('figure.stairs', 'stairs')} title="Go downstairs (on Home)" value="" onPress={() => preview('/', 'downstairs')} />
            <ValueRow
              icon={sym('figure.strengthtraining.functional', 'fitness_center')}
              title="Push-ups (on Home)"
              value=""
              onPress={() => preview('/', 'pushups')}
            />
            <ValueRow icon={sym('barcode.viewfinder', 'barcode_scanner')} title="Scan a code (on Home)" value="" onPress={() => preview('/', 'scan')} />
            <ValueRow icon={sym('mappin.and.ellipse', 'location_on')} title="Get to a place (on Home)" value="" onPress={() => preview('/', 'place')} />
            {/* The screen after a wake-up, moonrise and all, with made-up facts (app/morning-won.tsx). */}
            <ValueRow icon={sym('moon.stars.fill', 'bedtime')} title="Morning payoff" value="" onPress={() => router.push('/morning-won?demo=1')} last />
          </Card>

          <Text style={styles.heading} accessibilityRole="header">
            Developer
          </Text>
          <Card>
            <ValueRow icon={sym('hammer.fill', 'build')} title="Screen Time lab" value="" onPress={() => router.push('/screen-time-lab')} />
            {/* The whole cancel flow with a sample offer: nothing charged, cancelled or recorded. */}
            <ValueRow icon={sym('xmark.circle', 'cancel')} title="Cancel flow" value="" onPress={() => router.push('/cancel?preview=1')} last />
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
          {/* Every method's real morning screen at any hour, each fake and state picked by hand (features/dev/wake-lab). */}
          <Card>
            <ValueRow icon={sym('wand.and.stars', 'auto_fix_high')} title="Wake preview" value="" onPress={() => router.push('/wake-preview')} last />
          </Card>
          {/* Every state Home can be in, made up, with arrows on Home to step through them (features/dev/state-lab). */}
          <Card footer="Home in any state: night, morning, naps, pauses, trial, lapses, access off. Nothing real changes.">
            <ValueRow icon={sym('square.stack.3d.up.fill', 'layers')} title="App states" value="" onPress={() => router.push('/app-states')} last />
          </Card>
          {/* Every move Loc makes, frame by frame, his style and his model sheet (features/dev/loc-studio). */}
          <Card footer="Loc on the real rig: every move frame by frame, his style, his model sheet and his art.">
            <ValueRow icon={sym('pawprint.fill', 'pets')} title="Loc studio" value="" onPress={() => router.push('/loc-studio')} last />
          </Card>
          {/* The nav buttons bouncing as Loc burrows, tuned live over Home (features/dev/knock-lab). */}
          <Card footer="Sliders for how the nav buttons bounce when Loc burrows under them. Opens over Home.">
            <ValueRow icon={sym('circle.grid.cross.fill', 'sports_baseball')} title="Knock lab" value="" onPress={() => router.push('/knock-lab')} last />
          </Card>
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
