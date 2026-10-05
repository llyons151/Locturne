import { Image } from 'expo-image';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { BrandIcon, SystemIcon, type BrandName, type SystemName } from '@/components/app-icons';
import { Glyph } from '@/components/ios-glyphs';
import { Reveal } from '@/components/motion';
import { useCompact } from '@/hooks/use-compact';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import { shieldCopy, shieldTap } from '@/lib/shield-copy';
import type { Tone } from '@/lib/tone';
import { DOWNSTAIRS } from '@/lib/wake/downstairs';
import { downstairsLine, PHASE_LINES, stepsLine } from '@/lib/wake/lines';
import { DisplayFont, Nocturne, NUMBER_FONT, VoiceSize } from '@/theme';

import { Eyebrow, Title } from '../ui';

const STEP_GOAL = 200;

/**
 * The script, in ms from the page opening. It's the real morning, in the order that works
 * (shield-copy.ts): the shield's one button sends a notification, the notification opens
 * Locturne, and the wake-up happens there. Never "do it, then press the shield's button".
 */
const TAP_AT = 1500;
const SHIELD_AT = 1650;
/** "Fine", the shield's only button. */
const FINE_AT = 2800;
const BANNER_AT = 2950;
const BANNER_TAP_AT = 3900;
const APP_AT = 4050;
/** Downstairs only: the barometer listens after Start. */
const START_AT = 4750;
const WALK_AT = 4950;
const WALK_TO_190_MS = 2400;
const LAST_STEPS_MS = 110;
/** At the goal his done line shows in the app, then it's back to Instagram. */
const LIFT_AFTER_MS = 800;
/** Reduced motion: no zoom or counting, just the states. */
const REDUCED_APP_AT = 2800;
const REDUCED_AWAKE_AT = 4300;

/** Apple's iPhone 17 bezel image (Apple Design Resources), 1350×2760, and its screen opening. */
const FRAME = require('@/assets/onboarding/iphone-frame.png');
const PHONE_RATIO = 1350 / 2760;
const SCREEN = { left: 72 / 1350, top: 69 / 2760, width: 1206 / 1350, height: 2622 / 2760 };
const WALLPAPER = require('@/assets/backgrounds/moonlit-night.png');

/** iOS home screen metrics, in points on a 402pt-wide screen. */
const ICON = 64;
const GRID = { top: 74, left: 16 };
const ROW = 96;
/** Four columns across the screen, each icon centred in its column. */
const CELL = (402 - GRID.left * 2) / 4;
const HOME_APPS: BrandName[] = ['TikTok', 'Instagram', 'YouTube', 'Snapchat', 'X', 'Reddit', 'Netflix', 'Twitch'];
/** The app that gets opened. */
const TARGET = HOME_APPS.indexOf('Instagram');
const DOCK_APPS: SystemName[] = ['Phone', 'Safari', 'Messages', 'Music'];

/**
 * What the demo shows for the method they just chose (B2 in docs/ONBOARDING_OPTIMIZATION.md):
 * someone who said "yes, stairs" mustn't watch a step counter at the aha moment. The timeline
 * is the same for all three; `tick` is how far along it is, 0 to STEP_GOAL. The shield's words
 * are the real ones (`shieldCopy`), and the app's lines are the real wake-up screen's.
 */
const METHOD_DEMO: Record<
  WakeMethod,
  {
    /** The big number and its unit, at this point of the timeline. */
    count: (tick: number) => { value: string; unit: string };
    /** Loc under the phone once the app is open, before the count starts. */
    go: string;
    /** His line halfway there. */
    midway: string;
    /** The wake-up screen's own line inside the phone, before the goal. */
    appLine: (tick: number) => string;
    /** Downstairs has a Start button; the others count straight away. */
    start: boolean;
    /** VoiceOver, at the end. */
    done: string;
  }
