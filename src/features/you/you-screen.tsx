'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import Constants from 'expo-constants';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActionSheetIOS, Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwitchRow } from '@/components/controls';
import { ControlRow, sym, ValueRow } from '@/components/grouped-list';
import * as haptic from '@/lib/haptics';
import { armIfPaid } from '@/hooks/use-app-start';
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
import { DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { RehearsalSection } from '@/features/dev/rehearsal/rehearsal-section';
import { devEarnAll, devEarnNext, devForgetMoons, getMoonsAsPage, getOwned, openMoons, setMoonsAsPage, settleMoons } from '@/features/moons/moon-collection';
import { LADDER } from '@/features/moons/moon-data';
import { LADDER_MORNINGS, RARE_MOONS } from '@/features/moons/moon-ladder';
import { useMoon } from '@/features/moons/moon-theme';
import { LAB_METHODS } from '@/features/dev/wake-lab/wake-lab';
import { fakeTheMorning } from '@/features/dev/wake-lab/wake-preview';

import { refusal, SIGN_OFF } from './fire-loc';
import { LocProfile } from './loc-profile';

/**
 * Settings (the You button, grown out of the tab strip, app/settings.tsx): everything that isn't tonight. Routine holds the schedule and the wake-up
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

/** The ladder's moons with a count (nine by mornings, then the Eclipse): the secret isn't counted. */
const COUNTED_MOONS = LADDER.slice(0, LADDER_MORNINGS.length + 1).filter(Boolean).length;

/** Moons of the ladder you own, after earning any due. */
function moonCount() {
  settleMoons();
  const owned = getOwned();
  return LADDER.slice(0, LADDER_MORNINGS.length + 1).filter((id) => id && owned[id]).length;
}

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


/**
 * Dev: unlock a moon and play the payoff for it, as a morning that earned it would. The next moon
 * on the ladder, really earned; with the ladder done, the rare one (its tap-to-see surprise). Home
 * first, so Done lands where the real payoff's does.
 */
function simulateMoonUnlock() {
  const id = devEarnNext() ?? RARE_MOONS[0];
  const rung = LADDER.indexOf(id);
  const mornings = rung >= 0 && rung < LADDER_MORNINGS.length ? LADDER_MORNINGS[rung] : getMorningsWon() + 1;
  router.navigate('/');
  setTimeout(
    () => router.push({ pathname: '/morning-won', params: { demo: '1', newMoon: id, mornings: String(mornings), method: 'steps' } }),
    SIMULATE_OVER_HOME_MS,
  );
}

/** Home's entrance settles before the payoff goes over it (as morning-won.tsx's cold open). */
const SIMULATE_OVER_HOME_MS = 1200;

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

/** Settings' background: pure black, like the strip it grows out of (user, 2026-11-02). */
export const SETTINGS_BG = '#000000';

export function YouScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const moon = useMoon();

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
    moons: moonCount(),
  });
  const [{ inTrial, trialEnd, passesLeft, mornings, testRun, moons }, setFacts] = useState(read);
  const [moonsAsPage, setAsPage] = useState(getMoonsAsPage);

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

  const devLabs = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';
  const planLine = inTrial && trialEnd ? `Your trial ends on ${trialDate(trialEnd)}.` : plan === null ? 'Nothing sleeps without one.' : undefined;

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl, paddingBottom: insets.bottom + Gap.section }]}
    >
      {/* One row, as on the moons page it shares the slide with: the way out (the page slid up, so
          it goes back down), the title, and nothing on the right. */}
      <View style={styles.head}>
        <View style={styles.side}>
          <Pressable
            onPress={() => {
              haptic.tap();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <SymbolView name={sym('chevron.down', 'expand_more')} size={13} weight="bold" tintColor={Nocturne.text2} />
          </Pressable>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
        <View style={styles.side} />
      </View>

      {/* Loc as the profile picture and your mornings under him, like CapWords' profile (user
          reference, 2026-10-14). Long press the mornings for beta diagnostics: what iOS ran
          overnight, to paste into a bug report. */}
      <LocProfile mornings={mornings} onLongPress={() => router.push('/diagnostics')} />

      {/* Flat rows on black, a hairline between groups, as in Brilliant's settings (user reference,
          2026-11-02): no cards and no headings. */}
      <Group first>
        <ValueRow iconTint={Nocturne.text} icon={sym('moon', 'dark_mode')} title="Moons" value={`${moons} of ${COUNTED_MOONS}`} onPress={openMoons} last />
      </Group>

      <Group note={planLine}>
        <ControlRow iconTint={Nocturne.text} icon={sym('moon.stars', 'bedtime')} title="Locturne" last>
          <Text style={styles.planValue}>
            {plan === null ? 'None' : plan ? `${PLAN_LABEL[plan]}${inTrial ? ' trial' : ''}` : ' '}
          </Text>
        </ControlRow>
        {plan === null ? (
          <ValueRow iconTint={Nocturne.text} icon={sym('sparkles', 'auto_awesome')} title="Subscribe" value="" onPress={() => router.push('/onboarding?resume=paywall')} last />
        ) : (
          <>
            <ValueRow iconTint={Nocturne.text} icon={sym('gearshape', 'settings')} title="Manage subscription" value="" onPress={manage} last />
            {/* The cancel flow on the way to Apple's sheet (features/cancel). Manage stays direct, for switching plans. */}
            <ValueRow iconTint={Nocturne.text} icon={sym('xmark.circle', 'cancel')} title="Cancel subscription" value="" onPress={() => router.push('/cancel')} last />
          </>
        )}
        <ValueRow iconTint={Nocturne.text} icon={sym('arrow.clockwise', 'restore')} title="Restore purchases" value={restoring ? 'Checking…' : ''} onPress={restorePurchases} last />
      </Group>

      <Group note={`${PASSES_PER_MONTH} a month, for sick days, travel and emergencies. The only way out early. Refills ${refillDate(new Date())}.`}>
        <ValueRow iconTint={Nocturne.text} icon={sym('ticket', 'confirmation_number')} title="Passes" value={`${passesLeft} left`} onPress={() => router.push('/exits')} last />
      </Group>

      <Group>
        <SwitchRow iconTint={Nocturne.text} icon={sym('bell', 'notifications')} title="Bedtime heads-up" value={alerts.bedtime} onChange={toggle('bedtime')} last />
        <SwitchRow iconTint={Nocturne.text} icon={sym('sunrise', 'wb_twilight')} title="Morning nudge" value={alerts.morning} onChange={toggle('morning')} last />
        {inTrial ? <SwitchRow iconTint={Nocturne.text} icon={sym('calendar', 'event')} title="Trial reminder" value={alerts.trial} onChange={toggle('trial')} last /> : null}
      </Group>

      <Group>
        <ValueRow iconTint={Nocturne.text} icon={sym('lifepreserver', 'support')} title="Help & feedback" value="" onPress={helpOrFeedback} last />
        <ValueRow iconTint={Nocturne.text} icon={sym('star', 'star')} title="Rate Locturne" value="" onPress={rate} last />
      </Group>

      {/* Dev and preview builds only: wear any moon, all unlocked, to test them (features/moons). */}
      {devLabs ? (
        <Group label="Moon" note="Wear any moon, unlocked or not. Unlock the next one and play the victory screen for it (the rare one once the ladder's done), earn the next one quietly, earn them all, or start over with none. The switch opens the collection as its own page instead of a sheet.">
          <ValueRow iconTint={Nocturne.text} icon={sym('moon.circle', 'dark_mode')} title="Moon" value={moon.name} onPress={() => router.push('/moons' as Href)} last />
          <SwitchRow
            iconTint={Nocturne.text} icon={sym('rectangle.portrait', 'crop_portrait')}
            title="Moons as a page"
            value={moonsAsPage}
            onChange={(on) => {
              setMoonsAsPage(on);
              setAsPage(on);
            }}
            last
          />
          <ValueRow
            iconTint={Nocturne.text} icon={sym('sunrise', 'wb_twilight')}
            title="Unlock a moon, with the payoff"
            value=""
            onPress={() => {
              haptic.done();
              simulateMoonUnlock();
              setFacts(read());
            }}
            last
          />
          <ValueRow
            iconTint={Nocturne.text} icon={sym('plus.circle', 'add_circle')}
            title="Earn the next moon"
            value=""
            onPress={() => {
              haptic.done();
              devEarnNext();
              setFacts(read());
            }}
            last
          />
          <ValueRow
            iconTint={Nocturne.text} icon={sym('sparkles', 'auto_awesome')}
            title="Earn every moon"
            value=""
            onPress={() => {
              haptic.done();
              devEarnAll();
              setFacts(read());
            }}
            last
          />
          <ValueRow
            iconTint={Nocturne.text} icon={sym('arrow.counterclockwise', 'replay')}
            title="Forget my moons"
            value=""
            onPress={() => {
              haptic.tap();
              devForgetMoons();
              setFacts(read());
            }}
            last
          />
        </Group>
      ) : null}

      {/* Dev and preview builds only: the whole onboarding again from the first screen. */}
      {devLabs ? (
        <Group note="The whole onboarding again from the start. Finishing it saves its answers as your routine.">
          <ValueRow iconTint={Nocturne.text} icon={sym('arrow.counterclockwise', 'replay')} title="Redo onboarding" value="" onPress={() => router.push('/onboarding?paywall=1')} last />
        </Group>
      ) : null}

      {/* Dev and preview builds only: a real lock on the bedtime apps, woken by one method (wake-lab.tsx). */}
      {devLabs ? (
        testRun ? (
          <Group label="Morning unlocks" note="A test lock is still on. Your bedtime apps stay asleep until its test morning on Home is won, or it's ended here.">
            <ValueRow iconTint={Nocturne.text} icon={sym('lock', 'lock')} title="Back to the test morning" value="" onPress={() => preview('/', testRun.method as WakeMethod)} last />
            <ValueRow
              iconTint={Nocturne.text} icon={sym('lock.open', 'lock_open')}
              title="End the test lock"
              value=""
              onPress={() => {
                haptic.tap();
                endTestLock();
                setFacts(read());
              }}
              last
            />
          </Group>
        ) : (
          <Group label="Morning unlocks" note="Your bedtime apps sleep right away, for real. Home opens a test morning for the method: win it to wake them. Nothing is recorded and your routine doesn't change.">
            {LAB_METHODS.map((m) => (
              <ValueRow key={m.value} iconTint={Nocturne.text} icon={METHOD_ICONS[m.value]} title={m.title} value="" onPress={() => testLock(m.value)} last />
            ))}
          </Group>
        )
      ) : null}

      {/* Dev and preview builds only: a real night of minutes from iOS, run with Locturne closed (features/dev/rehearsal). */}
      {devLabs ? (
        <>
          <View style={styles.divider} />
          <View style={styles.carded}>
            <RehearsalSection headingStyle={styles.devHeading} icons={METHOD_ICONS} />
          </View>
        </>
      ) : null}

      {/* The rows you rarely need, quieter: grey, no icons, as Brilliant's Log out and Legal. */}
      <Group>
        <QuietRow title="Privacy Policy" onPress={() => open(LEGAL_URLS.privacy)} />
        <QuietRow title="Terms of Use" onPress={() => open(LEGAL_URLS.terms)} />
      </Group>

      <Text style={styles.signOff}>
        Locturne {Constants.expoConfig?.version ?? ''}
        {'\n'}
        {SIGN_OFF}
      </Text>

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
    </ScrollView>
  );
}

