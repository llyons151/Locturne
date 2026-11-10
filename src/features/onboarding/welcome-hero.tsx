import { Image } from 'expo-image';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Reveal } from '@/components/motion';
import { Text } from '@/components/text';
import { DISPLAY_MAX_SCALE, DisplayFont, Nocturne, Space } from '@/theme';

import { OPENER_EXIT_EASING, OPENER_EXIT_MS, useLeaving } from './ui';

/**
 * The opener, after Jomo's welcome (user 2026-11-07, docs/WELCOME_SCREEN.md "Round 4"): the real
 * Home on a 3D iPhone, the cratered crescent hanging off its left edge, the phone fading into black
 * above the words. Every number below is in points of a 390pt-wide screen, measured off the
 * mockup the user signed off (docs/design-references/welcome-jomo.html), and scaled to the
 * screen's width.
 *
 * Leaving it (Get started): "Blur through", option 1 of the ten (user 2026-11-07,
 * welcome-transitions.html). Everything fades and the night sky comes up under the next page's
 * words. The mockup also blurred it; blur never drew on iPhone, so here the phone and moon sink
 * back a touch as they fade instead (timings and curve: `OPENER_EXIT_MS` in ui.tsx).
 */

const PHONE = require('@/assets/onboarding/welcome-phone.webp');
const MOON = require('@/assets/onboarding/welcome-moon.webp');
const GLOW = require('@/assets/onboarding/welcome-moon-glow.webp');
/** The phone render's width over its height (Locturne Home, captured, on the store shots' 3D iPhone). */
const PHONE_RATIO = 1080 / 2221;

/** The mockup's layout, in points at 390 wide. */
const M = {
  phoneTop: 133,
  phoneWidth: 336,
  /** From the phone's top to where the fade starts: the Home's "Tomorrow" pill sits just above it. */
  phoneToFade: 329,
  /** From the fade's start to the headline's top. */
  fadeToWords: 104,
  /** The fade: see-through at its top, 80% black this far down, solid black this far down. */
  fadeMid: 53,
  fadeEnd: 100,
  // The crescent and its glow, from the phone's top-left corner.
  moon: { dx: -57, dy: 159, size: 132 },
  glow: { dx: -97, dy: 119, size: 212 },
  tilt: '-16deg',
};

/** When the words look again for where they landed (see `WelcomeWords`). */
const REMEASURE_MS = [120, 300, 600, 1000];

/** The black under the phone fades a little slower, so the sky comes up as the next page comes in. */
const BACKDROP_EXIT_MS = 640;
/** How far the phone and moon shrink back as they leave, standing in for the mockup's blur. */
const EXIT_SHRINK = 0.03;
/** Arriving: one ease-out with no overshoot (the user's "clean, not bouncy", 2026-11-07). */
const ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);

