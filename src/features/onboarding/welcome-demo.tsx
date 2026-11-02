import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { BrandIcon, SystemIcon, type BrandName, type SystemName } from '@/components/app-icons';
import { Glyph } from '@/components/ios-glyphs';
import { Reveal } from '@/components/motion';
import { Text } from '@/components/text';
import { shieldCopy } from '@/lib/shield-copy';
import { DISPLAY_MAX_SCALE, DisplayFont, Nocturne, Space } from '@/theme';

import { useLeaving } from './ui';

/**
 * The opener's picture (docs/WELCOME_SCREEN.md, user 2026-11-02): Cal AI's welcome is its app
 * working, so ours is the lock happening, played the way an iPhone plays it. 10:59 turns 11:00
 * and the scroll apps go the way Screen Time draws a blocked app: dimmed, with an hourglass by
 * the name. The Apple apps and the dock stay awake. Instagram is tapped (the icon darkens, as
 * on a real touch), opens with the system's zoom out of its icon, and it's the night shield.
 * A swipe home sends it back into the icon, the phone locks, wakes at 10:59, and it plays again.
 * Opacity and transforms only, so it stays smooth on iOS.
 */

/** Apple's iPhone 17 bezel and its screen opening, as in the tomorrow demo. */
const FRAME = require('@/assets/onboarding/iphone-frame.png');
const WALLPAPER = require('@/assets/backgrounds/moonlit-night.png');
const PHONE_RATIO = 1350 / 2760;
const SCREEN = { left: 72 / 1350, top: 69 / 2760, width: 1206 / 1350, height: 2622 / 2760 };

/** iOS 26 home screen metrics, in points on a 402pt-wide screen. */
const ICON = 64;
const GRID = { top: 72, left: 16 };
const ROW = 98;
const CELL = (402 - GRID.left * 2) / 4;
const CORNER = 0.225;
type AppleName = 'Calendar' | 'Camera' | 'Weather' | 'Settings';
type Slot = { brand: BrandName } | { apple: AppleName };
const SLOTS: Slot[] = [
  { brand: 'TikTok' },
  { brand: 'Instagram' },
  { brand: 'YouTube' },
  { brand: 'Snapchat' },
  { brand: 'X' },
  { brand: 'Reddit' },
  { brand: 'Netflix' },
  { brand: 'Twitch' },
  { apple: 'Calendar' },
  { apple: 'Camera' },
  { apple: 'Weather' },
  { apple: 'Settings' },
];
const SLEEPERS = SLOTS.filter((s) => 'brand' in s).length;
const TARGET = 1;
const DOCK: SystemName[] = ['Phone', 'Safari', 'Messages', 'Music'];

/** The night shield as it reads with the default 7 am morning. */
const SHIELD = shieldCopy('night', { morningStart: 7 * 60, method: 'steps', stepGoal: 200 });

/** The script, in ms from the start of each play. */
const FIRST_DELAY = 900;
const ELEVEN_AT = 1100;
const SLEEP_STAGGER = 90;
const SLEEP_MS = 380;
const TOUCH_AT = 2700;
const LAUNCH_AT = 2850;
const HOME_AT = 5600;
const LOCK_AT = 7000;
const LOCK_MS = 260;
const WAKE_AT = 7700;
const WAKE_MS = 380;
/** The system's app launch and close: a quick, nearly critically damped spring. */
const LAUNCH = { duration: 560, dampingRatio: 0.92 } as const;
const CLOSE = { duration: 520, dampingRatio: 0.95 } as const;

/** The phone's widest, as a share of the screen's width. */
const WIDE = 0.54;

/** How long the opener takes to leave: the phone sinks and fades, and the words fade as it goes. */
export const WELCOME_EXIT_MS = 520;

/**
 * Fills the room the opener's words leave and stands the phone in it, as tall as fits: the
 * words and buttons never move for it, however short the screen (SE). Leaving the opener, the
 * phone sinks a little and fades.
 */
