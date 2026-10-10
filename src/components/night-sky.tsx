import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';


/**
 * Every onboarding screen sits under the same night sky: blue light from the
 * top-right corner, seen through frosted glass and fading to black. The blur and
 * frost are baked into the image so the bottom stays true black. The moon itself
 * is a separate layer (below) so it can move.
 */
const MOON_TOP = 64;

/** Legacy spacing for "featured" screens: their content starts this far down. */
export const moonSize = (width: number) => Math.min(width * 0.52, 260);

/** Where featured screens start their content, clear of the light at the top. */
export const moonBottom = (width: number) => MOON_TOP + moonSize(width);

/**
 * The sky image's pixel size, and where its moon sat before it was painted out
 * (measured from its edge). The moon is now its own layer at that spot, so the opener's
 * moon and the corner moon are the same image.
 */
const SKY = { width: 590, height: 1278 };
const BAKED_MOON = { cx: 624, cy: -40, r: 217 };

/** How long the moon takes to move between the opener and its resting place. */
export const FLIGHT_MS = 1400;

/**
 * Where the moon rests after the opener. Being auditioned:
 * - 'top': tucked into the top-right corner, where the sky's light comes from.
 * - 'bottom': rising out of the bottom of the screen with a glow around it (the user asked
 *   for this glow), under a sky flipped so its light comes from below.
 */
const MOON_REST: 'top' | 'bottom' = 'bottom';

/** moon-glow.png: the moon's disc is half the image's width, with its glow around it. */
const GLOW_PAD = 2;

/**
 * moon-frosted.png is moon.webp recoloured to the sky's moon and lightly blurred, with
 * room around it for the blur: the moon's disc is 2/3 of the image's width.
 */
const FROST_PAD = 1.5;

/** Where the baked moon lands on screen, given the image is cover-fit to the top right. */
function bakedMoon(width: number, height: number) {
  const scale = Math.max(width / SKY.width, height / SKY.height);
  const r = BAKED_MOON.r * scale;
  return {
    left: width - (SKY.width - BAKED_MOON.cx) * scale - r,
    top: BAKED_MOON.cy * scale - r,
    size: r * 2,
  };
}

/** Rising out of the bottom: centred, with the top part of the disc showing. */
function risingMoon(width: number, height: number) {
  const size = width * 0.9;
  return { left: (width - size) / 2, top: height - size * 0.36, size };
}

/**
 * The resting moon's disc (centre and radius, in window points), so other layers can land
 * things on its surface. Only meaningful while the moon rests at the bottom.
 */
export function restingMoonDisc(width: number, height: number) {
  const m = risingMoon(width, height);
  return { cx: m.left + m.size / 2, cy: m.top + m.size / 2, r: m.size / 2 };
}

/**
 * How far the resting moon has sunk into the floor, 0 (resting) to 1 (sunk). A tab with a
 * card over the bottom of the page sinks it, so the card sits on calm, dark sky instead of
 * having moonlight leak round its corners (user's ask, 2026-10-09; every tab but Home since
 * 2026-10-10). Set by useMoonSink in Home.
 */
export const moonSink = makeMutable(0);
/** How much of the moon's width it drops when sunk, and how much of its glow stays. */
const SINK_DEPTH = 0.3;
const SUNK_GLOW = 0.25;

/** How long the moon takes to rise over the home screen, or sink back when leaving it. */
export const HOME_RISE_MS = 1100;

/** Room above the home screen's moon for its header row (wordmark, day, settings). */
export const HOME_HEADER = 52;

/**
 * The home screen's moon: risen to the top, under the header.
 * Smaller on short phones so the whole screen fits without scrolling.
 */
export function homeMoonDisc(width: number, height: number, insetTop: number) {
  const r = Math.min(width * 0.27, height * 0.12, 115);
  return { cx: width / 2, cy: insetTop + HOME_HEADER + 20 + r, r };
}

function homeMoon(width: number, height: number, insetTop: number) {
  const d = homeMoonDisc(width, height, insetTop);
  return { left: d.cx - d.r, top: d.cy - d.r, size: d.r * 2 };
}

/** The opener's moon: big, centred in the upper part of the screen, above the text. */
function heroMoon(width: number, height: number) {
  const size = Math.min(width * 0.72, height * 0.34);
  return { left: (width - size) / 2, top: height * 0.32 - size / 2, size };
}

/** How long the moon takes to rise into, or sink out of, the quiz. */
export const QUIZ_RISE_MS = 900;

/** Height of the onboarding top bar (back button, progress, Exit); see Shell. */
const TOP_BAR = 50;

/** Clear sky kept above the quiz moon's curve. */
const QUIZ_HEADROOM = 56;

/**
 * Where the quiz moon's top edge sits: clear of the top bar,
 * about a quarter of the way down, like Headspace's "What's on your mind?" screen.
 */
export function quizArcTop(height: number, insetTop: number) {
  return Math.max(insetTop + TOP_BAR + QUIZ_HEADROOM + 16, height * 0.26);
}

