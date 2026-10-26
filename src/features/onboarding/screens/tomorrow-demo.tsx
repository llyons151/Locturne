import { Image } from 'expo-image';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type TextStyle } from 'react-native';
import { Text } from '@/components/text';
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
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Polyline, Rect, Stop } from 'react-native-svg';

import { BrandIcon, SystemIcon, type BrandName, type SystemName } from '@/components/app-icons';
import { Glyph } from '@/components/ios-glyphs';
import { Reveal } from '@/components/motion';
import { useCompact } from '@/hooks/use-compact';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import { shieldCopy, shieldTap } from '@/lib/shield-copy';
import { DOWNSTAIRS } from '@/lib/wake/downstairs';
import { downstairsLine, PHASE_LINES, pushupsLine, stepsLine } from '@/lib/wake/lines';
import { DEMO_REP_MS, demoPose } from '@/lib/wake/pose-demo';
import { PUSHUPS, type Joint } from '@/lib/wake/pushups';
import { DisplayFont, Nocturne, NUMBER_FONT } from '@/theme';

import { formatDistance } from '../../place/place-stage';
import { usesMiles } from '../../place/units';
import { QrCode } from '../../scan/qr';
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
/** Push-ups and the scan: the button that opens the camera, as on Home. */
const START_AT = 4750;
/** The wake-up itself starts; each method takes its own `ms` from here. */
const DO_AT = 4950;
/** At the goal his done line shows in the app, then it's back to Instagram. */
const LIFT_AFTER_MS = 800;
/** How often the wake-up redraws while it plays. */
const FRAME_MS = 40;
/** Reduced motion: no zoom or counting, just the states. */
const REDUCED_APP_AT = 2800;
const REDUCED_AWAKE_AT = 4300;

/**
 * The night branch's opening, before all of the above: the reach a little after bedtime (as
 * late as the morning's, so the page has finished coming in), the night shield, the screen
 * going dark, then morning. The phone is already up by then, so the morning's tap comes
 * 0.7 s after it, not TAP_AT: PRELUDE_MS moves the whole morning script that much later.
 */
const NIGHT_TAP_AT = TAP_AT;
const NIGHT_SHIELD_AT = SHIELD_AT;
const NIGHT_FINE_AT = 2550;
const NIGHT_DARK_AT = 2700;
const NIGHT_MORNING_AT = 3200;
const PRELUDE_MS = NIGHT_MORNING_AT + 700 - TAP_AT;
/** Reduced motion: the night shield, then dark, as still states. */
const REDUCED_NIGHT_DARK_AT = NIGHT_DARK_AT;

/** The night opening's eyebrow and status-bar clock ("Tonight, 11:52 PM"), and their alarm for the shield. */
export type NightPrelude = { when: string; clock: string; wake: number };

/** Apple's iPhone 17 bezel image (Apple Design Resources), 1350×2760, and its screen opening. */
const FRAME = require('@/assets/onboarding/iphone-frame.png');
const PHONE_RATIO = 1350 / 2760;
const SCREEN = { left: 72 / 1350, top: 69 / 2760, width: 1206 / 1350, height: 2622 / 2760 };
/** The screen in iOS points: 402 wide, and as tall as the opening makes it. */
const SCREEN_PT = { width: 402, height: Math.round((402 * SCREEN.height) / (PHONE_RATIO * SCREEN.width)) };
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
 * Each method's wake-up, timed (B2 in docs/ONBOARDING_OPTIMIZATION.md): someone who said "yes,
 * stairs" mustn't watch a step counter at the aha moment. `t` is ms into the wake-up itself;
 * what it looks like at `t` is `MethodApp`'s.
 */
type MethodDemo = {
  /** How long the wake-up plays, from DO_AT to the goal. */
  ms: number;
  /** The button that opens the camera first, as Home's does (push-ups, the scan). */
  start?: string;
  /** Which beat of the wake-up `t` is on, and how it lands: each new one taps the phone. */
  beat: (t: number) => [number, 'tick' | 'thud'];
};