> = {
  steps: {
    count: (tick) => ({ value: String(tick), unit: ` / ${STEP_GOAL} steps` }),
    go: 'Walk. I’m counting. Grudgingly.',
    midway: 'I can hear you walking. I’m ignoring it.',
    appLine: (tick) => stepsLine(tick, STEP_GOAL).replace(/\*/g, ''),
    start: false,
    done: `${STEP_GOAL} of ${STEP_GOAL} steps.`,
  },
  downstairs: {
    // The same metres meter as the real wake-up screen (downstairs-view.tsx).
    count: (tick) => ({
      value: ((tick / STEP_GOAL) * DOWNSTAIRS.threshold).toFixed(1),
      unit: ` / ${DOWNSTAIRS.threshold} m down`,
    }),
    go: 'Start. Then the stairs.',
    midway: 'I can feel the stairs. I’m ignoring them.',
    appLine: (tick) =>
      tick === 0 ? downstairsLine('idle', 0) : downstairsLine('moving', tick / STEP_GOAL),
    start: true,
    done: 'One floor down.',
  },
  scan: {
    count: (tick) =>
      tick >= STEP_GOAL ? { value: 'Scanned', unit: '' } : { value: String(STEP_GOAL - tick), unit: ' steps to your code' },
    go: 'Now walk me to your code.',
    midway: 'You’re going to the code. I’m ignoring it.',
    appLine: () => 'Point me at your code.',
    start: false,
    done: 'Code scanned.',
  },
};

/** The notification the shield's button sends (`shieldTap`): the way into the app. */
const TAP_NOTE = shieldTap('morning')!;

/** How far the phone leans under a finger or cursor, in degrees. */
const MAX_TILT = 14;

type Phase = 'home' | 'shield' | 'banner' | 'app' | 'awake';
type SharedNumber = ReturnType<typeof useSharedValue<number>>;

/**
 * The product in nine seconds, on an iPhone: tap Instagram at 7:00, get the morning shield,
 * tap Fine, tap the notification it sends, do the chosen wake-up in Locturne, then Instagram.
 */