export function WelcomeDemo() {
  const screen = useWindowDimensions();
  const reduced = useReducedMotion();
  const leaving = useLeaving();
  const [room, setRoom] = useState(0);
  const width = Math.min(screen.width * WIDE, room * PHONE_RATIO);
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!width) return;
    if (leaving) shown.set(withTiming(0, { duration: reduced ? 200 : WELCOME_EXIT_MS, easing: Easing.in(Easing.quad) }));
    else if (!reduced) shown.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [width, leaving, reduced, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 28 }, { scale: 0.96 + 0.04 * shown.value }],
  }));
  return (
    <View style={styles.room} onLayout={(e) => setRoom(e.nativeEvent.layout.height)}>
      {width > 0 ? (
        <Animated.View style={style}>
          <Demo width={width} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * The opener's words: a bold two-line promise with the grey line tight under it, Cal AI's
 * welcome type (user 2026-11-02: the light 30pt line with a far-off grey sub looked bad). They
 * come in after the phone, and fade as it sinks on the way out.
 */
export function WelcomeWords({ head, sub, delay }: { head: string; sub: string; delay: number }) {
  const reduced = useReducedMotion();
  const leaving = useLeaving();
  const there = useSharedValue(1);
  useEffect(() => {
    if (leaving) there.set(withDelay(reduced ? 0 : 80, withTiming(0, { duration: reduced ? 200 : WELCOME_EXIT_MS - 80, easing: Easing.in(Easing.quad) })));
  }, [leaving, reduced, there]);
  const fade = useAnimatedStyle(() => ({ opacity: there.value }));
  return (
    <Animated.View style={[styles.words, fade]}>
      <Reveal delay={delay}>
        <Text style={styles.head} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
          {head}
        </Text>
      </Reveal>
      <Reveal delay={delay + 120}>
        <Text style={styles.sub}>{sub}</Text>
      </Reveal>
    </Animated.View>
  );
}

const Demo = memo(function Demo({ width }: { width: number }) {
  const reduced = useReducedMotion();
  const height = width / PHONE_RATIO;
  const sw = width * SCREEN.width;
  const sh = height * SCREEN.height;
  const k = sw / 402;
  const pt = (n: number) => n * k;

  // Reduced motion: one still frame, 11:00 with the apps asleep.
  const [eleven, setEleven] = useState(false);
  const late = reduced || eleven;
  const asleep = useSharedValue(reduced ? 1 : 0);
  const touch = useSharedValue(0);
  const launch = useSharedValue(0);
  const off = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      asleep.set(1);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));
    const play = (start: number) => {
      at(start + ELEVEN_AT, () => {
        setEleven(true);
        // One clock for the whole grid: each icon reads its own slice of it.
        asleep.set(withTiming(1, { duration: SLEEP_MS + SLEEP_STAGGER * (SLEEPERS - 1), easing: Easing.linear }));
      });
      at(start + TOUCH_AT, () => touch.set(withTiming(1, { duration: 90 })));
      at(start + LAUNCH_AT, () => {
        touch.set(withDelay(200, withTiming(0, { duration: 0 })));
        launch.set(withSpring(1, LAUNCH));
      });
      at(start + HOME_AT, () => launch.set(withSpring(0, CLOSE)));
      // The side button: the screen goes dark, and wakes on the next play at 10:59.
      at(start + LOCK_AT, () => off.set(withTiming(1, { duration: LOCK_MS, easing: Easing.in(Easing.quad) })));
      at(start + WAKE_AT, () => {
        setEleven(false);
        asleep.set(0);
        off.set(withTiming(0, { duration: WAKE_MS, easing: Easing.out(Easing.quad) }));
        play(0);
      });
    };
    play(FIRST_DELAY);
    return () => timers.forEach(clearTimeout);
  }, [reduced, asleep, touch, launch, off]);

  // The shield opens out of Instagram's icon and closes back into it, as an app does.
  const fromX = (GRID.left + CELL * (TARGET % 4) + CELL / 2) * k - sw / 2;
  const fromY = (GRID.top + ROW * Math.floor(TARGET / 4) + ICON / 2) * k - sh / 2;
  const fromScale = ICON / 402;
  const shieldStyle = useAnimatedStyle(() => {
    const p = launch.value;
    return {
      opacity: interpolate(p, [0, 0.12], [0, 1], 'clamp'),
      transform: [{ translateX: fromX * (1 - p) }, { translateY: fromY * (1 - p) }, { scale: fromScale + (1 - fromScale) * p }],
    };
  });
  // The app's own screen comes up inside the growing window; at icon size it's just its dark.
  const shieldInside = useAnimatedStyle(() => ({ opacity: interpolate(launch.value, [0.25, 0.75], [0, 1], 'clamp') }));
  // Behind an opening app the home screen zooms past and dims, as on iOS.
  const homeStyle = useAnimatedStyle(() => ({
    opacity: 1 - 0.5 * launch.value,
    transform: [{ scale: 1 + 0.14 * launch.value }],
  }));
  const offStyle = useAnimatedStyle(() => ({ opacity: off.value }));

  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="An iPhone at 11 PM. The scroll apps go dim with an hourglass, and opening Instagram shows: Shh. I’m sleeping. So are they."
    >
      <View
        style={[styles.screen, { left: width * SCREEN.left, top: height * SCREEN.top, width: sw, height: sh, borderRadius: sw * 0.14 }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Image source={WALLPAPER} style={StyleSheet.absoluteFill} contentFit="cover" />
        <Animated.View style={[StyleSheet.absoluteFill, homeStyle]}>
          <View style={[styles.grid, { top: pt(GRID.top), left: pt(GRID.left), right: pt(GRID.left) }]}>
            {SLOTS.map((slot, i) => (
              <HomeIcon key={i} slot={slot} index={i} k={k} asleep={asleep} touch={i === TARGET ? touch : undefined} />
            ))}
          </View>
          <View style={[styles.search, { bottom: pt(124), height: pt(30), paddingHorizontal: pt(12), borderRadius: pt(15), gap: pt(4) }]}>
            <Glyph name="search" size={pt(13)} />
            <Text style={[styles.searchText, { fontSize: pt(13) }]} maxFontSizeMultiplier={1}>
              Search
            </Text>
          </View>
          <View
            style={[styles.dock, { left: pt(12), right: pt(12), bottom: pt(12), height: pt(92), borderRadius: pt(36), paddingHorizontal: pt(14) }]}
          >
            {DOCK.map((name) => (
              <SystemIcon key={name} name={name} size={pt(ICON)} />
            ))}
          </View>
        </Animated.View>

        {/* The night shield as iOS draws it (shield-copy.ts): near-black, the moon, the words, one button. */}
        <Animated.View pointerEvents="none" style={[styles.shield, { borderRadius: sw * 0.14 }, shieldStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, shieldInside]}>
            <View style={[styles.shieldBody, { top: pt(250), paddingHorizontal: pt(32), gap: pt(10) }]}>
              <View style={{ marginBottom: pt(14) }}>
                <Glyph name="moon" size={pt(52)} />
              </View>
              <Text style={[styles.shieldTitle, { fontSize: pt(26), lineHeight: pt(31) }]} maxFontSizeMultiplier={1}>
                {SHIELD.title}
              </Text>
              <Text style={[styles.shieldSub, { fontSize: pt(17), lineHeight: pt(22) }]} maxFontSizeMultiplier={1}>
                {SHIELD.subtitle}
              </Text>
            </View>
            <View style={[styles.shieldButton, { left: pt(24), right: pt(24), bottom: pt(60), height: pt(54), borderRadius: pt(16) }]}>
              <Text style={[styles.shieldButtonText, { fontSize: pt(18) }]} maxFontSizeMultiplier={1}>
                {SHIELD.button}
              </Text>
            </View>
            <View style={[styles.homeBar, { bottom: pt(8), width: pt(140), height: pt(5), borderRadius: pt(3) }]} />
          </Animated.View>
        </Animated.View>

        <View style={[styles.statusBar, { top: pt(17), height: pt(22) }]}>
          <Text style={[styles.clock, { width: pt(130), fontSize: pt(17) }]} maxFontSizeMultiplier={1}>
            {late ? '11:00' : '10:59'}
          </Text>
          <View style={[styles.statusIcons, { width: pt(130), gap: pt(5) }]}>
            <Glyph name="signal" size={pt(18)} />
            <Glyph name="wifi" size={pt(18)} />
            <Glyph name="battery" size={pt(27)} />
          </View>
        </View>
        <Animated.View pointerEvents="none" style={[styles.off, offStyle]} />
      </View>
      <Image source={FRAME} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
    </View>
  );
});

