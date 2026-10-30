import { Image } from 'expo-image';
import { useEffect, useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMoon } from '@/features/moons/moon-theme';
import type { MoonDef } from '@/features/moons/moon-types';

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

/** The opener's sky drift: a quarter of its sway's cycle, how far it sways, and how much it grows so its edges stay off screen. */
const DRIFT_MS = 9000;
const DRIFT_X = 14;
const DRIFT_GROW = 0.08;

/** moon-glow.png: the moon's disc is half the image's width, with its glow around it. */
const GLOW_PAD = 2;

/**
 * moon-frosted.png is moon.webp recoloured to the sky's moon and lightly blurred, with
 * room around it for the blur: the moon's disc is 2/3 of the image's width.
 */
export const FROST_PAD = 1.5;

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
/** How much of the resting moon's width shows above the floor. */
const MOON_SHOWS = 0.36;

function risingMoon(width: number, height: number) {
  const size = width * 0.9;
  return { left: (width - size) / 2, top: height - size * MOON_SHOWS, size };
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
 * How far the resting moon has sunk into the floor, 0 (resting) to 1 (sunk), or below 0 to
 * raise it (MOON_RAISED). A tab with a
 * card over the bottom of the page sinks it, so the card sits on calm, dark sky instead of
 * having moonlight leak round its corners (user's ask, 2026-10-09; every tab but Home since
 * 2026-10-10). Set by useMoonSink in Home.
 */
export const moonSink = makeMutable(0);
/** How much of the moon's width it drops when sunk, and how much of its glow stays. */
const SINK_DEPTH = 0.3;
const SUNK_GLOW = 0.25;
/**
 * The resting moon as it is right now, sink included, and how much of its glow shows: where a
 * screen that takes the moon over (the payoff's moonrise) has to start it. Read on the JS thread.
 */
export function restingMoonNow(width: number, height: number) {
  const disc = restingMoonDisc(width, height);
  const sink = moonSink.value;
  return {
    disc: { x: disc.cx, y: disc.cy + sink * disc.r * 2 * SINK_DEPTH, r: disc.r },
    glow: interpolate(sink, [0, 1, MOON_GONE], [1, SUNK_GLOW, 0], Extrapolation.CLAMP),
  };
}
/**
 * The resting moon's size, 1 as everywhere else: the morning payoff shrinks it about its centre
 * as it rises, into a small moon with the time inside (user, 2026-10-28).
 */
export const moonScale = makeMutable(1);
/**
 * The `moonSink` that puts the resting moon's centre at `y` (window points), whatever its
 * `moonScale`: the sink moves the centre and the scale doesn't. `floor` as NightSky's.
 */
export function moonSinkForCentre(width: number, height: number, floor: number, y: number) {
  const m = risingMoon(width, height - floor);
  return (y - m.top - m.size / 2) / (m.size * SINK_DEPTH);
}
/** The Apps tab's moon: risen above its resting place, into the sky under the tiles. */
export const MOON_RAISED = -0.35;
/**
 * The `moonSink` that lifts the resting moon until its disc's top is at `top` (window points):
 * the morning payoff raises it to the top of the screen (user, 2026-10-27). `floor` as NightSky's.
 */
export function moonSinkForTop(width: number, height: number, floor: number, top: number) {
  const m = risingMoon(width, height - floor);
  return (top - m.top) / (m.size * SINK_DEPTH);
}
/** The Routine and You tabs' moon: sunk well past a moon width (its blur pads the image), out of sight with its glow (user, 2026-10-13). */
export const MOON_GONE = 1.6 / SINK_DEPTH;
/**
 * About where the gone moon's glow first shows on the way back up (measured, 2026-10-14).
 * Coming back from MOON_GONE starts here, or the first half of the rise happens out of sight
 * and reads as a pause before it moves (user, 2026-10-14).
 */
export const MOON_SHOWS_FROM = 2.4;

/**
 * Whether the Apps tab has room under its tiles for the raised moon. Its page says (a third
 * limit fills that room, user 2026-10-10); useMoonSink sinks the moon when it doesn't.
 */
let appsRoom = true;
const appsRoomListeners = new Set<() => void>();
export const appsMoonRoom = {
  get: () => appsRoom,
  set(room: boolean) {
    if (room === appsRoom) return;
    appsRoom = room;
    appsRoomListeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    appsRoomListeners.add(listener);
    return () => void appsRoomListeners.delete(listener);
  },
};

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

/**
 * The opener's moon: up top, where Ahead's opener has its mascot, with the name, the line and
 * the buttons below it (user, 2026-10-26).
 */
function heroMoon(width: number, height: number) {
  // Short phones (SE) get a smaller moon, higher up, so it clears the name.
  const short = height < 700;
  const size = Math.min(width * 0.66, height * (short ? 0.22 : 0.32));
  return { left: (width - size) / 2, top: height * (short ? 0.27 : 0.34) - size / 2, size };
}

/** The opener moon's faint glow, as a share of the resting moon's. The user asked for it (2026-10-26); keep it to the opener. */
export const OPENER_GLOW = 0.3;

/** The opener moon's disc (centre and radius), so the intro splash can land its moon there. */
export function openerMoonDisc(width: number, height: number) {
  const m = heroMoon(width, height);
  return { cx: m.left + m.size / 2, cy: m.top + m.size / 2, r: m.size / 2 };
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

/**
 * The quiz's frosted wash: soft blues blended like ABY Journal's onboarding (user, 2026-10-26),
 * drawn as vector gradients so it stays smooth. The moon photo blown up to quiz size went blotchy.
 * Navy up top where the question sits, dusty moon-blue lower down; no grain.
 */
const WASH = {
  top: '#121C36',
  middle: '#3F5583',
  bottom: '#7C90B0',
  /** Soft patches over the base, as [cx, cy, rx, ry] in shares of the screen, with their colour. */
  patches: [
    { at: [0.1, 0.32, 0.75, 0.32], color: '#4A63A0', opacity: 0.55 },
    { at: [0.95, 0.6, 0.7, 0.36], color: '#6F7FB4', opacity: 0.5 },
    { at: [0.2, 0.92, 0.85, 0.3], color: '#93A6C4', opacity: 0.6 },
  ],
} as const;

/** How far into the quiz rise the wash starts fading in, so the moon's curve is seen rising first. */
const WASH_FROM = 0.35;

function QuizWash({ width, height }: { width: number; height: number }) {
  // Own ids per sky: on the web a second sky's gradients would otherwise resolve to the first's.
  const id = `quiz-wash-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`${id}-base`} x1="0" y1="0" x2="0.25" y2="1">
          <Stop offset="0" stopColor={WASH.top} />
          <Stop offset="0.45" stopColor={WASH.middle} />
          <Stop offset="1" stopColor={WASH.bottom} />
        </LinearGradient>
        {WASH.patches.map((patch, i) => (
          <RadialGradient key={i} id={`${id}-${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={patch.color} stopOpacity={patch.opacity} />
            <Stop offset="0.6" stopColor={patch.color} stopOpacity={patch.opacity * 0.4} />
            <Stop offset="1" stopColor={patch.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect width={width} height={height} fill={`url(#${id}-base)`} />
      {WASH.patches.map(({ at: [cx, cy, rx, ry] }, i) => (
        <Ellipse key={i} cx={cx * width} cy={cy * height} rx={rx * width * 1.4} ry={ry * height} fill={`url(#${id}-${i})`} />
      ))}
    </Svg>
  );
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
  moonless = false,
  drift = false,
  riseMs = QUIZ_RISE_MS,
}: {
  opening?: boolean;
  /** How long the quiz rise (or the sink out of it) takes this time: the reveal's is slower. */
  riseMs?: number;
  /** Hide the moon and its glow, leaving the sky: a screen drawing its own (the payoff's moonrise). */
  moonless?: boolean;
  quiz?: boolean;
  /**
   * How far above the screen's bottom the sky ends (the tabs' panel stops above the tab
   * strip): the resting moon rises out of that edge instead, so its light stays in view.
   */
  floor?: number;
  /** The home screen: the moon rises out of the bottom into full view. */
  home?: boolean;
  /** The opener: the sky (not the moon) drifts sideways, slowly enough to be felt more than seen. */
  drift?: boolean;
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
  // The moon you're wearing (features/moons): its size, how far off centre it sits, and its halo's strength.
  const moon = useMoon();
  const lookScale = useSharedValue(moon.scale);
  const lookShift = useSharedValue((moon.cx - 0.5) * width);
  const lookGlow = useSharedValue(moon.glowOpacity);
  useEffect(() => {
    lookScale.set(moon.scale);
    lookShift.set((moon.cx - 0.5) * width);
    lookGlow.set(moon.glowOpacity);
  }, [moon, width, lookScale, lookShift, lookGlow]);

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
      : withTiming(target, { duration: riseMs, easing: Easing.bezier(0.65, 0, 0.35, 1) });
    // The duration is read when the quiz changes, not a change of its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, reduced, risen]);

  useEffect(() => {
    const target = home ? 1 : 0;
    homed.value = reduced
      ? target
      : withTiming(target, { duration: HOME_RISE_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) });
  }, [home, reduced, homed]);

  // 0 = still; while drifting, the sky is grown a little so its edges never show, and sways.
  const swell = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    const on = drift && !reduced;
    const ease = Easing.bezier(0.65, 0, 0.35, 1);
    swell.value = withTiming(on ? 1 : 0, { duration: FLIGHT_MS, easing: ease });
    sway.value = on
      ? withRepeat(withSequence(withTiming(1, { duration: DRIFT_MS, easing: ease }), withTiming(-1, { duration: DRIFT_MS * 2, easing: ease }), withTiming(0, { duration: DRIFT_MS, easing: ease })), -1)
      : withTiming(0, { duration: FLIGHT_MS, easing: ease });
  }, [drift, reduced, swell, sway]);
  const skyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sway.value * DRIFT_X * swell.value }, { scale: 1 + swell.value * DRIFT_GROW }],
  }));

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

  /*
   * The moon and its glow are laid out once, at the biggest size they reach, and moved and sized
   * with a transform only. Animating left/top/width/height re-ran layout and a full shadow tree
   * commit every frame, and stalled whenever React rendered (onboarding's page swaps); a
   * transform is set straight on the view. Only ever scaled down, so the images stay sharp.
   */
  const biggest = Math.max(from.size, to.size, up.size, high.size);
  const frostBase = biggest * FROST_PAD;
  const glowBase = biggest * GLOW_PAD;
  /** Centres a `base`-sized layer on the disc, at `pad` times its size. */
  const place = (d: { size: number; left: number; top: number }, pad: number, base: number, sink: number, k: number) => {
    'worklet';
    return [
      { translateX: d.left + d.size / 2 - base / 2 + lookShift.value },
      { translateY: d.top + d.size / 2 + sink * d.size * SINK_DEPTH - base / 2 },
      { scale: (d.size * pad * k * lookScale.value) / base },
    ];
  };

  const moonStyle = useAnimatedStyle(() => ({
    transform: place(disc(progress.value, risen.value, homed.value), FROST_PAD, frostBase, moonSink.value, moonScale.value),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: place(disc(progress.value, risen.value, homed.value), GLOW_PAD, glowBase, moonSink.value, moonScale.value),
    opacity:
      interpolate(progress.value, [0, 1], [OPENER_GLOW, 1]) *
      interpolate(moonSink.value, [0, 1, MOON_GONE], [1, SUNK_GLOW, 0], Extrapolation.CLAMP) *
      lookGlow.value,
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(risen.value, [WASH_FROM, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    // Clipped: the risen moon's glow runs past the screen edges, which on the web widens and
    // scrolls the page (iOS clips at the screen anyway).
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <Animated.View style={[StyleSheet.absoluteFill, skyStyle]}>
        <Image
          source={moon.sky ?? require('@/assets/onboarding/night-sky-moonless.png')}
          style={[StyleSheet.absoluteFill, MOON_REST === 'bottom' && styles.flipped]}
          contentFit="cover"
          contentPosition="top right"
          accessible={false}
        />
      </Animated.View>
      {/* A wrapper's opacity, since the glow's own is animated and would win. */}
      <View style={[StyleSheet.absoluteFill, moonless && styles.hidden]}>
        {MOON_REST === 'bottom' ? (
          <Animated.View style={[styles.moon, { width: glowBase, height: glowBase }, glowStyle]}>
            <Image
              source={require('@/assets/onboarding/moon-glow.png')}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              // Another moon's halo is today's, filled with its colour.
              tintColor={moon.sky ? moon.glow : undefined}
              accessible={false}
            />
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.moon, { width: frostBase, height: frostBase }, moonStyle]}>
          {moon.twin && !moon.twinAt?.front ? <TwinMoon moon={moon} box={frostBase} /> : null}
          <Image
            source={moon.moon ?? require('@/assets/onboarding/moon-frosted.png')}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessible={false}
          />
          {moon.ring ? <MoonPart source={moon.ring} box={frostBase} x={0} y={0} size={1.6} /> : null}
          {moon.twin && moon.twinAt?.front ? <TwinMoon moon={moon} box={frostBase} /> : null}
        </Animated.View>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, washStyle]}>
        <QuizWash width={width} height={height} />
      </Animated.View>
    </View>
  );
}

/**
 * An image laid out round the moon, inside the moon's own layer (`box` square, its disc 1/FROST_PAD
 * of that), so it moves, sinks and rises with the moon. `x`, `y` and `size` are in moon widths.
 */
function MoonPart({ source, box, x, y, size, tint }: { source: number | object; box: number; x: number; y: number; size: number; tint?: string }) {
  const disc = box / FROST_PAD;
  const side = size * disc;
  return (
    <Image
      source={source}
      style={{ position: 'absolute', width: side, height: side, left: box / 2 + x * disc - side / 2, top: box / 2 + y * disc - side / 2 }}
      contentFit="contain"
      tintColor={tint}
      accessible={false}
    />
  );
}

/** A twin moon's second moon and its halo (moon lab's twins), placed off the main moon. */
function TwinMoon({ moon, box }: { moon: MoonDef; box: number }) {
  const at = moon.twinAt!;
  return (
    <>
      {at.glowOpacity > 0 ? (
        <View style={[StyleSheet.absoluteFill, { opacity: at.glowOpacity }]}>
          <MoonPart source={require('@/assets/onboarding/moon-glow.png')} box={box} x={at.x} y={at.y} size={at.size * GLOW_PAD} tint={at.glow} />
        </View>
      ) : null}
      <MoonPart source={moon.twin!} box={box} x={at.x} y={at.y} size={at.size * FROST_PAD} />
    </>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  moon: { position: 'absolute', left: 0, top: 0 },
  hidden: { opacity: 0 },
  flipped: { transform: [{ scaleY: -1 }] },
});
