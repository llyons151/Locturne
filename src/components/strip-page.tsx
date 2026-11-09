import { router } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PANEL_RADIUS, tabStripHeight } from '@/components/app-tabs';
import { HOME_RISE_MS, MOON_GONE, MOON_SHOWS_FROM, moonRest, moonSink } from '@/components/night-sky';
import { homeEntrance, HIDE_FADE_MS } from '@/features/home/entrance';
import { locAway, tabPagesShown, tabsShown } from '@/features/moons/moons-cover';

/**
 * Two steps, one after the other (user, 2026-11-01: "I want to see everything fade out before it
 * swipes up"). Everything on the tabs fades, and Loc pops down, first…
 */
const FADE_MS = HIDE_FADE_MS;
/** …then, once it's all gone, the strip slides up into the page… */
const UP_AT = FADE_MS + 60;
const UP_MS = 520;
/** …and what's on it comes in as it lands. */
const SHOW_AT = UP_AT + 360;
const SHOW_MS = 260;
/** Going, backwards: the contents go, the page slides down into the strip, then the tabs fade back. */
const HIDE_MS = 160;
// A touch slower than the way up: at 460 the drop felt abrupt (user, 2026-11-02).
const DOWN_MS = 560;
const BACK_MS = 320;
/** The moon drops out of sight with the fade, and rises back with the tabs once the page has gone. */
const MOON_DROP_MS = FADE_MS;
const MOON_RISE_MS = HOME_RISE_MS;

/**
 * How many strip pages are up. One opened over another (the moons from Settings) only slides up:
 * the tabs are already faded and Loc already down, and closing it mustn't bring them back under
 * the page still open.
 */
let openPages = 0;

/**
 * A page grown up out of the tab strip (the moons, user 2026-11-01; Settings, 2026-11-02): opening
 * it, everything on the tabs fades, the moon drops away, Loc pops down, and the black strip under
 * them slides up to fill the screen with `children` on it. Closing runs it backwards: the page goes
 * first, then it all comes back. Drawn over a transparent modal with no navigator animation, so the
 * strip itself seems to grow. `children` gets the close that plays it backwards.
 */
export function StripPage({ background, children }: { background: string; children: (close: () => void) => ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const strip = tabStripHeight(insets.bottom);
  // 0 = the strip, 1 = the whole screen.
  const up = useSharedValue(reduced ? 1 : 0);
  // What's on it: 0 hidden, 1 shown.
  const shown = useSharedValue(reduced ? 1 : 0);
  const leaving = useRef(false);
  // Where the moon rests on the tab under the page (Home: in view; other tabs: out of sight). Its
  // resting place, not `moonSink.get()`: mid-rise that reads half sunk, and the moon came back there.
  const rest = useRef(moonRest.value);
  // Over another strip page: the cover's already on, and it stays on when this one goes.
  const nested = useRef(openPages > 0);

  useEffect(() => {
    openPages += 1;
    const was = rest.current;
    if (!nested.current) {
      locAway.set(true);
      // Home's pieces fade in SwiftUI, on Home's own entrance (entrance.ts); the strip's buttons and
      // any other tab under the page fade here.
      homeEntrance.fadeOut();
      tabsShown.set(reduced ? 0 : withTiming(0, { duration: FADE_MS }));
      tabPagesShown.set(reduced ? 0 : withTiming(0, { duration: FADE_MS }));
      if (was < MOON_SHOWS_FROM) moonSink.set(reduced ? MOON_GONE : withTiming(MOON_GONE, { duration: MOON_DROP_MS, easing: Easing.in(Easing.cubic) }));
    }
    if (!reduced) {
      // Over another page there's nothing to fade first: straight up.
      const at = nested.current ? 0 : UP_AT;
      up.set(withDelay(at, withTiming(1, { duration: UP_MS, easing: Easing.out(Easing.cubic) })));
      shown.set(withDelay(at + SHOW_AT - UP_AT, withTiming(1, { duration: SHOW_MS })));
    }
    return () => {
      openPages -= 1;
      // Gone some other way than `close` (the web's back button): the tabs come straight back.
      if (leaving.current || nested.current) return;
      homeEntrance.play();
      tabsShown.set(1);
      tabPagesShown.set(1);
      locAway.set(false);
      if (was < MOON_SHOWS_FROM) moonSink.set(was);
    };
  }, [reduced, up, shown]);

  const close = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    const was = rest.current;
    const cover = !nested.current;
    if (reduced) {
      if (cover) {
        homeEntrance.play();
        tabsShown.set(1);
        tabPagesShown.set(1);
        locAway.set(false);
        if (was < MOON_SHOWS_FROM) moonSink.set(was);
      }
      return leave();
    }
    shown.set(withTiming(0, { duration: HIDE_MS }));
    up.set(
      withDelay(
        HIDE_MS / 2,
        withTiming(0, { duration: DOWN_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
          if (done) runOnJS(leave)();
        }),
      ),
    );
    if (!cover) return;
    // The tab under it is whole again before the page starts down: it's revealed, not faded in.
    tabPagesShown.set(1);
    // Only once the page is all the way down does anything come back: the tabs fade in, the moon
    // (a new one, if one was picked) rises, and Loc pops up (user, 2026-11-01).
    const home = HIDE_MS / 2 + DOWN_MS;
    tabsShown.set(withDelay(home, withTiming(1, { duration: BACK_MS })));
    if (was < MOON_SHOWS_FROM) {
      moonSink.set(MOON_SHOWS_FROM);
      moonSink.set(withDelay(home, withTiming(was, { duration: MOON_RISE_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) })));
    }
    setTimeout(() => {
      // Home's pieces come back into focus, its entrance's own way.
      homeEntrance.play();
      locAway.set(false);
    }, home);
  }, [reduced, up, shown]);

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(up.value, [0, 1], [height - strip, 0]) }] }));
  const contents = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: interpolate(shown.value, [0, 1], [12, 0]) }],
  }));

  return (
    <Animated.View style={[styles.panel, { height, backgroundColor: background }, panel]}>
      <Animated.View style={[styles.fill, contents]}>{children(close)}</Animated.View>
    </Animated.View>
  );
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    overflow: 'hidden',
  },
  fill: { flex: 1 },
});
