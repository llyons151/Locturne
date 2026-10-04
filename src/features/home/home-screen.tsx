import { Link, router, useFocusEffect } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { GlassCard } from '@/components/glass-card';
import { HOME_HEADER, HOME_RISE_MS, homeMoonDisc } from '@/components/night-sky';
import { useHealth } from '@/hooks/use-health';
import { getNightPause, pauseWording } from '@/lib/emergency';
import { firstLine, firstMoment, getFirstRunSeen, markFirstSeen, type FirstLine } from '@/lib/first-run';
import { tap } from '@/lib/haptics';
import { getTrialEnd } from '@/lib/notifications';
import { manageSubscriptions } from '@/lib/purchases';
import { nightAt, type Routine, type WakeMethod } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import { getArmedNight, isScreenTimeAvailable, isStoodDown, shownSelection } from '@/lib/screen-time';
import { clockLabel } from '@/lib/shield-copy';
import { noOrphan } from '@/lib/text';
import { trialNotice } from '@/lib/trial-notice';
import { DisplayFont, italicOverhang, Nocturne, Space, Type, VoiceSize } from '@/theme';

import { MoonLock } from './moon-lock';
import { useReviewPrompt } from './review-prompt';
import { useHomeState } from './use-home-state';

/**
 * Home is a status screen, not a dashboard (docs/HOME_SPEC.md): Loc's line, one line of
 * honest status, the one thing to do next, and the apps and schedule one tap from editing.
 *
 * The state is real (`useHomeState`): the lock's phase from `readLock`, this morning's
 * proof, and the routine. On his firsts (first night, first morning, first time up) his
 * script from `first-run.ts` takes the line. In development builds, tapping the state label
 * still cycles the looks for review.
 */
type HomeView = 'night' | 'morning' | 'day' | 'off' | 'paused' | 'unprotected';
const VIEWS: HomeView[] = ['night', 'morning', 'day', 'off', 'paused', 'unprotected'];

/** Loc's lines, from the VOICE.md line bank. */
const LINES: Record<Exclude<HomeView, 'unprotected'>, string> = {
  night: "Shh. I'm sleeping.\nSo are they.",
  // VOICE.md, "Morning, 0 steps". The live count and its lines live on the wake-up screen.
  morning: 'No.',
  day: "I'm awake. Technically.",
  off: "Night off. I'm sleeping anyway.",
  // VOICE.md, "Emergency unlock": tonight's lock is paused until the next bedtime.
  paused: "I'll allow it. This once. Maybe.",
};

const LABELS: Record<HomeView, string> = {
  night: 'Tonight',
  morning: 'This morning',
  day: 'Today',
  off: 'Night off',
  paused: 'Tonight',
  unprotected: 'Not protected',
};

/** The morning's one action, by method. All of them open the wake-up screen. */
const MORNING_ACTION: Record<WakeMethod, string> = {
  downstairs: 'Go downstairs',
  steps: 'Start walking',
  scan: 'Scan my code',
};

/** The lock closes once the moon has nearly settled. */
const LOCK_DELAY_MS = HOME_RISE_MS * 0.7;
/** The text arrives while the moon is still rising, so the screen never sits empty. */
const CONTENT_DELAY_MS = HOME_RISE_MS * 0.35;

/** iOS's dark-mode orange: a warning, not a brand colour. */
const WARNING = '#FF9F0A';

type Symbol = SymbolViewProps['name'];
const sym = (ios: string, android: string): Symbol =>
  ({ ios, android, web: android }) as Symbol;

