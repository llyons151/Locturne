import { Image } from 'expo-image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { DisplayFont, Nocturne, NUMBER_FONT, VoiceSize } from '@/theme';

import { Eyebrow, Title } from '../ui';

const STEP_GOAL = 200;

/** The script, in ms from the page opening. */
const TAP_AT = 1500;
const SHIELD_AT = 1650;
const WALK_AT = 2500;
const WALK_TO_190_MS = 2600;
const LAST_STEPS_MS = 110;
/** At 200 steps: the shield's button is pressed, then the shield lifts. */
const LIFT_AFTER_MS = 320;
/** Reduced motion: no zoom or counting, just the two states. */
const REDUCED_AWAKE_AT = 3000;

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

/** How far the phone leans under a finger or cursor, in degrees. */
const MAX_TILT = 14;

type Phase = 'home' | 'shield' | 'awake';
type SharedNumber = ReturnType<typeof useSharedValue<number>>;

/**
 * The product in six seconds, on an iPhone: tap Instagram at 7:00, get Loc's sleep
 * screen, walk 200 steps underneath, and the sleep screen lifts off the feed.
 */
export function TomorrowDemo({ when, clock }: { when: string; clock: string }) {
  const reduced = useReducedMotion();
  const compact = useCompact();
  const [phase, setPhase] = useState<Phase>('home');
  const [steps, setSteps] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const press = useSharedValue(1);
  const button = useSharedValue(1);
  const open = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const announce = () =>
      AccessibilityInfo.announceForAccessibility('200 of 200 steps. Your apps are awake. I’m up. Don’t talk to me yet.');

    if (reduced) {
      at(TAP_AT, () => {
        open.value = 1;
        setPhase('shield');
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

    at(TAP_AT, () => {
      haptic.tap();
      press.value = withSequence(withTiming(0.86, { duration: 90 }), withTiming(1, { duration: 160 }));
    });
    at(SHIELD_AT, () => {
      setPhase('shield');
      open.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    });
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
      });
    }
    // At 200, "Check my steps" gets tapped and the shield lifts off.
    at(goalAt + 60, () => {
      haptic.tap();
      button.value = withSequence(withTiming(0.94, { duration: 100 }), withTiming(1, { duration: 160 }));
    });
    at(goalAt + LIFT_AFTER_MS, () => {
      setPhase('awake');
      lift.value = withTiming(1, { duration: 480, easing: Easing.inOut(Easing.cubic) });
      haptic.done();
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

  // Built once per phase, not per step: the counter ticks ~40 times, and re-rendering the
  // phone's icons, photos and gestures on every tick made the count stutter.
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
                press={press}
                button={button}
                open={open}
                lift={lift}
              />
            </Tilt>
          </View>
        </Reveal>
      ) : null,
    // Shared values are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phoneWidth, phoneHeight, reduced, clock, phase],
  );

  const awake = phase === 'awake';
  // "Fine. *Fine.*": the whole line is already italic, so the emphasis is an underline.
  const line =
    phase === 'home' ? null : awake ? (
      'I’m up. Don’t talk to me yet.'
    ) : steps >= 160 ? (
      <>
        Fine. <Text style={styles.emphasis}>Fine.</Text>
      </>
    ) : steps >= 80 ? (
      'I can hear you walking. I’m ignoring it.'
    ) : (
      'No.'
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
          accessibilityLabel={`${steps} of 200 steps`}
        >
          {steps}
          <Text style={styles.walkGoal}> / 200 steps</Text>
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
 * in iOS points on a 402pt-wide display, scaled by `k`.
 */
function Phone({
  width,
  clock,
  phase,
  press,
  button,
  open,
  lift,
}: {
  width: number;
  clock: string;
  phase: Phase;
  press: SharedNumber;
  button: SharedNumber;
  open: SharedNumber;
  lift: SharedNumber;
}) {
  const height = width / PHONE_RATIO;
  const sw = width * SCREEN.width;
  const sh = height * SCREEN.height;
  const k = sw / 402;
  const pt = (n: number) => n * k;

  // Where Instagram sits, relative to the screen's centre: the sleep screen grows out of it.
  const fromX = (GRID.left + CELL * (TARGET % 4) + CELL / 2) * k - sw / 2;
  const fromY = (GRID.top + ROW * Math.floor(TARGET / 4) + ICON / 2) * k - sh / 2;
  const fromScale = ICON / 402;

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: button.value }] }));
  const shieldStyle = useAnimatedStyle(() => {
    const p = open.value;
    const l = lift.value;
    return {
      opacity: Math.min(1, p * 2.5) * (1 - l),
      transform: [
        { translateX: fromX * (1 - p) },
        { translateY: fromY * (1 - p) - l * 24 * k },
        { scale: (fromScale + (1 - fromScale) * p) * (1 + l * 0.04) },
      ],
    };
  });

  return (
    <View style={{ width, height }}>
      <View
        style={[
          styles.screen,
          { left: width * SCREEN.left, top: height * SCREEN.top, width: sw, height: sh, borderRadius: sw * 0.14 },
        ]}
      >
        {phase === 'awake' ? (
          <InstagramFeed k={k} />
        ) : (
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
        )}

        {/*
          Loc's sleep screen, laid out like the Screen Time shield iOS really shows:
          icon, title, subtitle, a primary and a secondary button, over a blurred backdrop.
        */}
        <Animated.View pointerEvents="none" style={[styles.shield, { borderRadius: sw * 0.14 }, shieldStyle]}>
          <Image source={WALLPAPER} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} />
          <View style={[StyleSheet.absoluteFill, styles.shieldTint]} />
          <View style={[styles.shieldBody, { top: pt(250), paddingHorizontal: pt(32), gap: pt(10) }]}>
            <View style={[styles.shieldIcon, { width: pt(76), height: pt(76), borderRadius: pt(17), marginBottom: pt(10) }]}>
              <Glyph name="moon" size={pt(40)} color={Nocturne.accent ?? Nocturne.text} />
            </View>
            <Text style={[styles.shieldTitle, { fontSize: pt(26), lineHeight: pt(31) }]} maxFontSizeMultiplier={1}>
              Shh. I’m sleeping.{'\n'}So is Instagram.
            </Text>
            <Text style={[styles.shieldSub, { fontSize: pt(17), lineHeight: pt(22) }]} maxFontSizeMultiplier={1}>
              Walk 200 steps and it wakes up.
            </Text>
          </View>
          <View style={[styles.shieldButtons, { left: pt(24), right: pt(24), bottom: pt(44), gap: pt(8) }]}>
            <Animated.View style={[styles.shieldPrimary, { height: pt(54), borderRadius: pt(16) }, buttonStyle]}>
              <Text style={[styles.shieldPrimaryText, { fontSize: pt(18) }]} maxFontSizeMultiplier={1}>
                Check my steps
              </Text>
            </Animated.View>
            <View style={{ height: pt(44), justifyContent: 'center' }}>
              <Text style={[styles.shieldSecondaryText, { fontSize: pt(17) }]} maxFontSizeMultiplier={1}>
                Close
              </Text>
            </View>
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

/** Instagram, open at last: the home feed, with a video post playing. */
function InstagramFeed({ k }: { k: number }) {
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
}

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

  shield: { ...StyleSheet.absoluteFill, overflow: 'hidden', backgroundColor: '#05070D' },
  shieldTint: { backgroundColor: 'rgba(5,8,18,0.62)' },
  shieldBody: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  shieldIcon: { backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  // The system font, as on a real shield: Screen Time doesn't take custom fonts.
  shieldTitle: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  shieldSub: { color: 'rgba(235,240,255,0.72)', textAlign: 'center' },
  shieldButtons: { position: 'absolute', alignItems: 'stretch' },
  shieldPrimary: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shieldPrimaryText: { color: '#000000', fontWeight: '600' },
  shieldSecondaryText: { color: 'rgba(255,255,255,0.85)', fontWeight: '500', textAlign: 'center' },

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