/** Steps: the first 190 in a rush, the last ten one at a time. This is the moment people film. */
const STEPS_FAST_MS = 2400;
const LAST_STEP_MS = 110;
const stepsAt = (t: number) =>
  t < STEPS_FAST_MS
    ? Math.floor((t / STEPS_FAST_MS) * 38) * 5
    : Math.min(STEP_GOAL, 190 + Math.floor((t - STEPS_FAST_MS) / LAST_STEP_MS));

/** Downstairs: the height moves to the threshold, then the five-second hold, sped up. */
const STAIRS_MS = 2300;
const HOLD_SECOND_MS = 300;
const HOLD_SECONDS = 5;
const stairsAt = (t: number) => {
  const height = easeInOut(Math.min(1, t / STAIRS_MS));
  const held = Math.max(0, t - STAIRS_MS) / (HOLD_SECOND_MS * HOLD_SECONDS);
  return { height, held: Math.min(1, held), left: Math.max(0, HOLD_SECONDS - Math.floor(held * HOLD_SECONDS)) };
};

/** The place: out the door and down the street, then Check in. */
const PLACE_WALK_MS = 2900;
const PLACE_TAP_MS = 3300;
const PLACE_FROM_M = 450;

/** The scan: the code comes into the frame as they walk up to it, then it reads. */
const SCAN_FIND_MS = 1900;

/** Push-ups: quicker than real ones, so the set fits, but each one still all the way down. */
const repMs = (reps: number) => Math.min(450, 4500 / Math.max(1, reps));

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

function methodDemo(method: WakeMethod, reps: number): MethodDemo {
  switch (method) {
    case 'steps':
      return {
        ms: STEPS_FAST_MS + 10 * LAST_STEP_MS,
        beat: (t) => {
          const s = stepsAt(t);
          return s < 190 ? [Math.floor(s / 20), 'tick'] : [10 + s - 190, 'thud'];
        },
      };
    case 'downstairs':
      return {
        ms: STAIRS_MS + HOLD_SECOND_MS * HOLD_SECONDS + 100,
        beat: (t) => (t < STAIRS_MS ? [Math.floor(stairsAt(t).height * 4), 'tick'] : [10 - stairsAt(t).left, 'tick']),
      };
    case 'place':
      return { ms: 3600, beat: (t) => (t < PLACE_WALK_MS ? [0, 'tick'] : t < PLACE_TAP_MS ? [1, 'tick'] : [2, 'tick']) };
    case 'scan':
      return { ms: 2600, start: 'Scan my code', beat: (t) => [t < SCAN_FIND_MS ? 0 : 1, 'tick'] };
    case 'pushups':
      return { ms: reps * repMs(reps), start: 'Start push-ups', beat: (t) => [Math.floor(t / repMs(reps)), 'thud'] };
  }
}

/** When the demo's payoff lands, in ms from the page opening: the onboarding's button fills over it. */
export function demoLength({ method, reps = PUSHUPS.reps, night, reduced }: { method: WakeMethod; reps?: number; night: boolean; reduced: boolean }) {
  const offset = night ? PRELUDE_MS : 0;
  return offset + (reduced ? REDUCED_AWAKE_AT : DO_AT + methodDemo(method, reps).ms + LIFT_AFTER_MS);
}

/** The notification the shield's button sends (`shieldTap`): the way into the app. */
const TAP_NOTE = shieldTap('morning')!;

/** How far the phone leans under a finger or cursor, in degrees. */
const MAX_TILT = 14;

type Phase = 'night' | 'nightShield' | 'nightDark' | 'home' | 'shield' | 'banner' | 'app' | 'awake';
const NIGHT_PHASES: Phase[] = ['night', 'nightShield', 'nightDark'];
type SharedNumber = ReturnType<typeof useSharedValue<number>>;

/**
 * The product in ten seconds, on an iPhone: tap Instagram at 7:00, get the morning shield,
 * tap Fine, tap the notification it sends, do the chosen wake-up in Locturne, then Instagram.
 */
