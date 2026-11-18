import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import { MotionHold, Reveal } from '@/components/motion';
import { Text } from '@/components/text';
import { DISPLAY_MAX_SCALE, DisplayFont, Nocturne, Space } from '@/theme';

import { OPENER_EXIT_EASING, OPENER_EXIT_MS, useLeaving } from './ui';

/**
 * The opener, after Jomo's welcome (user 2026-11-07, docs/WELCOME_SCREEN.md "Round 4"): the real
 * Home on a 3D iPhone above the words. Calmed on 2026-11-17 (user: "a lil chaotic"): the crescent off
 * the phone's edge and the phone's own status bar are gone, the whole phone shows with nothing over
 * it, and only the headline sits under it, after Cal AI's welcome (see `L`).
 *
 * Leaving it (Get started): the words and buttons fade and the phone shrinks away around its screen
 * (from take 7 of the second ten, user 2026-11-18, tools/welcome-load-lab/handoff). The first
 * question then comes in like every other page: its answers rise in as one (user 2026-11-18: the
 * answers flying out of the phone looked wrong). The black behind fades as before.
 */

/**
 * The phone: the store shots' 3D iPhone (phone3d, straight on) with its screen cut out, laid over a
 * real screen recording of Home: Loc burrowing and tearing round (the user's recording, 2026-11-17).
 * The clip is 26 s at 60 fps, its status bar blanked (so no recording dot) and its end crossfaded
 * into its start between two moments Loc is underground, so it loops without a seam.
 */
const FRAME = require('@/assets/onboarding/welcome-phone-frame.webp');
const HOME_VIDEO = require('@/assets/onboarding/welcome-home.mp4');
/** The frame's width over its height. */
const PHONE_RATIO = 1080 / 2221;
/** Where the glass sits in the frame, as fractions of its width and height (from phone3d's grid.json). */
const GLASS = { left: 42.79 / 1080, top: 34.77 / 2221, width: 994.39 / 1080, height: 2153.32 / 2221, radius: 0.15 };
// `radius`: the display's corner radius over its width (an iPhone Pro's is about 15%).

/**
 * The layout, after Cal AI's welcome (user 2026-11-17): the whole phone, nothing over it and nothing
 * faded, centred in the space between the top bar and the headline, with room around it. Points at
 * 390 wide, scaled to the screen's width.
 */
const L = {
  /** The phone's widest: 57% of the screen, as Cal AI's. */
  phoneWidth: 222,
  /** Kept clear under the status bar for the top bar (Restore). */
  topBar: 52,
  /** The least room between the phone's bottom and the headline. */
  toWords: 40,
};

/** When the words look again for where they landed (see `WelcomeWords`). */
const REMEASURE_MS = [120, 300, 600, 1000];