/**
 * One home-screen app. A scroll app falls asleep in its turn the way Screen Time draws it:
 * the icon dims and an hourglass comes in before its name.
 */
function HomeIcon({
  slot,
  index,
  k,
  asleep,
  touch,
}: {
  slot: Slot;
  index: number;
  k: number;
  asleep: SharedValue<number>;
  touch?: SharedValue<number>;
}) {
  const pt = (n: number) => n * k;
  const sleeps = 'brand' in slot;
  const name = 'brand' in slot ? slot.brand : slot.apple;
  const total = SLEEP_MS + SLEEP_STAGGER * (SLEEPERS - 1);
  const from = (SLEEP_STAGGER * index) / total;
  const span = SLEEP_MS / total;
  const dim = useAnimatedStyle(() => {
    const s = sleeps ? Math.min(1, Math.max(0, (asleep.value - from) / span)) : 0;
    // A finger on it darkens it a little more, as a real touch does.
    return { opacity: s * 0.5 + (touch ? touch.value * 0.3 : 0) };
  });
  const plain = useAnimatedStyle(() => ({ opacity: sleeps ? 1 - Math.min(1, Math.max(0, (asleep.value - from) / span)) : 1 }));
  const marked = useAnimatedStyle(() => ({ opacity: sleeps ? Math.min(1, Math.max(0, (asleep.value - from) / span)) : 0 }));
  const label = [styles.label, { fontSize: pt(12), lineHeight: pt(15) }];
  return (
    <View style={{ width: pt(CELL), height: pt(ROW), alignItems: 'center', gap: pt(5) }}>
      <View style={{ width: pt(ICON), height: pt(ICON) }}>
        {'brand' in slot ? <BrandIcon name={slot.brand} size={pt(ICON)} /> : <AppleIcon name={slot.apple} size={pt(ICON)} />}
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, { borderRadius: pt(ICON) * CORNER }, dim]} />
      </View>
      <View style={{ height: pt(15), alignSelf: 'stretch' }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.labelRow, plain]}>
          <Text numberOfLines={1} style={label} maxFontSizeMultiplier={1}>
            {name}
          </Text>
        </Animated.View>
        {sleeps ? (
          <Animated.View style={[StyleSheet.absoluteFill, styles.labelRow, { gap: pt(2) }, marked]}>
            <Glyph name="hourglass" size={pt(11)} color="#D1D1D6" />
            <Text numberOfLines={1} style={[label, styles.labelAsleep]} maxFontSizeMultiplier={1}>
              {name}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Apple's own apps, drawn after their iOS icons: they stay awake all night. */
function AppleIcon({ name, size }: { name: AppleName; size: number }) {
  if (name === 'Calendar') {
    const today = new Date();
    return (
      <View style={[styles.calendar, { width: size, height: size, borderRadius: size * CORNER }]}>
        <Text style={[styles.calDay, { fontSize: size * 0.15, marginTop: size * 0.1 }]} maxFontSizeMultiplier={1}>
          {WEEKDAY[today.getDay()]}
        </Text>
        <Text style={[styles.calDate, { fontSize: size * 0.48, lineHeight: size * 0.56 }]} maxFontSizeMultiplier={1}>
          {today.getDate()}
        </Text>
      </View>
    );
  }
  const id = `apple-${name}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={name === 'Weather' ? '#4AA8F0' : name === 'Camera' ? '#E9E9EE' : '#A1A1A8'} />
          <Stop offset="1" stopColor={name === 'Weather' ? '#1F64C8' : name === 'Camera' ? '#B9B9C0' : '#6B6B72'} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" rx={100 * CORNER} fill={`url(#${id})`} />
      {name === 'Camera' ? (
        <>
          <Rect x="18" y="32" width="64" height="44" rx="9" fill="#2C2C2E" />
          <Rect x="38" y="25" width="24" height="10" rx="4" fill="#2C2C2E" />
          <Circle cx="50" cy="54" r="14" fill="#E9E9EE" />
          <Circle cx="50" cy="54" r="9.5" fill="#2C2C2E" />
          <Circle cx="72" cy="41" r="2.5" fill="#E9E9EE" />
        </>
      ) : null}
      {name === 'Weather' ? (
        <>
          <Circle cx="40" cy="40" r="15" fill="#FFD43B" />
          <Path d="M34 74h34a13 13 0 0 0 0-26 18 18 0 0 0-34 6 10 10 0 0 0 0 20Z" fill="#FFFFFF" />
        </>
      ) : null}
      {name === 'Settings' ? (
        <G>
          {Array.from({ length: 12 }, (_, i) => (
            <Rect key={i} x="46" y="16" width="8" height="14" rx="2" fill="#3A3A3C" transform={`rotate(${i * 30} 50 50)`} />
          ))}
          <Circle cx="50" cy="50" r="26" fill="#3A3A3C" />
          <Circle cx="50" cy="50" r="18" fill="#8E8E93" />
          <Circle cx="50" cy="50" r="8" fill="#3A3A3C" />
        </G>
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  words: { alignSelf: 'stretch', alignItems: 'center', gap: Space.s },
  head: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 40, letterSpacing: -0.4, textAlign: 'center' },
  sub: { color: Nocturne.text2, fontSize: 17, lineHeight: 23, textAlign: 'center' },
  room: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  screen: { position: 'absolute', overflow: 'hidden', backgroundColor: '#000000' },
  statusBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clock: { color: '#FFFFFF', fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] },
  statusIcons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  grid: { position: 'absolute', flexDirection: 'row', flexWrap: 'wrap' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  // Home-screen labels: the system font, regular, with the faint shadow iOS gives them over a wallpaper.
  label: {
    color: '#FFFFFF',
    fontWeight: '400',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
  },
  labelAsleep: { color: '#D1D1D6' },
  search: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchText: { color: '#FFFFFF', fontWeight: '500' },
  // iOS 26's dock: a clear glass shelf with a bright rim.
  dock: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  dim: { backgroundColor: '#000000' },
  calendar: { backgroundColor: '#FFFFFF', alignItems: 'center' },
  calDay: { color: '#FF3B30', fontWeight: '600', letterSpacing: 0.3 },
  calDate: { color: '#000000', fontWeight: '300' },
  shield: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: '#0B0B0C' },
  shieldBody: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  // The system font, as on a real shield: Screen Time doesn't take custom fonts.
  shieldTitle: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  shieldSub: { color: '#A1A1A6', textAlign: 'center' },
  shieldButton: { position: 'absolute', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shieldButtonText: { color: '#0B0B0C', fontWeight: '600' },
  homeBar: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.75)' },
  off: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
});