export function TomorrowDemo({
  when,
  clock,
  method,
  tone = 'grumpy',
  onPayoff,
}: {
  when: string;
  clock: string;
  method: WakeMethod;
  /** How grumpy he was asked to be (`voice`): the shield in the demo says it his way. */
  tone?: Tone;
  /** Called once the sleep screen has lifted: the onboarding's button waits for it. */
  onPayoff?: () => void;
}) {
  const copy = METHOD_DEMO[method];
  const shield = shieldCopy('morning', { morningStart: 0, method, stepGoal: STEP_GOAL }, null, tone);
  const reduced = useReducedMotion();
  const compact = useCompact();
  const [phase, setPhase] = useState<Phase>('home');
  const [steps, setSteps] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const press = useSharedValue(1);
  const fine = useSharedValue(1);
  const open = useSharedValue(0);
  const banner = useSharedValue(0);
  const bannerPress = useSharedValue(1);
  const app = useSharedValue(0);
  const start = useSharedValue(1);
  const lift = useSharedValue(0);
  const [started, setStarted] = useState(!copy.start);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const announce = () =>
      AccessibilityInfo.announceForAccessibility(`${copy.done} Your apps are awake. I’m up. Don’t talk to me yet.`);

    if (reduced) {
      at(TAP_AT, () => {
        open.value = 1;
        setPhase('shield');
      });
      at(REDUCED_APP_AT, () => {
        app.value = 1;
        setStarted(true);
        setPhase('app');
      });
      at(REDUCED_AWAKE_AT, () => {
        setSteps(STEP_GOAL);
        lift.value = 1;
        setPhase('awake');
        haptic.done();
        announce();
      });
      return () => timers.forEach(clearTimeout);
    }

    const tap = (value: typeof press, depth = 0.94) => {
      haptic.tap();
      value.value = withSequence(withTiming(depth, { duration: 100 }), withTiming(1, { duration: 160 }));
    };
    at(TAP_AT, () => tap(press, 0.86));
    at(SHIELD_AT, () => {
      setPhase('shield');
      open.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    });
    at(FINE_AT, () => tap(fine));
    at(BANNER_AT, () => {
      setPhase('banner');
      banner.value = withSpring(1, { damping: 18, stiffness: 180 });
    });
    at(BANNER_TAP_AT, () => tap(bannerPress, 0.96));
    at(APP_AT, () => {
      setPhase('app');
      banner.value = withTiming(0, { duration: 220 });
      app.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
    });
    if (copy.start) {
      at(START_AT, () => {
        tap(start);
        setStarted(true);
      });
    }
    for (let s = 5; s <= 190; s += 5) {
      at(WALK_AT + Math.round((s / 190) * WALK_TO_190_MS), () => {
        setSteps(s);
        if (s % 20 === 0) haptic.tick();
      });
    }
    // The last ten steps land one at a time. This is the moment people film.
    const goalAt = WALK_AT + WALK_TO_190_MS + 10 * LAST_STEPS_MS;
    for (let s = 191; s <= STEP_GOAL; s += 1) {
      at(WALK_AT + WALK_TO_190_MS + (s - 190) * LAST_STEPS_MS, () => {
        setSteps(s);
        if (s < STEP_GOAL) haptic.thud();
        else haptic.done();
      });
    }
    // His done line shows in the app for a beat, then it's back to Instagram.
    at(goalAt + LIFT_AFTER_MS, () => {
      setPhase('awake');
      lift.value = withTiming(1, { duration: 480, easing: Easing.inOut(Easing.cubic) });
      announce();
    });
    return () => timers.forEach(clearTimeout);
    // Runs once per visit to this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // The phone fills the space it's given, at a phone's proportions.
  const phoneHeight = Math.min(area.height, area.width / PHONE_RATIO);
  const phoneWidth = phoneHeight * PHONE_RATIO;
  const onArea = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  // The app's own count, inside the phone: only it changes per tick. The home screen and the
  // feed are memoized, because re-rendering the phone's icons and photos on every tick made the
  // count stutter.
  const appTick = phase === 'app' || phase === 'awake' ? steps : 0;
  const phone = useMemo(
    () =>
      phoneHeight > 0 ? (
        <Reveal>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Tilt width={phoneWidth} height={phoneHeight} still={reduced}>
              <Phone
                width={phoneWidth}
                clock={clock}
                phase={phase}
                shieldTitle={shield.title}
                shieldLine={shield.subtitle}
                buttonLabel={shield.button}
                press={press}
                fine={fine}
                open={open}
                banner={banner}
                bannerPress={bannerPress}
                app={app}
                lift={lift}
                appScreen={
                  <WakeApp
                    k={phoneWidth * SCREEN.width / 402}
                    line={appTick >= STEP_GOAL ? PHASE_LINES.day : copy.appLine(started ? appTick : 0)}
                    count={copy.count(appTick)}
                    progress={appTick / STEP_GOAL}
                    showStart={copy.start && !started}
                    start={start}
                  />
                }
              />
            </Tilt>
          </View>
        </Reveal>
      ) : null,
    // Shared values are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phoneWidth, phoneHeight, reduced, clock, phase, copy, shield, appTick, started],
  );

  const awake = phase === 'awake';
  useEffect(() => {
    if (awake) onPayoff?.();
  }, [awake, onPayoff]);
  const count = copy.count(steps);
  // "Fine. *Fine.*": the whole line is already italic, so the emphasis is an underline.
  const line =
    phase === 'home' ? null : phase === 'shield' ? (
      `${shield.title} Tap ${shield.button.replace(/\.$/, '')}.`
    ) : phase === 'banner' ? (
      'That’s me. Tap it.'
    ) : awake ? (
      'I’m up. Don’t talk to me yet.'
    ) : steps >= 160 ? (
      <>
        Fine. <Text style={styles.emphasis}>Fine.</Text>
      </>
    ) : steps >= 80 ? (
      copy.midway
    ) : (
      copy.go
    );

  return (
    <View style={styles.wrap}>
      <Eyebrow>{when}</Eyebrow>
      <Title>You reach for your phone.</Title>

      <View style={[styles.phoneArea, compact && styles.phoneAreaCompact]} onLayout={onArea}>
        {phone}
      </View>

      <Reveal style={[styles.walk, compact && styles.walkCompact]}>
        <Text
          style={[styles.walkCount, compact && styles.walkCountCompact]}
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={`${count.value}${count.unit}`}
        >
          {count.value}
          <Text style={styles.walkGoal}>{count.unit}</Text>
        </Text>
        <View style={styles.walkTrack}>
          <View style={[styles.walkFill, { width: `${(steps / STEP_GOAL) * 100}%` }]} />
        </View>
        <Text style={[styles.walkLine, compact && styles.walkLineCompact]} accessibilityLiveRegion="polite">
          {line}
        </Text>
      </Reveal>
    </View>
  );
}