/** The quiz moon: far wider than the screen, so its top reads as a gentle curve. */
function quizMoon(width: number, height: number, insetTop: number) {
  const size = width * 2.6;
  // The frosted disc's edge is soft; start the disc a little above the arc so the arc lands there.
  return { left: (width - size) / 2, top: quizArcTop(height, insetTop) - 12, size };
}

/** Where content on the quiz moon starts, measured from the top of the onboarding body. */
export function quizContentTop(height: number, insetTop: number) {
  return quizArcTop(height, insetTop) - insetTop - TOP_BAR + 40;
}

/**
 * One sky and one moon for all of onboarding. On the opener the moon is big and centred;
 * when the user moves on it flies to its resting place (MOON_REST), resizing as it
 * goes, and stays there for every later screen. Going back to the opener plays it in reverse.
 * On quiz questions (`quiz`) it rises until its curve fills the bottom of the screen and
 * the options sit on it.
 */
export function NightSky({
  opening = false,
  quiz = false,
  home = false,
  floor = 0,
}: {
  opening?: boolean;
  quiz?: boolean;
  /**
   * How far above the screen's bottom the sky ends (the tabs' panel stops above the tab
   * strip): the resting moon rises out of that edge instead, so its light stays in view.
   */
  floor?: number;
  /** The home screen: the moon rises out of the bottom into full view. */
  home?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // 0 = the opener's big moon, 1 = settled into the sky.
  const progress = useSharedValue(opening ? 0 : 1);
  // 0 = wherever `progress` puts it, 1 = risen for the quiz.
  const risen = useSharedValue(quiz ? 1 : 0);
  // 0 = wherever the above put it, 1 = risen over the home screen. Starts low so it rises on launch.
  const homed = useSharedValue(0);

  useEffect(() => {
    const target = opening ? 0 : 1;
    progress.value = reduced
      ? target
      : withTiming(target, { duration: FLIGHT_MS, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  }, [opening, reduced, progress]);

  useEffect(() => {
    const target = quiz ? 1 : 0;
    risen.value = reduced
      ? target
      : withTiming(target, { duration: QUIZ_RISE_MS, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  }, [quiz, reduced, risen]);

  useEffect(() => {
    const target = home ? 1 : 0;
    homed.value = reduced
      ? target
      : withTiming(target, { duration: HOME_RISE_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) });
  }, [home, reduced, homed]);

  const from = heroMoon(width, height);
  const to = MOON_REST === 'bottom' ? risingMoon(width, height - floor) : bakedMoon(width, height);
  const up = quizMoon(width, height, insets.top);
  const high = homeMoon(width, height, insets.top);

  /** The moon's disc right now: opener → resting place, then on to the quiz or home screen. */
  const disc = (p: number, q: number, h: number) => {
    'worklet';
    const size = interpolate(p, [0, 1], [from.size, to.size]);
    const left = interpolate(p, [0, 1], [from.left, to.left]);
    const top = interpolate(p, [0, 1], [from.top, to.top]);
    const qSize = interpolate(q, [0, 1], [size, up.size]);
    const qLeft = interpolate(q, [0, 1], [left, up.left]);
    const qTop = interpolate(q, [0, 1], [top, up.top]);
    return {
      size: interpolate(h, [0, 1], [qSize, high.size]),
      left: interpolate(h, [0, 1], [qLeft, high.left]),
      top: interpolate(h, [0, 1], [qTop, high.top]),
    };
  };

  const moonStyle = useAnimatedStyle(() => {
    const d = disc(progress.value, risen.value, homed.value);
    const inset = (d.size * (FROST_PAD - 1)) / 2;
    return {
      left: d.left - inset,
      top: d.top - inset + moonSink.value * d.size * SINK_DEPTH,
      width: d.size * FROST_PAD,
      height: d.size * FROST_PAD,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const d = disc(progress.value, risen.value, homed.value);
    const inset = (d.size * (GLOW_PAD - 1)) / 2;
    return {
      left: d.left - inset,
      top: d.top - inset + moonSink.value * d.size * SINK_DEPTH,
      width: d.size * GLOW_PAD,
      height: d.size * GLOW_PAD,
      opacity: progress.value * interpolate(moonSink.value, [0, 1], [1, SUNK_GLOW]),
    };
  });

  return (
    // Clipped: the risen moon's glow runs past the screen edges, which on the web widens and
    // scrolls the page (iOS clips at the screen anyway).
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Image
        source={require('@/assets/onboarding/night-sky-moonless.png')}
        style={[StyleSheet.absoluteFill, MOON_REST === 'bottom' && styles.flipped]}
        contentFit="cover"
        contentPosition="top right"
        accessible={false}
      />
      {MOON_REST === 'bottom' ? (
        <Animated.View style={[styles.moon, glowStyle]}>
          <Image
            source={require('@/assets/onboarding/moon-glow.png')}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessible={false}
          />
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.moon, moonStyle]}>
        <Image
          source={require('@/assets/onboarding/moon-frosted.png')}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          accessible={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  moon: { position: 'absolute' },
  flipped: { transform: [{ scaleY: -1 }] },
});
