import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import LocStage from '../home/loc-stage';
import { dayLabel, weekDays } from '../home/week';
import { clockParts, payoffKicker, payoffLine, shareText } from './payoff';

/** Everything the payoff shows. The route reads it from the stores, or the wake preview makes it up. */
export type PayoffFacts = {
  method: WakeMethod;
  /** When the morning was proven, and the routine's morning start, in minutes since midnight. */
  upAt: number;
  start: number;
  /** Mornings got up ever, this one included. */
  mornings: number;
  /** This morning's key (`LockState.morningKey`) and the mornings got up this week. */
  today: string;
  won: Set<string>;
};

/** Loc's circle: bigger than the You tab's, the same frosted ring. */
const SIZE = 176;
const CANVAS = Math.round(SIZE * 1.2);
const LOC_H = SIZE - 8;

/** One step of the entrance: each piece comes in a beat after the one above it. */
const STEP_MS = 120;
const rise = (i: number) => FadeInDown.duration(420).delay(200 + i * STEP_MS);

/**
 * The morning payoff (docs/APP_RATING_2026-10-15.md, "Build the morning payoff"): the moment the
 * apps wake, made into one. Loc, smug and silent (no lines here: user, 2026-10-15); the time you got up is the big number; the
 * morning's count and this week's dots under it. Done goes back to Home. Monochrome, no glow.
 * Opened once per morning by Home (`usePayoff`), and from the wake preview with made-up facts.
 */
export function PayoffScreen({ facts }: { facts: PayoffFacts }) {
  const insets = useSafeAreaInsets();
  const { method, upAt, start, mornings, today, won } = facts;
  useEffect(() => haptic.done(), []);
  const days = weekDays(today, won);
  const week = days.filter((d) => d.done).length;
  const up = clockParts(upAt);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const share = () => {
    haptic.tap();
    Share.share({ message: shareText(mornings, upAt) }).catch(() => {});
  };
  const dom = useMemo(
    () => ({
      style: { width: CANVAS, height: LOC_H, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
    [],
  );

  return (
    <AppBackground>
      <View style={[styles.screen, { paddingTop: insets.top + Space.l, paddingBottom: insets.bottom + Space.l }]}>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.kicker}>
          {payoffKicker(mornings)}
        </Animated.Text>

        <View style={styles.middle}>
          <Animated.View entering={FadeIn.duration(500).delay(100)} style={styles.locWrap}>
            <View style={styles.avatar}>
              <View style={[styles.loc, { width: CANVAS, height: LOC_H }]}>
                <LocStage mood="smug" share={0.9} present dom={dom} />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={rise(1)} style={styles.time} accessible accessibilityRole="header" accessibilityLabel={`Up at ${up.value} ${up.unit}`}>
            <Text style={styles.timeKicker}>Up at</Text>
            <View style={styles.timeRow}>
              <Text style={styles.timeValue} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
                {up.value}
              </Text>
              <Text style={styles.timeUnit} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
                {up.unit}
              </Text>
            </View>
          </Animated.View>

          <Animated.Text entering={rise(2)} style={styles.line}>
            {payoffLine(method, upAt, start)}
          </Animated.Text>

          <Animated.View entering={rise(3)} style={styles.stats}>
            <Stat value={String(mornings)} label={mornings === 1 ? 'morning up' : 'mornings up'} icon={sym('sunrise.fill', 'wb_twilight')} />
            <View style={styles.statRule} />
            <Stat value={`${week}/7`} label="this week" icon={sym('calendar', 'calendar_today')} />
          </Animated.View>

          <Animated.View entering={rise(4)} style={styles.week}>
            {days.map((day) => (
              <View key={day.key} style={styles.day} accessible accessibilityLabel={dayLabel(day)}>
                <Text style={[styles.dayLetter, day.today && styles.dayLetterToday]}>{day.letter}</Text>
                <View style={[styles.dot, day.done && styles.dotDone, day.today && styles.dotToday, day.future && styles.dotFuture]}>
                  {day.done ? <SymbolView name={sym('checkmark', 'check')} size={12} weight="bold" tintColor={Nocturne.bg} /> : null}
                </View>
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.View entering={rise(5)} style={styles.actions}>
          <PrimaryButton label="Done" onPress={close} />
          <TextButton label="Share" onPress={share} />
        </Animated.View>
      </View>
    </AppBackground>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: ReturnType<typeof sym> }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <View style={styles.statTop}>
        <SymbolView name={icon} size={15} tintColor={Nocturne.text2} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const DOT = 28;

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Gap.gutter },
  kicker: { ...Type.label, textAlign: 'center' },
  middle: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Space.xl },
  locWrap: { alignItems: 'center' },
  // As on the You tab: a light ring round a frosted circle. No shadow, no glow.
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  loc: { marginBottom: -1, marginHorizontal: (SIZE - CANVAS) / 2 },
  time: { alignItems: 'center' },
  timeKicker: { ...Type.secondary, color: Nocturne.text2 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  timeValue: { ...NUMBER_FONT, fontSize: 64, lineHeight: 72, letterSpacing: -1.5, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  timeUnit: { ...DisplayFont, fontSize: VoiceSize.aside, color: Nocturne.text2 },
  line: { ...Type.body, color: Nocturne.text2, textAlign: 'center', maxWidth: 320 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: Space.xl },
  stat: { alignItems: 'center', gap: 2, minWidth: 96 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { ...NUMBER_FONT, fontSize: 22, color: Nocturne.text },
  statLabel: { ...Type.caption, color: Nocturne.text3 },
  statRule: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: Nocturne.edge },
  week: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', maxWidth: 340, width: '100%' },
  day: { alignItems: 'center', gap: Space.s },
  dayLetter: { ...Type.caption, color: Nocturne.text3 },
  dayLetterToday: { color: Nocturne.text, fontWeight: '600' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: Nocturne.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: Nocturne.text, borderColor: Nocturne.text },
  dotToday: { borderColor: Nocturne.text, borderWidth: 2 },
  dotFuture: { opacity: 0.4 },
  actions: { gap: Space.m, alignItems: 'stretch' },
});