/** Leans the phone toward a hovering cursor or a dragging finger, and springs back. */
function Tilt({ width, height, still, children }: { width: number; height: number; still: boolean; children: ReactNode }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const toward = (px: number, py: number) => {
    'worklet';
    const spring = { damping: 14, stiffness: 140 };
    x.value = withSpring(Math.max(-1, Math.min(1, px)), spring);
    y.value = withSpring(Math.max(-1, Math.min(1, py)), spring);
  };
  const rest = () => {
    'worklet';
    const spring = { damping: 12, stiffness: 120 };
    x.value = withSpring(0, spring);
    y.value = withSpring(0, spring);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onUpdate((e) => toward(e.translationX / (width * 0.6), e.translationY / (height * 0.4)))
    .onFinalize(rest);

  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${-y.value * MAX_TILT}deg` },
      { rotateY: `${x.value * MAX_TILT}deg` },
      { scale: 1 + Math.max(Math.abs(x.value), Math.abs(y.value)) * 0.02 },
    ],
  }));

  if (still) return <View>{children}</View>;

  // Web: plain pointer events. Gesture Handler's Hover + Pan on web throws
  // "releasePointerCapture: Invalid pointer id" when a pointer it never captured leaves.
  if (Platform.OS === 'web') {
    const follow = (e: { currentTarget: unknown; nativeEvent: { clientX: number; clientY: number } }) => {
      const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
      toward(((e.nativeEvent.clientX - box.left) / box.width) * 2 - 1, ((e.nativeEvent.clientY - box.top) / box.height) * 2 - 1);
    };
    return (
      <Animated.View style={style} onPointerMove={follow} onPointerLeave={rest} onPointerUp={rest} onPointerCancel={rest}>
        {children}
      </Animated.View>
    );
  }
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

/**
 * Apple's iPhone 17 bezel with a live screen underneath. Layout inside the screen is
 * in iOS points on a 402pt-wide display, scaled by `k`. Layers, bottom up: the home screen
 * (then Instagram), the morning shield, Locturne's wake-up screen, the notification banner.
 */
function Phone({
  width,
  clock,
  phase,
  shieldTitle,
  shieldLine,
  buttonLabel,
  press,
  fine,
  open,
  banner,
  bannerPress,
  app,
  lift,
  appScreen,
}: {
  width: number;
  clock: string;
  phase: Phase;
  shieldTitle: string;
  shieldLine: string;
  buttonLabel: string;
  press: SharedNumber;
  fine: SharedNumber;
  open: SharedNumber;
  banner: SharedNumber;
  bannerPress: SharedNumber;
  app: SharedNumber;
  lift: SharedNumber;
  appScreen: ReactNode;
}) {
  const height = width / PHONE_RATIO;
  const sw = width * SCREEN.width;
  const sh = height * SCREEN.height;
  const k = sw / 402;
  const pt = (n: number) => n * k;

  // Where Instagram sits, relative to the screen's centre: the shield grows out of it.
  const fromX = (GRID.left + CELL * (TARGET % 4) + CELL / 2) * k - sw / 2;
  const fromY = (GRID.top + ROW * Math.floor(TARGET / 4) + ICON / 2) * k - sh / 2;
  const fromScale = ICON / 402;

  const fineStyle = useAnimatedStyle(() => ({ transform: [{ scale: fine.value }] }));
  const shieldStyle = useAnimatedStyle(() => {
    const p = open.value;
    return {
      opacity: Math.min(1, p * 2.5) * (1 - lift.value),
      transform: [
        { translateX: fromX * (1 - p) },
        { translateY: fromY * (1 - p) },
        { scale: fromScale + (1 - fromScale) * p },
      ],
    };
  });
  // The app opens from the banner at the top, the way a tapped notification opens one.
  const appStyle = useAnimatedStyle(() => {
    const a = app.value;
    const l = lift.value;
    return {
      opacity: Math.min(1, a * 2) * (1 - l),
      transform: [{ translateY: (1 - a) * -sh * 0.35 - l * 24 * k }, { scale: (0.4 + 0.6 * a) * (1 + l * 0.04) }],
    };
  });
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, banner.value * 1.5),
    transform: [{ translateY: (banner.value - 1) * pt(120) }, { scale: bannerPress.value }],
  }));

  return (
    <View style={{ width, height }}>
      <View
        style={[
          styles.screen,
          { left: width * SCREEN.left, top: height * SCREEN.top, width: sw, height: sh, borderRadius: sw * 0.14 },
        ]}
      >
        {phase === 'awake' ? <InstagramFeed k={k} /> : <HomeScreen k={k} press={press} />}

        {/*
          The morning shield as iOS draws it from shield-copy.ts and screen-time.ts: near-black,
          a white moon.zzz, the title, the subtitle and one white button. No second button.
        */}
        <Animated.View pointerEvents="none" style={[styles.shield, { borderRadius: sw * 0.14 }, shieldStyle]}>
          <View style={[styles.shieldBody, { top: pt(250), paddingHorizontal: pt(32), gap: pt(10) }]}>
            <View style={{ marginBottom: pt(14) }}>
              <Glyph name="moon" size={pt(52)} />
            </View>
            <Text style={[styles.shieldTitle, { fontSize: pt(26), lineHeight: pt(31) }]} maxFontSizeMultiplier={1}>
              {shieldTitle}
            </Text>
            <Text style={[styles.shieldSub, { fontSize: pt(17), lineHeight: pt(22) }]} maxFontSizeMultiplier={1}>
              {shieldLine}
            </Text>
          </View>
          <View style={[styles.shieldButtons, { left: pt(24), right: pt(24), bottom: pt(60) }]}>
            <Animated.View style={[styles.shieldPrimary, { height: pt(54), borderRadius: pt(16) }, fineStyle]}>
              <Text style={[styles.shieldPrimaryText, { fontSize: pt(18) }]} maxFontSizeMultiplier={1}>
                {buttonLabel}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, appStyle]}>
          {appScreen}
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.banner, { top: pt(54), left: pt(10), right: pt(10), borderRadius: pt(22), padding: pt(13), gap: pt(11) }, bannerStyle]}
        >
          <View style={[styles.bannerIcon, { width: pt(38), height: pt(38), borderRadius: pt(9) }]}>
            <Glyph name="moon" size={pt(22)} />
          </View>
          <View style={styles.flex}>
            <View style={styles.bannerHead}>
              <Text style={[styles.bannerTitle, { fontSize: pt(15) }]} maxFontSizeMultiplier={1}>
                {TAP_NOTE.title}
              </Text>
              <Text style={[styles.bannerWhen, { fontSize: pt(13) }]} maxFontSizeMultiplier={1}>
                now
              </Text>
            </View>
            <Text style={[styles.bannerBody, { fontSize: pt(15), lineHeight: pt(19) }]} maxFontSizeMultiplier={1}>
              {TAP_NOTE.body}
            </Text>
          </View>
        </Animated.View>

        <View style={[styles.statusBar, { top: pt(17), height: pt(22) }]}>
          <Text style={[styles.clock, { width: pt(130), fontSize: pt(17) }]} maxFontSizeMultiplier={1}>
            {clock}
          </Text>
          <View style={[styles.statusIcons, { width: pt(130), gap: pt(5) }]}>
            <Glyph name="signal" size={pt(18)} />
            <Glyph name="wifi" size={pt(18)} />
            <Glyph name="battery" size={pt(27)} />
          </View>
        </View>
      </View>
      <Image source={FRAME} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
    </View>
  );
}

/** The home screen at 7:00, with Instagram about to be tapped. Memoized: it never changes. */
const HomeScreen = memo(function HomeScreen({ k, press }: { k: number; press: SharedNumber }) {
  const pt = (n: number) => n * k;
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  return (
    <>
      <Image source={WALLPAPER} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[styles.grid, { top: pt(GRID.top), left: pt(GRID.left), right: pt(GRID.left) }]}>
        {HOME_APPS.map((name, i) => (
          <View key={name} style={{ width: pt(CELL), height: pt(ROW), alignItems: 'center', gap: pt(5) }}>
            <Animated.View style={i === TARGET ? pressStyle : undefined}>
              <BrandIcon name={name} size={pt(ICON)} />
            </Animated.View>
            <Text numberOfLines={1} style={[styles.label, { fontSize: pt(12) }]} maxFontSizeMultiplier={1}>
              {name}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={[
          styles.search,
          { bottom: pt(124), height: pt(30), paddingHorizontal: pt(12), borderRadius: pt(15), gap: pt(4) },
        ]}
      >
        <Glyph name="search" size={pt(13)} />
        <Text style={[styles.searchText, { fontSize: pt(13) }]} maxFontSizeMultiplier={1}>
          Search
        </Text>
      </View>
      <View
        style={[
          styles.dock,
          { left: pt(12), right: pt(12), bottom: pt(12), height: pt(92), borderRadius: pt(36), paddingHorizontal: pt(14) },
        ]}
      >
        {DOCK_APPS.map((name) => (
          <SystemIcon key={name} name={name} size={pt(ICON)} />
        ))}
      </View>
    </>
  );
});

/**
 * Locturne's wake-up screen, small, inside the phone: his line, the count and, for
 * downstairs, Start. The same words and meter as the real one (src/features/wake).
 */
function WakeApp({
  k,
  line,
  count,
  progress,
  showStart,
  start,
}: {
  k: number;
  line: string;
  count: { value: string; unit: string };
  progress: number;
  showStart: boolean;
  start: SharedNumber;
}) {
  const pt = (n: number) => n * k;
  const startStyle = useAnimatedStyle(() => ({ transform: [{ scale: start.value }] }));
  return (
    <View style={[styles.wakeApp, { paddingHorizontal: pt(24), paddingTop: pt(110), paddingBottom: pt(60) }]}>
      <Text style={[styles.wakeLine, { fontSize: pt(32), lineHeight: pt(35) }]} maxFontSizeMultiplier={1}>
        {line}
      </Text>
      <View style={styles.flex} />
      <Text style={[styles.wakeCount, { fontSize: pt(64), lineHeight: pt(70) }]} maxFontSizeMultiplier={1}>
        {count.value}
        <Text style={[styles.walkGoal, { fontSize: pt(18) }]}>{count.unit}</Text>
      </Text>
      <View style={[styles.walkTrack, { height: pt(6), marginTop: pt(12) }]}>
        <View style={[styles.walkFill, { width: `${Math.min(1, progress) * 100}%` }]} />
      </View>
      <View style={{ height: pt(54), marginTop: pt(28) }}>
        {showStart ? (
          <Animated.View style={[styles.shieldPrimary, { flex: 1, borderRadius: pt(27) }, startStyle]}>
            <Text style={[styles.shieldPrimaryText, { fontSize: pt(18) }]} maxFontSizeMultiplier={1}>
              Start
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const TAB = 83;
const STORIES: { name: string; photo: number }[] = [
  { name: 'Your story', photo: require('@/assets/onboarding/avatars/moon.jpg') },
  { name: 'corgi.daily', photo: require('@/assets/onboarding/avatars/corgi.jpg') },
  { name: 'nightowl.jess', photo: require('@/assets/onboarding/avatars/bed.jpg') },
  { name: 'pugsofig', photo: require('@/assets/onboarding/avatars/pug.jpg') },
  { name: 'backyard.pup', photo: require('@/assets/onboarding/avatars/puppy.jpg') },
];
/** Free Mixkit clip (mixkit.co, free license), cropped to a 4:5 post. */
const POST_VIDEO = require('@/assets/onboarding/feed-puppy.mp4');
/** Instagram's script wordmark isn't a font we ship; Snell Roundhand is the closest iOS system face. */
const WORDMARK_FONT = Platform.select({
  ios: 'SnellRoundhand-Bold',
  default: "'Snell Roundhand', 'Brush Script MT', 'Segoe Script', cursive",
});

/** Instagram, open at last: the home feed, with a video post playing. Memoized: it never changes. */
const InstagramFeed = memo(function InstagramFeed({ k }: { k: number }) {
  const pt = (n: number) => n * k;
  const text = (size: number, weight: TextStyle['fontWeight'] = '400', opacity = 1): StyleProp<TextStyle> => [
    styles.feedText,
    { fontSize: pt(size), fontWeight: weight, opacity },
  ];
  const player = useVideoPlayer(POST_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
  });
  // Start once the view is mounted: on web a play() from setup runs before there's a
  // <video> element to play, and the post sits frozen on its first frame.
  useEffect(() => {
    player.play();
  }, [player]);
  const ring = pt(64);
  const postTop = 228;

  return (
    <View style={styles.feed}>
      <View style={[styles.igHeader, { top: pt(48), left: pt(16), right: pt(16), height: pt(36) }]}>
        <Text style={[styles.feedText, { fontFamily: WORDMARK_FONT, fontSize: pt(30) }]} maxFontSizeMultiplier={1}>
          Instagram
        </Text>
        <View style={[styles.row, { gap: pt(20) }]}>
          <Glyph name="heart" size={pt(26)} />
          <Glyph name="send" size={pt(25)} />
        </View>
      </View>

      <View style={[styles.row, { position: 'absolute', top: pt(92), left: pt(10), gap: pt(12) }]}>
        {STORIES.map((story, i) => (
          <View key={story.name} style={{ width: ring, alignItems: 'center', gap: pt(4) }}>
            <View style={{ width: ring, height: ring }}>
              {i > 0 ? (
                <Svg width={ring} height={ring} viewBox="0 0 64 64" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <SvgGradient id="story-ring" x1="0" y1="1" x2="1" y2="0">
                      <Stop offset="0" stopColor="#FEDA75" />
                      <Stop offset="0.4" stopColor="#FA7E1E" />
                      <Stop offset="0.7" stopColor="#D62976" />
                      <Stop offset="1" stopColor="#962FBF" />
                    </SvgGradient>
                  </Defs>
                  <Circle cx="32" cy="32" r="30.5" stroke="url(#story-ring)" strokeWidth="2.6" fill="none" />
                </Svg>
              ) : null}
              <Image
                source={story.photo}
                style={{ position: 'absolute', left: pt(5), top: pt(5), width: ring - pt(10), height: ring - pt(10), borderRadius: ring }}
                contentFit="cover"
              />
              {i === 0 ? (
                <View style={[styles.storyAdd, { width: pt(20), height: pt(20), borderRadius: pt(10), borderWidth: pt(2) }]}>
                  <Text style={[styles.feedText, { fontSize: pt(15), lineHeight: pt(17), fontWeight: '700' }]} maxFontSizeMultiplier={1}>
                    +
                  </Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={text(11, '400', i === 0 ? 0.7 : 1)} maxFontSizeMultiplier={1}>
              {story.name}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.igPostHeader, { top: pt(postTop - 46), left: pt(12), right: pt(12), height: pt(40), gap: pt(10) }]}>
        <Image source={STORIES[4].photo} style={{ width: pt(32), height: pt(32), borderRadius: pt(16) }} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={text(14, '600')} maxFontSizeMultiplier={1}>
            backyard.pup
          </Text>
          <Text style={text(11, '400', 0.8)} maxFontSizeMultiplier={1}>
            Original audio
          </Text>
        </View>
        <Glyph name="more" size={pt(20)} />
      </View>

      <VideoView
        player={player}
        style={{ position: 'absolute', top: pt(postTop), left: 0, width: pt(402), height: pt(402 * 1.25) }}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
      />

      <View style={[styles.igActions, { top: pt(postTop + 402 * 1.25 + 8), left: pt(14), right: pt(14) }]}>
        <View style={[styles.row, { gap: pt(16) }]}>
          <Glyph name="heart" size={pt(26)} />
          <Glyph name="comment" size={pt(25)} />
          <Glyph name="send" size={pt(24)} />
        </View>
        <Glyph name="bookmark" size={pt(25)} />
      </View>
      <Text
        style={[text(14, '600'), { position: 'absolute', top: pt(postTop + 402 * 1.25 + 40), left: pt(14) }]}
        maxFontSizeMultiplier={1}
      >
        2,184 likes
      </Text>

      <View style={[styles.tabBar, { height: pt(TAB), paddingTop: pt(10), paddingHorizontal: pt(22) }]}>
        <Glyph name="homeFill" size={pt(26)} />
        <Glyph name="search" size={pt(26)} />
        <Glyph name="plus" size={pt(26)} />
        <Glyph name="reels" size={pt(26)} color="#FFFFFF" />
        <Image source={STORIES[0].photo} style={{ width: pt(26), height: pt(26), borderRadius: pt(13) }} contentFit="cover" />
      </View>
      <View style={[styles.homeBar, { bottom: pt(8), width: pt(134), height: pt(5), borderRadius: pt(3) }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 20 },
  phoneArea: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 16, minHeight: 160 },
  phoneAreaCompact: { marginTop: 10 },

  screen: { position: 'absolute', overflow: 'hidden', backgroundColor: '#000000' },
  statusBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clock: { color: '#FFFFFF', fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] },
  statusIcons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  grid: { position: 'absolute', flexDirection: 'row', flexWrap: 'wrap' },
  label: { color: '#FFFFFF', fontWeight: '500', textAlign: 'center' },
  search: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchText: { color: '#FFFFFF', fontWeight: '500' },
  dock: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },

  // screen-time.ts's colours: background 11/11/12, subtitle 161/161/166.
  shield: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: '#0B0B0C' },
  shieldBody: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  // The system font, as on a real shield: Screen Time doesn't take custom fonts.
  shieldTitle: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  shieldSub: { color: '#A1A1A6', textAlign: 'center' },
  shieldButtons: { position: 'absolute', alignItems: 'stretch' },
  shieldPrimary: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shieldPrimaryText: { color: '#0B0B0C', fontWeight: '600' },

  // An iOS notification banner in dark mode: a grey rounded card, no tint.
  banner: { position: 'absolute', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(44,44,48,0.96)' },
  bannerIcon: { backgroundColor: '#0B0B0C', alignItems: 'center', justifyContent: 'center' },
  bannerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  bannerTitle: { color: '#FFFFFF', fontWeight: '600' },
  bannerWhen: { color: '#A1A1A6' },
  bannerBody: { color: '#FFFFFF' },
  flex: { flex: 1 },

  wakeApp: { flex: 1, backgroundColor: Nocturne.bg },
  wakeLine: { ...DisplayFont, color: Nocturne.text },
  wakeCount: { ...NUMBER_FONT, color: Nocturne.text, fontVariant: ['tabular-nums'] },

  feed: { flex: 1, backgroundColor: '#000000' },
  feedText: { color: '#FFFFFF' },
  igHeader: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  igPostHeader: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  igActions: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  storyAdd: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#0095F6',
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
  },
  homeBar: { position: 'absolute', alignSelf: 'center', backgroundColor: '#FFFFFF' },

  walk: { marginTop: 18, marginBottom: 12, gap: 10 },
  walkCompact: { marginTop: 10, marginBottom: 4, gap: 6 },
  walkCount: {
    ...NUMBER_FONT,
    color: Nocturne.accent ?? Nocturne.text,
    fontSize: 44,
    lineHeight: 48,
    fontVariant: ['tabular-nums'],
  },
  walkCountCompact: { fontSize: 36, lineHeight: 40 },
  walkGoal: { color: Nocturne.text2, fontSize: 18, fontWeight: '500', fontStyle: 'normal' },
  walkTrack: { height: 6, borderRadius: 3, backgroundColor: Nocturne.track, overflow: 'hidden' },
  walkFill: { height: '100%', backgroundColor: Nocturne.text },
  // Same size and 1.08 line height as every other Loc aside (Voice in ui.tsx).
  walkLine: { ...DisplayFont, color: Nocturne.text, fontSize: VoiceSize.aside, lineHeight: 24, minHeight: 48 },
  walkLineCompact: { fontSize: 19, lineHeight: 23, minHeight: 46 },
  emphasis: { textDecorationLine: 'underline' },
});