export function TomorrowDemo({
  when,
  clock,
  method,
  reps = PUSHUPS.reps,
  night,
  onPayoff,
}: {
  when: string;
  clock: string;
  /** The night branch: open on the reach at bedtime and the night shield first. */
  night?: NightPrelude;
  method: WakeMethod;
  /** Push-ups the morning takes, for the push-ups demo (`morningGoals`). */
  reps?: number;
  /** Called once the sleep screen has lifted: the onboarding's button waits for it. */
  onPayoff?: () => void;
}) {
  const demo = useMemo(() => methodDemo(method, reps), [method, reps]);
  const morningShield = shieldCopy('morning', { morningStart: 0, method, stepGoal: STEP_GOAL }, null);
  const nightShield = shieldCopy('night', { morningStart: night?.wake ?? 0, method, stepGoal: STEP_GOAL }, null);
  const reduced = useReducedMotion();
  const compact = useCompact();
  const [phase, setPhase] = useState<Phase>(night ? 'night' : 'home');
  const atNight = NIGHT_PHASES.includes(phase);
  const shield = atNight ? nightShield : morningShield;
  /** Ms into the wake-up itself; -1 before it starts. */
  const [t, setT] = useState(-1);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const press = useSharedValue(1);
  const fine = useSharedValue(1);
  const open = useSharedValue(0);
  const banner = useSharedValue(0);
  const bannerPress = useSharedValue(1);
  const app = useSharedValue(0);
  const start = useSharedValue(1);
  const lift = useSharedValue(0);
  /** The screen going dark between the night and the morning. */
  const dark = useSharedValue(0);
  const [started, setStarted] = useState(!demo.start);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let clock: ReturnType<typeof setInterval> | undefined;
    // With the night opening, the morning runs after it.
    const offset = night ? PRELUDE_MS : 0;
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms + offset));
    const atNightTime = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const toMorning = () => {
      open.value = 0;
      setPhase('home');
    };
    const cleanup = () => {
      timers.forEach(clearTimeout);
      clearInterval(clock);
    };
    const announce = () => AccessibilityInfo.announceForAccessibility('Your apps are awake. I’m up. Don’t talk to me yet.');

    if (night && reduced) {
      atNightTime(NIGHT_SHIELD_AT, () => {
        open.value = 1;
        setPhase('nightShield');
      });
      atNightTime(REDUCED_NIGHT_DARK_AT, () => {
        dark.value = 1;
        setPhase('nightDark');
      });
      atNightTime(NIGHT_MORNING_AT, () => {
        toMorning();
        dark.value = 0;
      });
    }

    if (reduced) {
      at(TAP_AT, () => {
        open.value = 1;
        setPhase('shield');
      });
      at(REDUCED_APP_AT, () => {
        app.value = 1;
        setPhase('app');
      });
      at(REDUCED_AWAKE_AT, () => {
        setStarted(true);
        setT(demo.ms);
        lift.value = 1;
        setPhase('awake');
        haptic.done();
        announce();
      });
      return cleanup;
    }

    const tap = (value: typeof press, depth = 0.94) => {
      haptic.tap();
      value.value = withSequence(withTiming(depth, { duration: 100 }), withTiming(1, { duration: 160 }));
    };
    if (night) {
      atNightTime(NIGHT_TAP_AT, () => tap(press, 0.86));
      atNightTime(NIGHT_SHIELD_AT, () => {
        setPhase('nightShield');
        open.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
      });
      atNightTime(NIGHT_FINE_AT, () => tap(fine));
      atNightTime(NIGHT_DARK_AT, () => {
        setPhase('nightDark');
        dark.value = withTiming(1, { duration: 450, easing: Easing.in(Easing.cubic) });
      });
      // Morning comes up out of the dark: the shield is gone under it, the clock has moved.
      atNightTime(NIGHT_MORNING_AT, () => {
        toMorning();
        dark.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
      });
    }
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
    if (demo.start) {
      at(START_AT, () => {
        tap(start);
        setStarted(true);
      });
    }
    if (method === 'place') at(DO_AT + PLACE_TAP_MS, () => tap(start));
    // The wake-up plays on a clock of its own, with a tap on each of its beats.
    at(DO_AT, () => {
      const began = Date.now();
      let beat = demo.beat(0)[0];
      setT(0);
      clock = setInterval(() => {
        const now = Math.min(demo.ms, Date.now() - began);
        setT(now);
        const [n, kind] = demo.beat(now);
        if (n !== beat) {
          beat = n;
          if (now < demo.ms) (kind === 'thud' ? haptic.thud : haptic.tick)();
        }
        if (now >= demo.ms) {
          clearInterval(clock);
          haptic.done();
        }
      }, FRAME_MS);
    });
    // His done line shows in the app for a beat, then it's back to Instagram.
    at(DO_AT + demo.ms + LIFT_AFTER_MS, () => {
      setPhase('awake');
      lift.value = withTiming(1, { duration: 480, easing: Easing.inOut(Easing.cubic) });
      announce();
    });
    return cleanup;
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

  // Only the app's screen changes per frame. The home screen and the feed are memoized, because
  // re-rendering the phone's icons and photos on every frame made the count stutter.
  const phone = useMemo(
    () =>
      phoneHeight > 0 ? (
        <Reveal>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Tilt width={phoneWidth} height={phoneHeight} still={reduced}>
              <Phone
                width={phoneWidth}
                clock={atNight && night ? night.clock : clock}
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
                dark={dark}
                appScreen={
                  <MethodApp
                    k={(phoneWidth * SCREEN.width) / SCREEN_PT.width}
                    method={method}
                    reps={reps}
                    demo={demo}
                    t={t}
                    started={started}
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
    [phoneWidth, phoneHeight, reduced, clock, phase, demo, shield, t, started, night, atNight, method, reps],
  );

  const awake = phase === 'awake';
  useEffect(() => {
    if (awake) onPayoff?.();
  }, [awake, onPayoff]);

  return (
    <View style={styles.wrap}>
      <Eyebrow>{atNight && night ? night.when : when}</Eyebrow>
      <Title>You reach for your phone.</Title>

      <View style={[styles.phoneArea, compact && styles.phoneAreaCompact]} onLayout={onArea}>
        {phone}
      </View>
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
  dark,
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
  dark: SharedNumber;
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
  const darkStyle = useAnimatedStyle(() => ({ opacity: dark.value }));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, banner.value * 1.5),
    // `k`, not `pt`: a plain function called on the UI thread throws, and kills a release build.
    transform: [{ translateY: (banner.value - 1) * 120 * k }, { scale: bannerPress.value }],
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
        {/* The screen switching off for the night, over everything, status bar too. */}
        <Animated.View pointerEvents="none" style={[styles.dark, darkStyle]} />
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
 * Locturne's morning, small, inside the phone: the method they picked, done the way the real
 * one is (src/features/home, src/features/wake), from `t` ms into it. Steps count, the stairs
 * move a dot down a flight and hold, the place walks a dot down a street to the pin and checks
 * in, the scan brings the code into the frame, and push-ups trace a body doing them.
 */
function MethodApp({
  k,
  method,
  reps,
  demo,
  t,
  started,
  start,
}: {
  k: number;
  method: WakeMethod;
  reps: number;
  demo: MethodDemo;
  t: number;
  started: boolean;
  start: SharedNumber;
}) {
  const done = t >= demo.ms;
  const going = t >= 0;
  switch (method) {
    case 'steps': {
      const steps = going ? stepsAt(t) : 0;
      return (
        <AppPage
          k={k}
          line={done ? PHASE_LINES.day : stepsLine(steps, STEP_GOAL).replace(/\*/g, '')}
          meter={{ value: String(steps), unit: ` / ${STEP_GOAL} steps`, progress: steps / STEP_GOAL }}
        />
      );
    }
    case 'downstairs': {
      const { height, held, left } = going ? stairsAt(t) : { height: 0, held: 0, left: HOLD_SECONDS };
      const holding = height >= 1;
      // Home listens as soon as it shows the morning: no Start (use-morning-stairs.ts).
      const status = done ? 'met' : holding ? 'holding' : going ? 'moving' : 'waiting';
      return (
        <AppPage
          k={k}
          line={done ? PHASE_LINES.day : downstairsLine(status, height)}
          meter={{
            value: (height * DOWNSTAIRS.threshold).toFixed(1),
            unit: done ? ' m · Floor reached' : holding ? ` m · Hold ${left} s` : ` / ${DOWNSTAIRS.threshold} m down`,
            progress: holding ? held : height,
          }}
        >
          <Stairs k={k} height={height} />
        </AppPage>
      );
    }
    case 'place': {
      const walked = going ? easeInOut(Math.min(1, t / PLACE_WALK_MS)) : 0;
      const here = walked >= 1;
      const line = done
        ? PHASE_LINES.day
        : here
          ? 'You’re here. Tap Check in.'
          : walked >= 0.4
            ? 'Fresh air. I hate it.'
            : 'Out the door. I’m coming, apparently.';
      return (
        <AppPage
          k={k}
          line={line}
          meter={{
            value: here ? 'Here' : formatDistance(PLACE_FROM_M * (1 - walked), usesMiles()),
            unit: here ? '' : ' to your place',
            progress: walked,
          }}
          button={here && !done ? 'Check in' : undefined}
          press={start}
        >
          <StreetMap k={k} walked={walked} />
        </AppPage>
      );
    }
    case 'scan':
      if (!started)
        return (
          <AppPage k={k} line="Go find your code. Only yours counts." button={demo.start} press={start}>
            <View style={{ opacity: 0.9 }}>
              <QrCode data={DEMO_CODE} size={k * 150} />
            </View>
          </AppPage>
        );
      return <ScanCamera k={k} found={going ? easeInOut(Math.min(1, t / SCAN_FIND_MS)) : 0} done={done} />;
    case 'pushups': {
      if (!started)
        return (
          <AppPage
            k={k}
            line={pushupsLine('idle', 0, reps, null).replace(/\*/g, '')}
            meter={{ value: '0', unit: ` / ${reps} push-ups`, progress: 0 }}
            button={demo.start}
            press={start}
          />
        );
      const each = repMs(reps);
      const count = going ? Math.min(reps, Math.floor(t / each)) : 0;
      return (
        <PushupsCamera
          k={k}
          // The pretend body's own clock (pose-demo.ts), sped up so a rep takes `each`.
          poseMs={going && !done ? (t / each) * DEMO_REP_MS : 0}
          count={count}
          goal={reps}
          line={done ? PHASE_LINES.day : pushupsLine('counting', count, reps, null).replace(/\*/g, '')}
        />
      );
    }
  }
}

/** A code for the demo's scan: never anyone's real one. */
const DEMO_CODE = 'LOCTURNE-DEMO';

/** The app's page: his line at the top, the method's picture, the meter, and its button if it has one. */
function AppPage({
  k,
  line,
  meter,
  button,
  press,
  children,
}: {
  k: number;
  line: string;
  meter?: { value: string; unit: string; progress: number };
  button?: string;
  press?: SharedNumber;
  children?: ReactNode;
}) {
  const pt = (n: number) => n * k;
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press?.value ?? 1 }] }));
  return (
    <View style={[styles.wakeApp, { paddingHorizontal: pt(24), paddingTop: pt(110), paddingBottom: pt(60) }]}>
      <Text style={[styles.wakeLine, { fontSize: pt(32), lineHeight: pt(35) }]} maxFontSizeMultiplier={1}>
        {line}
      </Text>
      <View style={styles.picture}>{children}</View>
      {meter ? (
        <>
          <Text style={[styles.wakeCount, { fontSize: pt(64), lineHeight: pt(70) }]} maxFontSizeMultiplier={1}>
            {meter.value}
            <Text style={[styles.wakeUnit, { fontSize: pt(18) }]}>{meter.unit}</Text>
          </Text>
          <View style={[styles.track, { height: pt(6), marginTop: pt(12) }]}>
            <View style={[styles.fill, { width: `${Math.min(1, meter.progress) * 100}%` }]} />
          </View>
        </>
      ) : null}
      <View style={{ height: pt(54), marginTop: pt(28) }}>
        {button ? (
          <Animated.View style={[styles.shieldPrimary, { flex: 1, borderRadius: pt(27) }, pressStyle]}>
            <Text style={[styles.shieldPrimaryText, { fontSize: pt(18) }]} maxFontSizeMultiplier={1}>
              {button}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** A flight of four steps, side-on, and you on it: `height` is 0 at the top to 1 at the bottom. */
function Stairs({ k, height }: { k: number; height: number }) {
  const FLIGHTS = 4;
  const run = 52;
  const rise = 34;
  const level = Math.min(FLIGHTS, Math.floor(height * FLIGHTS));
  const along = level >= FLIGHTS ? 0 : height * FLIGHTS - level;
  // Along each tread, then a hop down its edge at the end.
  const x = 40 + (level + along) * run;
  const y = 30 + level * rise + (along > 0.75 ? ((along - 0.75) / 0.25) * rise : 0) - 12;
  let d = 'M10 30';
  for (let i = 0; i <= FLIGHTS; i++) d += ` H${40 + (i + 1) * run - 4}` + (i < FLIGHTS ? ` V${30 + (i + 1) * rise}` : '');
  return (
    <Svg width={k * 300} height={k * 200} viewBox="0 0 300 200">
      <Path d={d} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={4} fill="none" strokeLinejoin="round" />
      <Circle cx={x} cy={y} r={10} fill="#FFFFFF" />
    </Svg>
  );
}

/** The way to the place, as Maps draws it at night: blocks, the route, you, and the pin. */
const ROUTE: [number, number][] = [
  [62, 196],
  [62, 122],
  [176, 122],
  [176, 48],
  [246, 48],
];
function routeAt(walked: number): [number, number] {
  const legs = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
  let left = walked * legs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < legs.length; i++) {
    if (left <= legs[i] || i === legs.length - 1) {
      const f = Math.min(1, left / legs[i]);
      return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * f, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * f];
    }
    left -= legs[i];
  }
  return ROUTE[ROUTE.length - 1];
}
function StreetMap({ k, walked }: { k: number; walked: number }) {
  const [x, y] = routeAt(walked);
  const pin = ROUTE[ROUTE.length - 1];
  return (
    <View style={[styles.map, { width: k * 340, height: k * 240, borderRadius: k * 22 }]}>
      <Svg width="100%" height="100%" viewBox="0 0 300 240">
        {[48, 122, 196].map((sy) => (
          <Line key={`h${sy}`} x1={0} y1={sy} x2={300} y2={sy} stroke="#2D3444" strokeWidth={12} />
        ))}
        {[62, 176, 268].map((sx) => (
          <Line key={`v${sx}`} x1={sx} y1={0} x2={sx} y2={240} stroke="#2D3444" strokeWidth={12} />
        ))}
        <Polyline points={ROUTE.map((p) => p.join(',')).join(' ')} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={4} fill="none" strokeLinejoin="round" />
        {/* The pin: a white drop with a dark dot. */}
        <Path d={`M${pin[0]} ${pin[1]} c-9 -12 -14 -18 -14 -25 a14 14 0 1 1 28 0 c0 7 -5 13 -14 25z`} fill="#FFFFFF" />
        <Circle cx={pin[0]} cy={pin[1] - 25} r={5} fill={Nocturne.bg} />
        {/* You, as Maps marks you. */}
        <Circle cx={x} cy={y} r={9} fill="#0A84FF" stroke="#FFFFFF" strokeWidth={3} />
      </Svg>
    </View>
  );
}

/** The scan's camera: the code comes into the frame as they walk up to it (`found`), then reads. */
function ScanCamera({ k, found, done }: { k: number; found: number; done: boolean }) {
  const pt = (n: number) => n * k;
  const read = found >= 1;
  const frame = pt(read ? 230 : 250);
  const code = pt(70 + 150 * found);
  const corner = pt(34);
  return (
    <View style={styles.camera}>
      {/* The kitchen wall the code is stuck to, coming closer. */}
      <View style={[styles.wall, { transform: [{ translateX: pt(60 * (1 - found)) }, { translateY: pt(-110 * (1 - found)) }] }]}>
        <View style={{ padding: pt(8 + 10 * found), backgroundColor: '#FFFFFF', borderRadius: pt(4) }}>
          <QrCode data={DEMO_CODE} size={code} />
        </View>
      </View>
      {/* The finder's four corners, closing on the code once it reads. */}
      <View style={[styles.finder, { width: frame, height: frame }]}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <View
            key={c}
            style={[
              styles.corner,
              { width: corner, height: corner, borderColor: '#FFFFFF', opacity: read ? 1 : 0.7, borderRadius: pt(6) },
              c[0] === 't' ? { top: 0, borderTopWidth: pt(5) } : { bottom: 0, borderBottomWidth: pt(5) },
              c[1] === 'l' ? { left: 0, borderLeftWidth: pt(5) } : { right: 0, borderRightWidth: pt(5) },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.cameraLine, { top: pt(110), fontSize: pt(30), lineHeight: pt(34), paddingHorizontal: pt(24) }]} maxFontSizeMultiplier={1}>
        {done ? PHASE_LINES.day : read ? 'That’s the one.' : 'Point me at your code.'}
      </Text>
    </View>
  );
}

/** The push-ups camera: you traced in white over a dark room, the count big at the top. */
function PushupsCamera({ k, poseMs, count, goal, line }: { k: number; poseMs: number; count: number; goal: number; line: string }) {
  const pt = (n: number) => n * k;
  const w = SCREEN_PT.width;
  const h = SCREEN_PT.height;
  const joints = demoPose(poseMs, w, h);
  const p = (j: Joint) => joints[j];
  const floor = Math.max(p('leftWrist')?.y ?? 0, p('leftAnkle')?.y ?? 0) + 6;
  const nose = p('nose');
  return (
    <View style={styles.camera}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={floor} width={w} height={h - floor} fill="#14161C" />
        {BONES.map(([a, b]) => {
          const from = p(a);
          const to = p(b);
          return from && to ? (
            <Line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
          ) : null;
        })}
        {nose ? <Circle cx={nose.x} cy={nose.y} r={15} stroke="#FFFFFF" strokeWidth={5} fill="none" /> : null}
      </Svg>
      <Text style={[styles.cameraCount, { top: pt(96), fontSize: pt(96), lineHeight: pt(104) }]} maxFontSizeMultiplier={1}>
        {count}
        <Text style={[styles.wakeUnit, { fontSize: pt(22) }]}>{` / ${goal}`}</Text>
      </Text>
      <Text style={[styles.cameraLine, { bottom: pt(90), fontSize: pt(28), lineHeight: pt(32), paddingHorizontal: pt(24) }]} maxFontSizeMultiplier={1}>
        {line}
      </Text>
    </View>
  );
}

/** The near side's bones, as pose-overlay.tsx draws them: arm, torso, leg. */
const BONES: [Joint, Joint][] = [
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['leftShoulder', 'leftHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
];

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
  wakeUnit: { color: Nocturne.text2, fontWeight: '500' },

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

  track: { width: '100%', borderRadius: 3, backgroundColor: Nocturne.track, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Nocturne.text },
  picture: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { overflow: 'hidden', backgroundColor: '#1C2230' },
  camera: { flex: 1, backgroundColor: '#0B0C10', alignItems: 'center', justifyContent: 'center' },
  wall: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  finder: { position: 'absolute' },
  corner: { position: 'absolute' },
  cameraLine: { ...DisplayFont, position: 'absolute', left: 0, right: 0, color: Nocturne.text, textAlign: 'center' },
  cameraCount: { ...NUMBER_FONT, position: 'absolute', left: 0, right: 0, color: Nocturne.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  dark: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
});