/**
 * One group of rows, a hairline above it (but the first): an optional small grey label over it
 * (dev groups) and an optional grey note under it, lined up with the rows' titles.
 */
function Group({ first, label, note, children }: { first?: boolean; label?: string; note?: string; children: ReactNode }) {
  return (
    <>
      {first ? <View style={styles.firstGap} /> : <View style={styles.divider} />}
      {label ? (
        <Text style={styles.label} accessibilityRole="header">
          {label}
        </Text>
      ) : null}
      <View style={styles.group}>{children}</View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </>
  );
}

/** A row in grey with no icon, for what's rarely needed. */
function QuietRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="link"
      style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
    >
      <Text style={styles.quietText}>{title}</Text>
      <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
    </Pressable>
  );
}

/** The top bar's close button and its sides, as on the moons page (moon-collection-view.tsx). */
const CLOSE = 30;
const SIDE = 72;
/** Where a row's title starts: its inset, the icon and the gap after it (grouped-list.tsx). */
const TITLE_AT = Space.l + 22 + 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SETTINGS_BG },
  // The rows bring their own inset, so their icons sit on the usual gutter.
  content: { paddingHorizontal: Gap.gutter - Space.l },
  pressed: { opacity: 0.7 },

  head: { flexDirection: 'row', alignItems: 'center', minHeight: CLOSE, marginHorizontal: Space.l, marginBottom: Gap.block },
  close: {
    width: CLOSE,
    height: CLOSE,
    borderRadius: CLOSE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Nocturne.frost,
  },
  title: { ...DisplayFont, flex: 1, color: Nocturne.text, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  side: { width: SIDE },

  planValue: { color: Nocturne.text2, fontSize: 17 },

  // Rows with air between them instead of separators.
  group: { gap: Space.xs },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Nocturne.edge,
    marginHorizontal: Space.l,
    marginVertical: Space.l,
  },
  // Under Loc's mornings pill, before the first row.
  firstGap: { height: Space.xl },
  // The dev rehearsal keeps its cards (features/dev/rehearsal), on the usual gutter.
  carded: { marginHorizontal: Space.l },
  devHeading: { ...Type.caption, color: Nocturne.text3, marginLeft: Space.l, marginBottom: Space.s },
  label: { ...Type.caption, color: Nocturne.text3, marginLeft: Space.l, marginBottom: Space.s },
  note: { ...Type.caption, color: Nocturne.text3, marginLeft: TITLE_AT, marginRight: Space.l, marginTop: Space.xs },

  quiet: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.l },
  quietText: { flex: 1, color: Nocturne.text2, fontSize: 17 },

  // The version and his line, then Fire Loc last, in red with no card around it.
  signOff: { color: Nocturne.text3, ...Type.caption, textAlign: 'center', marginTop: Gap.section, marginBottom: Space.l },
  fireRow: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  fireText: { color: '#FF453A', fontSize: 17 },
});