// Where the headline landed on screen, so the phone's fade can sit just above it on every
// iPhone. The words are in the page and the phone is behind it, so they meet here.
let wordsTop = 0;
const listeners = new Set<() => void>();
function setWordsTop(top: number) {
  if (Math.abs(top - wordsTop) < 0.5) return;
  wordsTop = top;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getWordsTop = () => wordsTop;

/**
 * The phone, the moon and the black behind them, drawn by the flow between the sky and the
 * page while `hello` is up. Opacity and transforms only, so it stays smooth on iOS.
 */
export function WelcomeHero({ shown }: { shown: boolean }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const top = useSyncExternalStore(subscribe, getWordsTop, getWordsTop);
  const k = width / 390;

  // The fade starts above the words; the phone hangs down to it. On a short screen (SE) the
  // phone would run up under the clock, so it's pinned under the status bar and drawn smaller.
  const fadeAt = top - M.fadeToWords * k;
  const highest = insets.top + 8;
  const fits = fadeAt - M.phoneToFade * k >= highest;
  const scale = fits ? 1 : Math.max(0.6, (fadeAt - highest) / (M.phoneToFade * k));
  const phoneTop = fits ? fadeAt - M.phoneToFade * k : highest;
  const phoneWidth = M.phoneWidth * k * scale;
  const phoneLeft = (width - phoneWidth) / 2;
  const u = k * scale;
  const below = Math.max(1, height - fadeAt);

  // The backdrop shows at once (the sky must never flash first); the phone and moon come in.
  const backdrop = useSharedValue(shown ? 1 : 0);
  const phone = useSharedValue(reduced ? 1 : 0);
  const moon = useSharedValue(reduced ? 1 : 0);
  const glow = useSharedValue(reduced ? 1 : 0);
  const measured = top > 0;
  useEffect(() => {
    if (!measured) return;
    if (!shown) {
      const out = (ms: number) => withTiming(0, { duration: reduced ? 200 : ms, easing: OPENER_EXIT_EASING });
      backdrop.set(out(BACKDROP_EXIT_MS));
      phone.set(out(OPENER_EXIT_MS));
      moon.set(out(OPENER_EXIT_MS));
      glow.set(out(OPENER_EXIT_MS));
      return;
    }
    backdrop.set(1);
    if (reduced) {
      phone.set(1);
      moon.set(1);
      glow.set(1);
      return;
    }
    phone.set(0);
    moon.set(0);
    glow.set(0);
    phone.set(withTiming(1, { duration: 900, easing: ENTER_EASING }));
    moon.set(withDelay(350, withTiming(1, { duration: 900, easing: ENTER_EASING })));
    glow.set(withDelay(500, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) })));
  }, [shown, measured, reduced, backdrop, phone, moon, glow]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  // Leaving, the phone, moon and glow shrink back as one (so the moon stays on the phone's edge).
  const groupStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shown || reduced ? 1 : 1 - (1 - phone.get()) * EXIT_SHRINK }],
  }));
  // Leaving, the parts fade where they are; arriving, the phone rises 40pt and the moon slides 18pt in from the left.
  const phoneStyle = useAnimatedStyle(() => ({
    opacity: phone.get(),
    transform: [{ translateY: shown ? (1 - phone.get()) * 40 * k : 0 }],
  }));
  const moonStyle = useAnimatedStyle(() => ({
    opacity: moon.get(),
    transform: [{ translateX: shown ? (1 - moon.get()) * -18 * k : 0 }, { rotate: M.tilt }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get(), transform: [{ rotate: M.tilt }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, styles.black, backdropStyle]}>
        {measured ? (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, groupStyle]}>
              <Animated.View style={[styles.at, { left: phoneLeft, top: phoneTop, width: phoneWidth, height: phoneWidth / PHONE_RATIO }, phoneStyle]}>
                <Image source={PHONE} style={StyleSheet.absoluteFill} contentFit="contain" />
              </Animated.View>
              <Animated.View
                style={[styles.at, { left: phoneLeft + M.glow.dx * u, top: phoneTop + M.glow.dy * u, width: M.glow.size * u, height: M.glow.size * u }, glowStyle]}
              >
                <Image source={GLOW} style={StyleSheet.absoluteFill} contentFit="contain" />
              </Animated.View>
              <Animated.View
                style={[styles.at, { left: phoneLeft + M.moon.dx * u, top: phoneTop + M.moon.dy * u, width: M.moon.size * u, height: M.moon.size * u }, moonStyle]}
              >
                <Image source={MOON} style={StyleSheet.absoluteFill} contentFit="contain" />
              </Animated.View>
            </Animated.View>
            <Svg style={[styles.at, { left: 0, top: fadeAt, width, height: below }]} width={width} height={below}>
              <Defs>
                <LinearGradient id="welcome-fade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity={0} />
                  <Stop offset={Math.min(0.99, (M.fadeMid * k) / below)} stopColor="#000000" stopOpacity={0.8} />
                  <Stop offset={Math.min(1, (M.fadeEnd * k) / below)} stopColor="#000000" stopOpacity={1} />
                  <Stop offset="1" stopColor="#000000" stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={width} height={below} fill="url(#welcome-fade)" />
            </Svg>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

/**
 * The opener's words under the phone: the bold promise and one small line (user 2026-11-07: less
 * wordy, no icon, the line a little smaller). Reports where it sits so the phone's fade meets it.
 */
export function WelcomeWords({ head, sub, delay }: { head: string; sub: string; delay: number }) {
  const reduced = useReducedMotion();
  const leaving = useLeaving();
  const ref = useRef<View>(null);
  // A resized window (the web preview) moves the words without resizing them, so look again then too.
  const { width, height } = useWindowDimensions();
  const there = useSharedValue(1);
  useEffect(() => {
    if (leaving) there.set(withTiming(0, { duration: reduced ? 200 : OPENER_EXIT_MS, easing: OPENER_EXIT_EASING }));
  }, [leaving, reduced, there]);
  const fade = useAnimatedStyle(() => ({ opacity: there.get() }));
  const measure = () => ref.current?.measureInWindow((_x, y) => y > 0 && setWordsTop(y));
  // Its own layout fires once, but the page around it settles after (the footer, the fonts), which
  // moves it without resizing it: look again while the phone is still fading in.
  useEffect(() => {
    const timers = REMEASURE_MS.map((ms) => setTimeout(() => ref.current?.measureInWindow((_x, y) => y > 0 && setWordsTop(y)), ms));
    return () => timers.forEach(clearTimeout);
  }, [width, height]);
  return (
    <Animated.View style={[styles.words, fade]} onLayout={measure}>
      <View ref={ref} onLayout={measure} style={styles.wordsInner}>
        <Reveal delay={delay}>
          <Text style={styles.head} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
            {head}
          </Text>
        </Reveal>
        <Reveal delay={delay + 120}>
          <Text style={styles.sub}>{sub}</Text>
        </Reveal>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  black: { backgroundColor: '#000000' },
  at: { position: 'absolute' },
  words: { alignSelf: 'stretch', alignItems: 'center' },
  wordsInner: { alignSelf: 'stretch', alignItems: 'center', gap: Space.m },
  // Jomo's welcome type: a bold 28pt two-line promise, a small semibold line under it.
  head: { ...DisplayFont, color: Nocturne.text, fontSize: 28, lineHeight: 33, letterSpacing: -0.4, textAlign: 'center' },
  sub: { color: Nocturne.text, fontSize: 14.5, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
});