/** The black under the phone fades a little slower, so the sky comes up as the next page comes in. */
const BACKDROP_EXIT_MS = 640;
/** Leaving, the phone shrinks this much around its own screen as it fades, over this long on this curve. */
const EXIT_SHRINK = 0.45;
const PHONE_EXIT_MS = 800;
const PHONE_EXIT_EASING = Easing.bezier(0.4, 0, 0.2, 1);
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
 * Nothing on the opener moves until everything on it has drawn (user 2026-11-18: "make sure everything is
 * actually rendered before it starts playing the fade in animations"). The phone's frame image, the clip's
 * first frame and the words' final place all land at different moments on a cold start, and fading in over
 * them showed as pops and stutter. The phone, its light, the words and the buttons all wait for this, then
 * start together. `READY_MAX_MS` after the words are placed it goes anyway, so a slow clip never holds the page.
 */
let ready = false;
const readyListeners = new Set<() => void>();
function setReady() {
  if (ready) return;
  ready = true;
  readyListeners.forEach((l) => l());
}
const subscribeReady = (l: () => void) => {
  readyListeners.add(l);
  return () => readyListeners.delete(l);
};
const getReady = () => ready;
const useWelcomeReady = () => useSyncExternalStore(subscribeReady, getReady, getReady);
/** The longest the opener waits for its phone to draw. */
const READY_MAX_MS = 1500;
/** The words are looked at again until then (`REMEASURE_MS`): the phone waits for their place to hold. */
const SETTLE_MS = 300;

/**
 * Laid out but unseen until the opener is ready, then its entrances play from that moment, in their
 * own order (a fresh sequence, so a long wait doesn't make them all start at once).
 */
export function WelcomeGate({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const go = useWelcomeReady();
  return (
    <View key={go ? 'go' : 'wait'} style={[style, !go && styles.unseen]}>
      <MotionHold offset={0}>{children}</MotionHold>
    </View>
  );
}

/**
 * The phone and the black behind it, drawn by the flow between the sky and the
 * page while `hello` is up. Opacity and transforms only, so it stays smooth on iOS.
 */
export function WelcomeHero({ shown }: { shown: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const top = useSyncExternalStore(subscribe, getWordsTop, getWordsTop);
  const k = width / 390;

  // The band between the top bar and the headline; the phone is centred in it, drawn smaller
  // when the band is short (SE) so it never runs under the top bar or onto the words.
  const bandTop = insets.top + L.topBar * k;
  const bandBottom = top - L.toWords * k;
  const band = Math.max(0, bandBottom - bandTop);
  const phoneHeight = Math.min((L.phoneWidth * k) / PHONE_RATIO, band);
  const phoneWidth = phoneHeight * PHONE_RATIO;
  const phoneLeft = (width - phoneWidth) / 2;
  const phoneTop = bandTop + (band - phoneHeight) / 2;

  // The backdrop shows at once (the sky must never flash first); the phone comes in.
  const backdrop = useSharedValue(shown ? 1 : 0);
  const player = useVideoPlayer(HOME_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
  });
  // Played once the phone (and so the VideoView) is on screen: it only mounts after the words are
  // measured, and on web a play() before the <video> exists does nothing, which left it frozen.
  const phone = useSharedValue(reduced ? 1 : 0);
  const measured = top > 0;
  useEffect(() => {
    if (measured) player.play();
  }, [player, measured]);

  // Ready once the frame has drawn, the clip has shown its first frame and the words have held their
  // place, then two more frames so the first frame of the fade isn't the one that commits it all.
  const [frameDrawn, setFrameDrawn] = useState(false);
  const [clipDrawn, setClipDrawn] = useState(false);
  const [settled, setSettled] = useState(false);
  const go = useWelcomeReady();
  useEffect(() => {
    if (!measured) return;
    const settle = setTimeout(() => setSettled(true), SETTLE_MS);
    const anyway = setTimeout(setReady, READY_MAX_MS);
    return () => {
      clearTimeout(settle);
      clearTimeout(anyway);
    };
  }, [measured]);
  useEffect(() => {
    if (go || !(frameDrawn && clipDrawn && settled)) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(setReady);
    });
    return () => cancelAnimationFrame(raf);
  }, [go, frameDrawn, clipDrawn, settled]);

  useEffect(() => {
    if (!go || !measured) return;
    if (!shown) {
      const out = (ms: number) => withTiming(0, { duration: reduced ? 200 : ms, easing: OPENER_EXIT_EASING });
      backdrop.set(out(BACKDROP_EXIT_MS));
      phone.set(withTiming(0, { duration: reduced ? 200 : PHONE_EXIT_MS, easing: PHONE_EXIT_EASING }));
      return;
    }
    backdrop.set(1);
    if (reduced) {
      phone.set(1);
      return;
    }
    phone.set(0);
    phone.set(withTiming(1, { duration: 900, easing: ENTER_EASING }));
  }, [shown, go, measured, reduced, backdrop, phone]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  // The blue glow behind the phone comes and goes with it.
  const glowStyle = useAnimatedStyle(() => ({ opacity: phone.get() }));
  // Arriving, it rises 40pt; leaving, it shrinks away around its screen as it fades.
  const phoneStyle = useAnimatedStyle(() => ({
    opacity: phone.get(),
    transform: shown
      ? [{ translateY: (1 - phone.get()) * 40 * k }]
      : [{ scale: reduced ? 1 : 1 - (1 - phone.get()) * EXIT_SHRINK }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, styles.black, backdropStyle]}>
        {measured ? (
          <>
            {/* A cool blue glow behind the phone so the screen isn't flat black (user 2026-11-17 asked for
                it: "add the cool blue glow ... it feels too black"; now the glow lab's moonrise arc). This screen only. */}
            <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
              <WelcomeGlow width={width} phoneTop={phoneTop} phoneHeight={phoneHeight} />
            </Animated.View>
            <Animated.View style={StyleSheet.absoluteFill}>
              <Animated.View style={[styles.at, { left: phoneLeft, top: phoneTop, width: phoneWidth, height: phoneWidth / PHONE_RATIO }, phoneStyle]}>
                {/* Rounded like the glass, so the clip's square corners never show past the frame's. */}
                <View
                  style={{
                    position: 'absolute',
                    left: phoneWidth * GLASS.left,
                    top: (phoneWidth / PHONE_RATIO) * GLASS.top,
                    width: phoneWidth * GLASS.width,
                    height: (phoneWidth / PHONE_RATIO) * GLASS.height,
                    borderRadius: phoneWidth * GLASS.width * GLASS.radius,
                    borderCurve: 'continuous',
                    overflow: 'hidden',
                    backgroundColor: '#06070C',
                  }}
                >
                  <VideoView
                    player={player}
                    style={{ width: phoneWidth * GLASS.width, height: (phoneWidth / PHONE_RATIO) * GLASS.height }}
                    contentFit="cover"
                    nativeControls={false}
                    fullscreenOptions={{ enable: false }}
                    allowsPictureInPicture={false}
                    onFirstFrameRender={() => setClipDrawn(true)}
                  />
                </View>
                <Image source={FRAME} style={StyleSheet.absoluteFill} contentFit="contain" onDisplay={() => setFrameDrawn(true)} />
              </Animated.View>
            </Animated.View>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

/**
 * The light behind the phone: "Moonrise arc, all blue", take 1 of the glow lab's ten (user 2026-11-17,
 * tools/glow-lab, docs/reports/Glassy flowing backgrounds.md). A dark planet's horizon crests behind the
 * phone's bottom with a soft blue band of light rising off it, a thin pale rim, a faint blue haze behind
 * the phone, and a brighter stretch of light drifting slowly along the edge. The lab's shader, rebuilt from
 * SVG gradients: each stop is the shader's colour at that distance from the edge, worked out below, so it
 * matches without a native build. Opacity and transforms only. Still with Reduce Motion. No grain.
 */
/** The arc's geometry, in screen widths (W) and phone heights (H), as the lab's take 1. */
const ARC = {
  /** Where the horizon's top sits: this far down the phone. */
  crest: 0.88,
  /** The planet's radius. */
  radius: 1.25,
  /** How far the light spreads above the edge, and below it. */
  up: 0.16,
  down: 0.035,
  /** The rim's width. */
  rim: 0.012,
  /** How far out the light is drawn (past here it's under 1/255). */
  reach: 0.62,
};
/** The lab's colours (0–1). */
const BAND = [0.14, 0.28, 0.69];
const MID = [0.3, 0.5, 0.94];
const RIM = [0.62, 0.74, 1.0];
/** The breath of the planet's edge, and the light's trip along it. */
const BREATH_MS = 14000;
const SWEEP_MS = 52000;
/** The steady light along the edge; the drifting stretch adds the rest (the shader's 0.75 + 0.25 sin). */
const SWEEP_BASE = 0.8;

const tone = (x: number) => 1 - Math.exp(-x);
const hex = (c: number[]) => '#' + c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');

/**
 * The shader's colour at `d` (points, + above the edge, − inside the planet), as a colour and an opacity
 * over black: inside it's opaque (the planet hides the haze), outside the light's brightest channel is its
 * opacity so it adds onto the haze the way light would.
 */
function arcAt(d: number, W: number, s: number) {
  const up = d >= 0 ? Math.exp(-Math.pow(d / (W * ARC.up), 1.4)) : 0;
  const dn = d < 0 ? Math.exp(-Math.pow(-d / (W * ARC.down), 1.2)) : 0;
  const band = up + dn;
  const k = Math.min(1, band);
  const rim = Math.exp(-Math.abs(d) / (W * ARC.rim));
  const lin = BAND.map((b, i) => ((b + (MID[i] - b) * k) * band * 1.2 + RIM[i] * 0.55 * rim) * s * (d < 0 ? 0.12 : 1));
  const c = lin.map(tone);
  if (d < 0) return { color: hex(c), opacity: 1 };
  const a = Math.max(...c, 1e-4);
  return { color: hex(c.map((v) => v / a)), opacity: a };
}

/** Distances from the edge the stops sit at, as fractions of W: dense where the light changes fast. */
const OUT_STOPS = [0, 0.004, 0.01, 0.018, 0.028, 0.04, 0.055, 0.075, 0.1, 0.13, 0.17, 0.22, 0.28, 0.36, 0.46, 0.62];
const IN_STOPS = [0.2, 0.1, 0.06, 0.04, 0.025, 0.015, 0.008, 0.003, 0];

function WelcomeGlow({ width, phoneTop, phoneHeight }: { width: number; phoneTop: number; phoneHeight: number }) {
  const reduced = useReducedMotion();
  const W = width;
  const R = W * ARC.radius;
  const S = R + W * ARC.reach; // the drawn square's half-side, centred on the planet
  const ox = W / 2;
  const oy = phoneTop + phoneHeight * ARC.crest + R;

  const breath = useSharedValue(0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    breath.set(withRepeat(withTiming(1, { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }), -1, true));
    sweep.set(withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.linear }), -1, false));
  }, [reduced, breath, sweep]);
  // The edge breathes 1% of the screen's width, about the planet's centre.
  const planetStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ((breath.get() * 2 - 1) * W * 0.01) / R }] }));
  // The brighter stretch swings to and fro across the visible top of the arc (±22°).
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.sin(sweep.get() * Math.PI * 2) * 22}deg` }] }));

  // Black from the centre to just inside the edge, then the shader's colours.
  const inner = R - W * IN_STOPS[0];
  const ring = [
    { r: 0, color: '#000000', opacity: 1 },
    { r: inner - 1, color: '#000000', opacity: 1 },
    ...IN_STOPS.map((f) => ({ r: R - W * f, ...arcAt(-W * f, W, SWEEP_BASE) })),
    ...OUT_STOPS.slice(1).map((f) => ({ r: R + W * f, ...arcAt(W * f, W, SWEEP_BASE) })),
  ];
  const box = { left: ox - S, top: oy - S, width: S * 2, height: S * 2 };

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]}>
      {/* A faint blue haze behind the phone, the sky above the horizon. */}
      <Svg width={width} height={oy} style={styles.at}>
        <Defs>
          <RadialGradient id="arc-haze" cx="50%" cy="50%" r="50%">
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 1].map((t) => (
              <Stop key={t} offset={t} stopColor="#1A3385" stopOpacity={0.3 * Math.exp(-Math.pow(t / 0.55, 2))} />
            ))}
          </RadialGradient>
        </Defs>
        {/* An ellipse with the gradient fitted to it: nothing is drawn outside it, so no edge can show. */}
        <Ellipse cx={ox} cy={phoneTop + phoneHeight * 0.45} rx={W * 0.95} ry={phoneHeight * 0.8} fill="url(#arc-haze)" />
      </Svg>
      <Animated.View style={[styles.at, box, planetStyle]}>
        <Svg width={S * 2} height={S * 2}>
          <Defs>
            <RadialGradient id="arc-light" cx={S} cy={S} r={S} gradientUnits="userSpaceOnUse">
              {ring.map((p) => (
                <Stop key={p.r} offset={p.r / S} stopColor={p.color} stopOpacity={p.opacity} />
              ))}
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={S * 2} height={S * 2} fill="url(#arc-light)" />
        </Svg>
        {/* The brighter stretch: the same band, 25% stronger, faded out to either side, swinging round the centre. */}
        <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
          <Svg width={S * 2} height={S * 2}>
            <Defs>
              <RadialGradient id="arc-sweep" cx="50%" cy="50%" r="50%">
                <Stop offset={0} stopColor="#5C88F0" stopOpacity={0.22} />
                <Stop offset={0.35} stopColor="#3F67D0" stopOpacity={0.12} />
                <Stop offset={0.7} stopColor="#2447B0" stopOpacity={0.04} />
                <Stop offset={1} stopColor="#2447B0" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={S} cy={S - R} rx={W * 0.42} ry={W * 0.2} fill="url(#arc-sweep)" />
            {/* Hidden again inside the planet, so it lights the air and not the ground. */}
            <Circle cx={S} cy={S} r={R} fill="#000000" opacity={0.88} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * The opener's headline under the phone and its small line (taken out for Cal AI's one-line look, then
 * wanted back the same day, user 2026-11-17). Reports where it sits so the phone fits above it.
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
      <View ref={ref} onLayout={measure} style={styles.wordsAt}>
        <WelcomeGate style={styles.wordsInner}>
          <Reveal delay={delay}>
            <Text style={[styles.head, width < 393 && narrow(width)]} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
              {head}
            </Text>
          </Reveal>
          <Reveal delay={delay + 120}>
            <Text style={styles.sub}>{sub}</Text>
          </Reveal>
        </WelcomeGate>
      </View>
    </Animated.View>
  );
}

/** Narrower than a 393pt phone (SE, mini), the headline shrinks with the screen so each line stays one line. */
const narrow = (width: number) => ({ fontSize: (30 * width) / 393, lineHeight: (35 * width) / 393 });

const styles = StyleSheet.create({
  black: { backgroundColor: '#000000' },
  at: { position: 'absolute' },
  clip: { overflow: 'hidden' },
  unseen: { opacity: 0 },
  words: { alignSelf: 'stretch', alignItems: 'center' },
  wordsAt: { alignSelf: 'stretch' },
  wordsInner: { alignSelf: 'stretch', alignItems: 'center', gap: Space.s },
  // Cal AI's welcome type: one bold two-line promise, a little bigger than Jomo's 28pt (32 broke
  // "Your apps go to bed" onto two lines on a 393pt phone).
  head: { ...DisplayFont, color: Nocturne.text, fontSize: 30, lineHeight: 35, letterSpacing: -0.5, textAlign: 'center' },
  // The small line, back under it (user 2026-11-17). Headline white, dimmed, at 17pt (user 2026-11-18): in
  // grey-blue 15pt it matched "Restore purchases" under the button and read as a second link.
  sub: { color: Nocturne.text, opacity: 0.72, fontSize: 17, lineHeight: 22, fontWeight: '400', textAlign: 'center' },
});
