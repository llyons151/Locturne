import { Link, useFocusEffect } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { GlassCard } from '@/components/glass-card';
import { DisplayFont, italicOverhang, Nocturne } from '@/constants/nocturne';
import { MoonLock } from '@/features/home/moon-lock';
import { AppTile } from '@/features/onboarding/app-icons';
import { tap } from '@/features/onboarding/haptics';
import { HOME_HEADER, HOME_RISE_MS, homeMoonDisc } from '@/features/onboarding/night-sky';
import { noOrphan, Space, Type, VoiceSize } from '@/features/onboarding/tokens';
import { PrimaryButton, TextButton } from '@/features/onboarding/ui';

/**
 * Home is a status screen, not a dashboard (docs/HOME_SPEC.md): Loc's line, one line of
 * honest status, the one thing to do next, and the apps and schedule one tap from editing.
 *
 * Design preview: placeholder data, starting at night. Tapping the state label cycles
 * the states for review until real schedules exist.
 */
type HomeState = 'night' | 'morning' | 'day' | 'off';
const STATES: HomeState[] = ['night', 'morning', 'day', 'off'];

const PREVIEW = {
  bedtime: '11:00 PM',
  wake: '7:00 AM',
  goal: 200,
  steps: 84,
  apps: ['TikTok', 'Instagram', 'YouTube', 'X'],
  appCount: 7,
};

/** Loc's lines, from the VOICE.md line bank. */
const LINES: Record<HomeState, string> = {
  night: "Shh. I'm sleeping.\nSo are they.",
  morning: "I can hear you walking. I'm ignoring it.",
  day: "I'm awake. Technically.",
  // Serious: the problem first, stated plainly (VOICE.md, "Clear when it matters").
  off: 'Screen Time access is off.',
};

const LABELS: Record<HomeState, string> = {
  night: 'Tonight',
  morning: 'This morning',
  day: 'Today',
  off: 'Not protected',
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
  const [state, setState] = useState<HomeState>('night');

  // Bumped each time Home opens (or the preview state changes): replays the entrance
  // in step with the moon rising.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));

  const moon = homeMoonDisc(width, height, insets.top);
  const cycle = () => {
    tap();
    setState((s) => STATES[(STATES.indexOf(s) + 1) % STATES.length]);
    setVisit((v) => v + 1);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.2}>Locturne</Text>
        <Pressable
          onPress={cycle}
          hitSlop={8}
          style={styles.day}
          accessibilityRole="button"
          accessibilityLabel={`${LABELS[state]}. Preview the next home state.`}
        >
          <Text style={[styles.dayLabel, state === 'off' && { color: WARNING }]}>{LABELS[state]}</Text>
          <SymbolView name={sym('chevron.down', 'expand_more')} size={13} weight="semibold" tintColor={Nocturne.text2} />
        </Pressable>
        <View style={styles.flex} />
        {/* No settings screen yet: this opens the onboarding preview. */}
        <Link href="/onboarding" asChild>
          <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Preview onboarding">
            <SymbolView name={sym('gearshape', 'settings')} size={22} tintColor={Nocturne.text} />
          </Pressable>
        </Link>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: moon.cy + moon.r - insets.top - HOME_HEADER + Space.xxl, paddingBottom: tabInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={`top-${visit}`} entering={FadeIn.delay(CONTENT_DELAY_MS).duration(450)} style={styles.top}>
          <Text style={styles.voice} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {noOrphan(LINES[state])}
          </Text>
          <Status state={state} />
        </Animated.View>

        <View style={styles.flex} />

        <Animated.View
          key={`bottom-${visit}`}
          entering={FadeIn.delay(CONTENT_DELAY_MS + 150).duration(450)}
          style={styles.bottom}
        >
          {state === 'morning' ? <PrimaryButton label="Start walking" onPress={() => {}} /> : null}
          {state === 'off' ? <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} /> : null}

          <GlassCard>
            <Link href="/apps" asChild>
              <Row
                icon={state === 'night' || state === 'morning' ? sym('moon.zzz.fill', 'bedtime') : sym('moon.fill', 'bedtime')}
                title="Apps"
                accessibilityLabel={`${PREVIEW.appCount} apps. Edit which apps sleep.`}
              >
                <View style={styles.icons}>
                  {PREVIEW.apps.map((name) => (
                    <View key={name} style={state === 'night' || state === 'morning' ? styles.asleep : undefined}>
                      <AppTile name={name} size={24} />
                    </View>
                  ))}
                  <Text style={styles.rowValue}>+{PREVIEW.appCount - PREVIEW.apps.length}</Text>
                </View>
              </Row>
            </Link>
            <View style={styles.divider} />
            <Link href="/routine" asChild>
              <Row
                icon={sym('alarm.fill', 'alarm')}
                title="Schedule"
                accessibilityLabel={`Bedtime ${PREVIEW.bedtime}, wake-up ${PREVIEW.wake}. Edit the schedule.`}
              >
                <Text style={styles.rowValue}>
                  {PREVIEW.bedtime.replace(':00', '')} – {PREVIEW.wake.replace(':00', '')}
                </Text>
              </Row>
            </Link>
          </GlassCard>

          {/* Passes are required for v1 but stay quiet: findable, not tempting. No screen yet. */}
          {state === 'night' || state === 'morning' ? <TextButton label="Use a pass" onPress={() => tap()} /> : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** The one line of honest status under Loc. */
function Status({ state }: { state: HomeState }) {
  if (state === 'morning') {
    const left = PREVIEW.goal - PREVIEW.steps;
    return (
      <View
        style={styles.progress}
        accessible
        accessibilityLabel={`${PREVIEW.steps} of ${PREVIEW.goal} steps. ${left} more wakes your apps.`}
      >
        <Text style={styles.status}>
          <Text style={styles.steps}>{PREVIEW.steps}</Text> of {PREVIEW.goal} steps
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(PREVIEW.steps / PREVIEW.goal) * 100}%` }]} />
        </View>
        <Text style={styles.statusSmall}>{left} more and your apps wake up.</Text>
      </View>
    );
  }
  if (state === 'off') {
    return (
      <View style={[styles.statusRow, styles.statusTop]}>
        <SymbolView name={sym('exclamationmark.triangle.fill', 'warning')} size={16} tintColor={WARNING} style={styles.warningIcon} />
        <Text style={[styles.status, styles.flex]}>
          So I can&apos;t block anything. Turn it back on in Settings. Until then I&apos;m just a raccoon.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.statusRow}>
      {state === 'night' ? (
        <MoonLock size={14} delay={LOCK_DELAY_MS} />
      ) : (
        <SymbolView name={sym('lock.open.fill', 'lock_open')} size={15} tintColor={Nocturne.text2} />
      )}
      <Text style={styles.status}>
        {state === 'night' ? `Apps asleep until ${PREVIEW.wake}` : `Apps awake until ${PREVIEW.bedtime}`}
      </Text>
    </View>
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
  progress: { gap: Space.s },
  steps: { color: Nocturne.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.cta },
  bottom: { gap: Space.l, paddingTop: Space.xxl, paddingBottom: Space.s },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    paddingHorizontal: Space.l,
  },
  rowPressed: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  rowTitle: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  rowValue: { color: Nocturne.text2, fontSize: 15, fontWeight: '500', fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.12)', marginLeft: Space.l + 18 + Space.m },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // The apps are asleep: dimmed, not greyed out.
  asleep: { opacity: 0.45 },
});
