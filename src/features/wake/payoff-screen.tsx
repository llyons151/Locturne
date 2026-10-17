import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Share, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { restingMoonNow } from '@/components/night-sky';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import LocStage from '../home/loc-stage';
import { dayLabel, weekDays } from '../home/week';
import Moonrise, { type Disc } from './moonrise';
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

/** The moon behind Loc: a little bigger than his circle, so its edge and light show all round. */
const MOON_R = Math.round((SIZE / 2) * 1.24);

/** One step of the entrance, after the moon is in: each piece comes in a beat after the one above it. */
const STEP_MS = 120;

/** The page's entrance curve: quick out, long settle. Native wants cubicBezier(), not a CSS string. */
const SETTLE = cubicBezier(0.2, 0.8, 0.2, 1);

/** Under this tall (an iPhone SE) the page's gaps tighten, so the week strip stays clear of Done. */
const SHORT_SCREEN = 720;

/** If the moonrise's webview never reports in, the page comes in anyway. */
const ARRIVE_FALLBACK_MS = 4500;

/**
 * The morning payoff (docs/APP_RATING_2026-10-15.md, "Build the morning payoff"): the moment the
 * apps wake, made into one. The sky's moon rises from the bottom to sit behind Loc, the
 * week strip's mist pouring off it and fading (moonrise.tsx, moon-mist.ts; user, 2026-10-15),
 * and the page comes in once it's there. Loc, smug and silent (no lines here: user, 2026-10-15); the time you got up is
 * the big number; the morning's count and this week's dots under it. Done goes back to Home.
 * Opened once per morning by Home (`usePayoff`), and from the wake preview with made-up facts.
 */