export function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { lock, routine, proof } = useHomeState();

  // Honest status (health.ts): access off or never given replaces everything; a dropped
  // schedule or a missed night shows as a note under the status.
  const [health] = useHealth();
  const { protection } = health;
  const unprotected = protection === 'off' || protection === 'notSetUp';
  // An emergency unlock paused tonight: the windows still run, so the phase says night.
  const pause = lock.phase === 'night' ? getNightPause() : null;

  // The phase comes from the clock: after bedtime it says night even with nothing armed (never
  // bought, stood down, or arming failed). Nothing is asleep then, so don't say it is.
  const held = !isScreenTimeAvailable() || (getArmedNight() !== null && !isStoodDown());
  const phase = lock.phase === 'night' && !held ? 'day' : lock.phase;

  // Development only: tap the label to see each look without waiting for the clock.
  const [preview, setPreview] = useState<HomeView | null>(null);
  const actual: HomeView = unprotected ? 'unprotected' : pause ? 'paused' : phase;
  const view = preview ?? actual;

  // Bumped each time Home opens: replays the entrance in step with the moon rising. The
  // keys below also include the look, so a new phase (say, the morning unlocking) fades in.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));

  // His firsts: shown on the real state only, and remembered by the morning they belong to.
  // Not on a night that isn't held: "First night. Phone down." would be spent on nothing.
  const moment = unprotected || preview || pause || phase !== lock.phase ? null : firstMoment(lock, proof, getFirstRunSeen());
  useEffect(() => {
    if (moment) markFirstSeen(moment, lock.morningKey);
  }, [moment, lock.morningKey]);

  useReviewPrompt(lock, proof);

  const bedtime = clockLabel(routine.bedtime);
  const wake = clockLabel(routine.morningStart);
  // The method the morning will really ask for (`methodInUse`), as everywhere on Home.
  const first = moment ? firstLine(moment, { ...routine, method: methodInUse(routine.method) }) : null;

  const moon = homeMoonDisc(width, height, insets.top);
  const cycle = () => {
    tap();
    setPreview((p) => VIEWS[(VIEWS.indexOf(p ?? actual) + 1) % VIEWS.length]);
  };

  const apps = isScreenTimeAvailable() ? shownSelection('night').size : 0;
  // A scan morning with no code set up yet falls back to steps until there is one.
  const method = methodInUse(routine.method);
  const asleep = view === 'night' || view === 'morning';
  const line = view === 'unprotected' ? health.title : (first?.line ?? LINES[view]);
  // The paywall's "I remind you", kept even without notifications (B4). Re-read on each visit.
  const trial = preview ? null : trialNotice(getTrialEnd(), new Date());

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.2}>Locturne</Text>
        {__DEV__ ? (
          <Pressable
            onPress={cycle}
            hitSlop={8}
            style={styles.day}
            accessibilityRole="button"
            accessibilityLabel={`${LABELS[view]}. Preview the next home state.`}
          >
            <Text style={[styles.dayLabel, view === 'unprotected' && { color: WARNING }]}>{LABELS[view]}</Text>
            <SymbolView name={sym('chevron.down', 'expand_more')} size={13} weight="semibold" tintColor={Nocturne.text2} />
          </Pressable>
        ) : (
          <View style={styles.day}>
            <Text style={[styles.dayLabel, view === 'unprotected' && { color: WARNING }]}>{LABELS[view]}</Text>
          </View>
        )}
        <View style={styles.flex} />
        {/* No settings screen yet: this opens the onboarding preview, so it stays out of the
            App Store build (rerunning onboarding there would show a subscriber the paywall). */}
        {(__DEV__ || Platform.OS === 'web') && (
          <Link href="/onboarding" asChild>
            <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Preview onboarding">
              <SymbolView name={sym('gearshape', 'settings')} size={22} tintColor={Nocturne.text} />
            </Pressable>
          </Link>
        )}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: moon.cy + moon.r - insets.top - HOME_HEADER + Space.xxl, paddingBottom: tabInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={`top-${visit}-${view}`} entering={FadeIn.delay(CONTENT_DELAY_MS).duration(450)} style={styles.top}>
          <Text style={styles.voice} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {noOrphan(line)}
          </Text>
          <Status
            view={view}
            routine={{ ...routine, method }}
            nextChange={lock.nextChange}
            unheld={phase !== lock.phase}
            detail={health.detail}
            pausedUntil={pause}
            blockNowUntil={lock.blockNowUntil}
          />
          {first && view !== 'unprotected' ? <FirstNote first={first} /> : null}
          {health.level === 'attention' && view !== 'unprotected' && !preview ? (
            <HealthNote title={health.title} detail={health.detail} />
          ) : null}
          {trial ? (
            <>
              <TrialNote title={trial.title} detail={trial.detail} />
              <TextButton label="Manage subscription" onPress={manageTrial} />
            </>
          ) : null}
          {health.needsSubscription && !preview ? (
            <TextButton label="See plans" onPress={() => router.push('/onboarding?resume=paywall')} />
          ) : null}
        </Animated.View>

        <View style={styles.flex} />

        <Animated.View
          key={`bottom-${visit}-${view}`}
          entering={FadeIn.delay(CONTENT_DELAY_MS + 150).duration(450)}
          style={styles.bottom}
        >
          {view === 'morning' ? (
            <PrimaryButton
              label={MORNING_ACTION[method]}
              onPress={() => router.push({ pathname: '/wake', params: { method } })}
            />
          ) : null}
          {view === 'unprotected' ? (
            protection === 'notSetUp' ? (
              <PrimaryButton label="Set up Screen Time" onPress={() => router.push('/apps')} />
            ) : (
              <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
            )
          ) : null}

          <GlassCard>
            <Link href="/apps" asChild>
              <Row
                icon={asleep ? sym('moon.zzz.fill', 'bedtime') : sym('moon.fill', 'bedtime')}
                title="Apps"
                accessibilityLabel={
                  apps > 0
                    ? `${apps} ${apps === 1 ? 'app sleeps' : 'apps sleep'} at night. Edit which apps sleep.`
                    : 'No apps picked yet. Pick which apps sleep.'
                }
              >
                <Text style={styles.rowValue}>{apps > 0 ? `${apps} at night` : 'Pick apps'}</Text>
              </Row>
            </Link>
            <View style={styles.divider} />
            <Link href="/routine" asChild>
              <Row
                icon={sym('alarm.fill', 'alarm')}
                title="Schedule"
                accessibilityLabel={`Bedtime ${bedtime}, morning start ${wake}. Edit the schedule.`}
              >
                {/* Each time stays whole ("7 am", not "7" / "am"); a narrow phone wraps at the dash. */}
                <Text style={styles.rowValue}>
                  {bedtime.replace(/ /g, ' ')} – {wake.replace(/ /g, ' ')}
                </Text>
              </Row>
            </Link>
          </GlassCard>

          {/* The ways out stay quiet: findable, not tempting (HOME_SPEC, "Ways out"). */}
          {asleep ? (
            <View style={styles.exits}>
              <TextButton label="Use a pass" onPress={() => router.push('/exits')} />
              <TextButton label="Emergency unlock" onPress={() => router.push('/exits')} />
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** What the morning asks for, in one plain line. */
function morningTask(routine: Routine, wake: string) {
  if (routine.method === 'downstairs') return 'Go down one floor and your apps wake up. About 20 seconds.';
  if (routine.method === 'scan') return 'Scan your code in the other room and your apps wake up.';
  return `Walk ${routine.stepGoal} steps and your apps wake up. Steps since ${wake} count.`;
}

/** The one line of honest status under Loc. */
function Status({
  view,
  routine,
  nextChange,
  unheld,
  detail,
  pausedUntil,
  blockNowUntil,
}: {
  view: HomeView;
  routine: Routine;
  nextChange: Date;
  /** It's bedtime by the clock, but nothing was armed: the health note says why. */
  unheld: boolean;
  /** health.ts's plain explanation, shown as is when protection is off. */
  detail: string;
  pausedUntil: Date | null;
  /** A Block now running: during the day it's what's asleep, so it's what the status says. */
  blockNowUntil: Date | null;
}) {
  const bedtime = clockLabel(routine.bedtime);
  const wake = clockLabel(routine.morningStart);

  if (view === 'unprotected') {
    return (
      <View style={[styles.statusRow, styles.statusTop]}>
        <SymbolView name={sym('exclamationmark.triangle.fill', 'warning')} size={16} tintColor={WARNING} style={styles.warningIcon} />
        <Text style={[styles.status, styles.flex]}>{detail}</Text>
      </View>
    );
  }
  if (view === 'morning') {
    return (
      <View style={[styles.statusRow, styles.statusTop]}>
        <SymbolView name={sym('lock.fill', 'lock')} size={15} tintColor={Nocturne.text2} style={styles.warningIcon} />
        <Text style={[styles.status, styles.flex]}>{morningTask(routine, wake)}</Text>
      </View>
    );
  }
  if (view === 'night') {
    return (
      <View style={styles.statusRow} accessible accessibilityLabel={`Apps asleep until you're up, after ${wake}.`}>
        <MoonLock size={14} delay={LOCK_DELAY_MS} />
        <Text style={[styles.status, styles.flex]}>Apps asleep until you’re up, after {wake}</Text>
      </View>
    );
  }
  if (view === 'paused') {
    const words = pausedUntil ? pauseWording(pausedUntil) : null;
    const back = words ? words.resumes : null;
    const resumes = back ? clockLabel(back.getHours() * 60 + back.getMinutes()) : bedtime;
    const until = words?.weekday ? `${resumes} on ${words.weekday}` : resumes;
    return (
      <View style={[styles.statusRow, styles.statusTop]}>
        <SymbolView name={sym('lock.open.fill', 'lock_open')} size={15} tintColor={Nocturne.text2} style={styles.warningIcon} />
        <Text style={[styles.status, styles.flex]}>
          Emergency unlock: your bedtime apps are awake tonight and {words?.morning ?? 'tomorrow morning'}.{' '}
          {words && !words.resumes ? 'Every night is switched off, so they stay awake.' : `They sleep again at ${until}.`}
        </Text>
      </View>
    );
  }
  if (view === 'off') {
    return (
      <View style={styles.statusRow}>
        <SymbolView name={sym('moon', 'bedtime')} size={15} tintColor={Nocturne.text2} />
        <Text style={[styles.status, styles.flex]}>
          {isStoodDown() ? 'No lock tonight.' : 'No lock tonight. Always-asleep apps still sleep.'}
        </Text>
      </View>
    );
  }
  if (blockNowUntil) {
    const until = clockLabel(blockNowUntil.getHours() * 60 + blockNowUntil.getMinutes());
    return (
      <View style={styles.statusRow}>
        <SymbolView name={sym('moon.zzz.fill', 'bedtime')} size={15} tintColor={Nocturne.text2} />
        <Text style={[styles.status, styles.flex]}>Block now: apps asleep until {until}</Text>
      </View>
    );
  }
  if (unheld) {
    return (
      <View style={styles.statusRow}>
        <SymbolView name={sym('lock.open.fill', 'lock_open')} size={15} tintColor={Nocturne.text2} />
        <Text style={[styles.status, styles.flex]}>
          {isStoodDown() ? 'Apps awake. Nothing is asleep tonight.' : 'Bedtime apps awake tonight. Always-asleep apps still sleep.'}
        </Text>
      </View>
    );
  }
  // An edit waiting for bedtime governs tonight from its first night.
  const { routine: tonight, on: tonightOn } = nightAt(nextChange);
  return (
    <View style={styles.statusRow}>
      <SymbolView name={sym('lock.open.fill', 'lock_open')} size={15} tintColor={Nocturne.text2} />
      <Text style={[styles.status, styles.flex]}>
        {tonightOn ? `Apps awake until ${clockLabel(tonight.bedtime)}` : 'Apps awake. Tonight is off.'}
      </Text>
    </View>
  );
}

/** A night that didn't hold, or a schedule iOS dropped: plain words, not a scare. */
function HealthNote({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={[styles.statusRow, styles.statusTop]} accessible accessibilityLabel={`${title} ${detail}`}>
      <SymbolView name={sym('exclamationmark.triangle.fill', 'warning')} size={15} tintColor={WARNING} style={styles.warningIcon} />
      <Text style={[styles.statusSmall, styles.flex]}>
        <Text style={styles.noteTitle}>{title} </Text>
        {detail}
      </Text>
    </View>
  );
}

/** Apple's sheet (cancel, or switch plans); its web page where there's no sheet. Same as the You tab. */
function manageTrial() {
  const page = () => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
  manageSubscriptions()
    .then((shown) => (shown ? null : page()))
    .catch(page);
}

/** The trial's last days: plain, with the date, like the notification it backs up. */
function TrialNote({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={[styles.statusRow, styles.statusTop]} accessible accessibilityLabel={`${title} ${detail}`}>
      <SymbolView name={sym('calendar', 'event')} size={15} tintColor={Nocturne.text2} style={styles.warningIcon} />
      <Text style={[styles.statusSmall, styles.flex]}>
        <Text style={styles.noteTitle}>{title} </Text>
        {detail}
      </Text>
    </View>
  );
}

/** His first-time explanation: one plain sentence, quieter than the status. */
function FirstNote({ first }: { first: FirstLine }) {
  return (
    <Text style={styles.statusSmall} accessibilityLiveRegion="polite">
      {noOrphan(first.note)}
    </Text>
  );
}

/** An iOS grouped-list row. Link passes onPress through asChild. */
function Row({
  icon,
  title,
  children,
  onPress,
  accessibilityLabel,
}: {
  icon: Symbol;
  title: string;
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <SymbolView name={icon} size={18} tintColor={Nocturne.text2} />
      <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.flex} />
      {children}
      <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: HOME_HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    paddingHorizontal: Space.xl,
  },
  wordmark: { ...DisplayFont, color: Nocturne.text, fontSize: 26, lineHeight: 32 },
  day: { flexDirection: 'row', alignItems: 'center', gap: Space.xs, marginTop: 3 },
  dayLabel: { color: Nocturne.text2, fontSize: 17, fontWeight: '500' },
  scroll: { flexGrow: 1, paddingHorizontal: Space.xl },
  top: { gap: Space.l },
  voice: {
    ...DisplayFont,
    ...italicOverhang(VoiceSize.headline),
    color: Nocturne.text,
    fontSize: VoiceSize.headline,
    lineHeight: VoiceSize.headline * 1.08,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  statusTop: { alignItems: 'flex-start' },
  // Centres the icon on the first line of the body text.
  warningIcon: { marginTop: 4 },
  status: { ...Type.body, color: Nocturne.text2 },
  statusSmall: { ...Type.secondary, color: Nocturne.text3 },
  noteTitle: { color: Nocturne.text2, fontWeight: '600' },
  bottom: { gap: Space.l, paddingTop: Space.xxl, paddingBottom: Space.s },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    paddingHorizontal: Space.l,
  },
  rowPressed: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  // The title never gives way ("Sched…"): the value wraps instead.
  rowTitle: { color: Nocturne.text, fontSize: 17, fontWeight: '600', flexShrink: 0 },
  rowValue: { color: Nocturne.text2, fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.12)', marginLeft: Space.l + 18 + Space.m },
  exits: { flexDirection: 'row', justifyContent: 'center', gap: Space.xl },
});