export function PayoffScreen({ facts }: { facts: PayoffFacts }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const short = height < SHORT_SCREEN;
  const { method, upAt, start, mornings, today, won } = facts;
  // Where the sky's moon is as the screen opens: the rise starts from there.
  const [rest] = useState(() => restingMoonNow(width, height));
  // The stage's size, and Loc's circle measured in it: where the moon ends.
  const stageRef = useRef<View>(null);
  const avatarRef = useRef<View>(null);
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null);
  const [target, setTarget] = useState<Disc | null>(null);
  // The moonrise has drawn its first frame (the sky's moon can go), and has the moon behind Loc.
  const [handedOff, setHandedOff] = useState(false);
  const [arrived, setArrived] = useState(false);
  const measure = useCallback(() => {
    const avatar = avatarRef.current;
    const root = stageRef.current;
    if (!avatar || !root) return;
    root.measureInWindow((rx, ry) => {
      avatar.measureInWindow((x, y, w, h) => {
        if (w > 0) setTarget({ x: x - rx + w / 2, y: y - ry + h / 2, r: MOON_R });
      });
    });
  }, []);
  const onStage = (e: LayoutChangeEvent) => {
    setStage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
    measure();
  };
  const onReady = useCallback(() => setHandedOff(true), []);
  const onArrive = useCallback(() => setArrived(true), []);
  useEffect(() => {
    const id = setTimeout(() => setArrived(true), ARRIVE_FALLBACK_MS);
    return () => clearTimeout(id);
  }, []);
  // The buzz lands with the moon.
  useEffect(() => {
    if (arrived) haptic.done();
  }, [arrived]);
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
    <AppBackground moonless={handedOff}>
      <View ref={stageRef} style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onStage}>
        {stage && target ? (
          <Moonrise
            from={rest.disc}
            to={target}
            glow={rest.glow}
            reduced={reduced}
            onReady={onReady}
            onArrive={onArrive}
            dom={{
              style: { width: stage.width, height: stage.height, backgroundColor: 'transparent' },
              scrollEnabled: false,
              bounces: false,
              contentInsetAdjustmentBehavior: 'never',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </View>
      <View style={[styles.screen, { paddingTop: insets.top + Space.l, paddingBottom: insets.bottom + Space.l }]}>
        <Animated.Text entering={FadeIn.duration(400)} style={styles.kicker}>
          {payoffKicker(mornings)}
        </Animated.Text>

        <View style={[styles.middle, short && styles.middleShort]}>
          <View ref={avatarRef} onLayout={measure} style={[styles.locWrap, short && styles.locWrapShort]}>
            <In shown={arrived} step={0} from={0.94} style={styles.avatar}>
              <View style={[styles.loc, { width: CANVAS, height: LOC_H }]}>
                <LocStage mood="smug" share={0.9} present dom={dom} />
              </View>
            </In>
          </View>

          <In shown={arrived} step={1} style={styles.time} accessible accessibilityRole="header" accessibilityLabel={`Up at ${up.value} ${up.unit}`}>
            <Text style={styles.timeKicker}>Up at</Text>
            <View style={styles.timeRow}>
              <Text style={styles.timeValue} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
                {up.value}
              </Text>
              <Text style={styles.timeUnit} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
                {up.unit}
              </Text>
            </View>
          </In>

          <In shown={arrived} step={2}>
            <Text style={styles.line}>{payoffLine(method, upAt, start)}</Text>
          </In>

          <In shown={arrived} step={3} style={styles.stats}>
            <Stat value={String(mornings)} label={mornings === 1 ? 'morning up' : 'mornings up'} icon={sym('sunrise.fill', 'wb_twilight')} />
            <View style={styles.statRule} />
            <Stat value={`${week}/7`} label="this week" icon={sym('calendar', 'calendar_today')} />
          </In>

          <In shown={arrived} step={4} style={styles.week}>
            {days.map((day) => (
              <View key={day.key} style={styles.day} accessible accessibilityLabel={dayLabel(day)}>
                <Text style={[styles.dayLetter, day.today && styles.dayLetterToday]}>{day.letter}</Text>
                <View style={[styles.dot, day.done && styles.dotDone, day.today && styles.dotToday, day.future && styles.dotFuture]}>
                  {day.done ? <SymbolView name={sym('checkmark', 'check')} size={12} weight="bold" tintColor={Nocturne.bg} /> : null}
                </View>
              </View>
            ))}
          </In>
        </View>

        <In shown={arrived} step={5} style={styles.actions}>
          <PrimaryButton label="Done" onPress={close} />
          <TextButton label="Share" onPress={share} />
        </In>
      </View>
    </AppBackground>
  );
}

/**
 * A piece of the page, laid out from the start (so Loc's circle doesn't move once measured) but
 * unseen until the moon is in, then rising in its turn. `from` scales it up instead of lifting it.
 */
function In({
  shown,
  step,
  from,
  style,
  children,
  ...rest
}: PropsWithChildren<{ shown: boolean; step: number; from?: number; style?: StyleProp<ViewStyle> } & Omit<React.ComponentProps<typeof View>, 'style'>>) {
  const reduced = useReducedMotion();
  const enter = shown && !reduced;
  return (
    <Animated.View
      {...rest}
      pointerEvents={shown ? 'auto' : 'none'}
      style={[
        style,
        { opacity: shown ? 1 : 0 },
        enter && {
          animationName: {
            from: { opacity: 0, transform: from ? [{ scale: from }] : [{ translateY: 14 }] },
            to: { opacity: 1, transform: from ? [{ scale: 1 }] : [{ translateY: 0 }] },
          },
          animationDuration: from ? '700ms' : '480ms',
          animationDelay: `${step === 0 ? 0 : 180 + step * STEP_MS}ms`,
          animationTimingFunction: SETTLE,
          animationFillMode: 'backwards',
        },
      ]}
    >
      {children}
    </Animated.View>
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
  // Room round the circle for the moon's light, so it doesn't run under the time.
  locWrap: { alignItems: 'center', marginVertical: Space.xl },
  middleShort: { gap: Space.m },
  locWrapShort: { marginVertical: Space.s },
  // As on the You tab: a light ring round a frosted circle, here in front of the risen moon.
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
  week: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'center', maxWidth: 340, width: '100%' },
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
