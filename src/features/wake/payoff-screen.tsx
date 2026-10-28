import { SymbolView } from 'expo-symbols';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { File, Paths } from 'expo-file-system';
import { Platform, Share, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/app-background';
import { PANEL_RADIUS, tabStripHeight } from '@/components/app-tabs';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { FOCUS_MS, FOCUS_STEP_MS, focusIn } from '@/components/motion';
import { MOON_SHOWS_FROM, moonSink, moonSinkForTop, restingMoonDisc } from '@/components/night-sky';
import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import Svg, { Path } from 'react-native-svg';

import { CTA_HEIGHT, DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import { homeEntrance, REPLAY_START_MS } from '../home/entrance';
import { holdLocLines, markLocSaid } from '../home/loc';
import { LocBubble } from '../home/loc-bubble';
import { locSpecial } from '../home/loc-lines';
import { LOC_VIEW } from '../home/loc-rig';
import LocStage from '../home/loc-stage';
import { weekDays } from '../home/week';
import { WeekStrip } from '../home/week-strip';
import { clockParts, payoffKicker, payoffMoment, shareText } from './payoff';
import ShareCard, { type CardFacts } from './share-card';

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
  /** The earliest they got up this week, this morning included, in minutes since midnight. */
  earliest: number;
  /** Home's key prefix for what Loc has said (`markLocSaid`), or null for made-up facts, which mark nothing. */
  sayKey: string | null;
};

/** Loc's width as a share of the screen: Home's. */
const LOC_SHARE = 0.27;
/** Where Home rests its moon (`useMoonSink` on the Home tab). */
const HOME_SINK = 0;

/** One step of the entrance: each piece comes into focus a beat after the one before (onboarding's `focus`). */
const STEP_MS = 150;

/** Under this tall (an iPhone SE) the page's gaps tighten. */
const SHORT_SCREEN = 720;

/** Share's row under Done: its label with the button's own padding. */
const SHARE_ROW = 44;

/**
 * Done hands back to Home (user, 2026-10-27: "flawless"), one thing after another: the page
 * fades out; then everything moves back to where Home has it, together on one curve (the moon
 * sinks, the panel's edge and Loc drop to Home's strip); then this screen goes and Home's own
 * entrance fades its pieces in. Home is underneath all along, so nothing has to load.
 */
const OUT_MS = 280;
const SETTLE_AT_MS = 180;
const SETTLE_MS = 720;
const SETTLE = Easing.bezier(0.65, 0, 0.35, 1);
/** Last, the screen dissolves over Home (identical by then but for Loc's pose and the tabs). */
const DISSOLVE_MS = 340;

/** The moon's rise behind him once he yells, all the way to the top: quick off the edge, a long settle. */
const RISE_MS = 2200;
const RISE = Easing.bezier(0.16, 1, 0.3, 1);
/** The page comes into focus this far into the rise, as the moon nears the top. */
const PAGE_AT_MS = 1100;
/** Room the risen moon leaves at the top of the screen. */
const MOON_GAP = 8;
/** Room kept between the moon and Loc for the line, the stats and the week; a short screen pushes the moon up into the top instead. */
const BELOW_MIN = 230;

/** Loc's line comes up this long after the page starts coming into focus, and stays this long. */
const LINE_AT_MS = 1600;
const LINE_MS = 5000;
/** Room over Loc's head for his speech bubble, between him and the week. */
const BUBBLE_ROOM = 76;
/** Where his bubble's tail points, as a share of his canvas's height up from its bottom: just over his head (loc.tsx). */
const BUBBLE_AT = 0.78;
/** From the moon starting up to the top of his yell (loc-yell.ts, Champion: rise 1050, peak 1500): when the card's picture of him is taken. */
const SNAP_MS = 450;

/** The panel's rounded corner, as AppBackground draws it: black outside a quarter circle. */
const CORNER = `M0,0 L0,${PANEL_RADIUS} L${PANEL_RADIUS},${PANEL_RADIUS} A${PANEL_RADIUS},${PANEL_RADIUS} 0 0 1 0,0 Z`;

/** If his webview never yells (it failed to load), the moon rises anyway. */
const YELL_FALLBACK_MS = 7000;

/**
 * The morning payoff (docs/APP_RATING_2026-10-15.md, "Build the morning payoff"): the moment the
 * apps wake, made into one. Laid out like Home (user, 2026-10-27): the sky is a panel with
 * rounded bottom corners, Loc stands on its edge in front of the moon with room to roam, and the
 * black strip under him holds Done and Share where Home has its tabs. The moon starts out of
 * sight: he pops up, looks at the sky and yells, fist up, and at the yell the phone buzzes and the
 * moon rises behind him, all the way to the top, with the time you got up inside it; the
 * morning's count, this week's dots and the line sit low, over Loc (user, 2026-10-27). Smug and silent (no lines here:
 * user, 2026-10-15). Done goes back to Home. Opened once per morning by Home (`usePayoff`), and
 * from the wake preview with made-up facts.
 */
export function PayoffScreen({ facts }: { facts: PayoffFacts }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const short = height < SHORT_SCREEN;
  const { mornings, today, won, upAt, earliest, sayKey } = facts;
  // The sky is laid out over Home's tab strip, so the moon and the panel are Home's exactly; the
  // payoff's own strip is taller (Done, Share under it), drawn over the sky's foot as a black band
  // with the panel's corners, and drops to Home's on the way back (`drop`).
  const homeStrip = tabStripHeight(insets.bottom);
  const strip = Space.l + CTA_HEIGHT + Space.s + SHARE_ROW + Math.max(insets.bottom, Space.l);
  const lift = Math.max(0, strip - homeStrip);
  // Loc's canvas runs the panel's full width, so he can wander along the edge.
  const locH = Math.round((width * LOC_SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  // The moon rises to the top with the time you got up inside it; the line, the stats and the
  // week sit low, just over Loc (user, 2026-10-27). Too short a screen and the moon's top goes
  // under the status bar rather than squeeze them.
  const moonSize = Math.round(restingMoonDisc(width, height).r * 2);
  const locTop = height - strip - locH;
  const moonTop = Math.round(Math.max(insets.top - moonSize * 0.22, Math.min(insets.top + Space.l + MOON_GAP, locTop - BELOW_MIN - moonSize)));
  const sinkTo = moonSinkForTop(width, height, homeStrip, moonTop);
  // Where the yell sends the moon, read when he yells: kept in step after each render, not
  // written during it.
  const moonTo = useRef(sinkTo);
  useEffect(() => {
    moonTo.current = sinkTo;
  }, [sinkTo]);
  // The moon waits out of sight until Loc yells (loc-rig.ts, YELL): then the phone buzzes and it
  // rises behind him, and the page comes into focus as it nears the top.
  const [shown, setShown] = useState(false);
  const yelled = useRef(false);
  // Tap him and he yells again (user, 2026-10-27: he shouldn't just sit there once it's over).
  const [yells, setYells] = useState(1);
  const leaving = useRef(false);
  const onTap = useCallback(() => {
    if (yelled.current && !leaving.current) setYells((n) => n + 1);
  }, []);
  // A picture of him at the top of his first yell, for the share card.
  const [snaps, setSnaps] = useState(0);
  const [locShot, setLocShot] = useState<string | null>(null);
  const onYell = useCallback(() => {
    haptic.done();
    if (yelled.current) return;
    yelled.current = true;
    moonSink.set(reduced ? moonTo.current : withTiming(moonTo.current, { duration: RISE_MS, easing: RISE }));
    setTimeout(() => setShown(true), reduced ? 0 : PAGE_AT_MS);
    setTimeout(() => setSnaps(1), SNAP_MS);
  }, [reduced]);
  // His line once the page is in (user, 2026-10-27: Loc's voice instead of a log line), said once:
  // Home won't say its wake-up line again after it.
  const [line] = useState(() => payoffMoment(mornings, Math.random));
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    if (!shown) return;
    const up = setTimeout(() => {
      setSaid(locSpecial(line));
      if (sayKey !== null) markLocSaid(`${sayKey}woke:${today}`);
    }, reduced ? 0 : LINE_AT_MS);
    const down = setTimeout(() => setSaid(null), (reduced ? 0 : LINE_AT_MS) + LINE_MS);
    return () => {
      clearTimeout(up);
      clearTimeout(down);
    };
  }, [shown, reduced, line, sayKey, today]);
  // Home's moon is the same one: back to where Home rests it (`HOME_SINK`) on the way back. Never a value
  // read here: this opens as Home is focused, mid its sink animation, and on iOS a read right
  // after that `.set()` can be stale (the old tab's sunk moon).
  useEffect(() => {
    moonSink.set(MOON_SHOWS_FROM);
    const fallback = setTimeout(onYell, YELL_FALLBACK_MS);
    return () => {
      clearTimeout(fallback);
      moonSink.set(HOME_SINK);
      // Never leave Home's pieces hidden, however this screen goes.
      if (leaving.current) homeEntrance.play();
    };
  }, [onYell]);
  const days = weekDays(today, won);
  const week = days.filter((d) => d.done).length;
  const up = clockParts(upAt);
  const best = clockParts(earliest);
  // The page, faded out as a whole on the way back; the sky, the strip and Loc stay. Then the
  // strip's edge and Loc drop to Home's strip.
  const page = useSharedValue(1);
  const pageStyle = useAnimatedStyle(() => ({ opacity: page.get() }));
  const drop = useSharedValue(0);
  const dropStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.get() }] }));
  const screen = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.get() }));
  const navigation = useNavigation();
  const close = () => {
    if (leaving.current) return;
    leaving.current = true;
    setSaid(null);
    homeEntrance.hide();
    const back = () => {
      // Already dissolved: the stack's own fade would only be a pause.
      navigation.setOptions({ animation: 'none' });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    };
    if (reduced) {
      moonSink.set(HOME_SINK);
      drop.set(lift);
      homeEntrance.play();
      back();
      return;
    }
    page.set(withTiming(0, { duration: OUT_MS, easing: Easing.out(Easing.cubic) }));
    const settle = { duration: SETTLE_MS, easing: SETTLE };
    moonSink.set(withDelay(SETTLE_AT_MS, withTiming(HOME_SINK, settle)));
    drop.set(withDelay(SETTLE_AT_MS, withTiming(lift, settle)));
    // Then away over Home, as Home's pieces start coming into focus.
    const settled = SETTLE_AT_MS + SETTLE_MS;
    // Home's Loc keeps anything he'd say until its six pieces are in focus.
    holdLocLines(settled + REPLAY_START_MS + 5 * FOCUS_STEP_MS + FOCUS_MS);
    screen.set(withDelay(settled, withTiming(0, { duration: DISSOLVE_MS, easing: Easing.inOut(Easing.quad) })));
    setTimeout(() => homeEntrance.play(), settled);
    setTimeout(back, settled + DISSOLVE_MS + 30);
  };
  // Share sends the card: the screen as a picture (share-card.tsx), with the line as its caption.
  const [cards, setCards] = useState(0);
  const card: CardFacts = {
    value: up.value,
    unit: up.unit,
    kicker: payoffKicker(mornings),
    stats: [
      { value: `${best.value} ${best.unit}`, label: 'earliest this week', icon: 'sunrise' },
      { value: `${week}/7`, label: 'this week', icon: 'calendar' },
    ],
    days: days.map((d) => ({ letter: d.letter, done: d.done, today: d.today })),
  };
  const share = () => {
    haptic.tap();
    setCards((n) => n + 1);
  };
  const onCard = useCallback(
    async (png: string) => {
      const message = shareText(mornings, upAt);
      const base64 = png.slice(png.indexOf(',') + 1);
      if (Platform.OS === 'web') {
        // The browser preview: save the picture, so it can be looked at.
        const a = document.createElement('a');
        a.href = png;
        a.download = `locturne-${today}.png`;
        a.click();
        return;
      }
      try {
        const file = new File(Paths.cache, `locturne-${today}.png`);
        if (file.exists) file.delete();
        file.create();
        file.write(base64, { encoding: 'base64' });
        await Share.share({ url: file.uri, message });
      } catch {
        // No picture to send: the line on its own still goes.
        Share.share({ message }).catch(() => {});
      }
    },
    [mornings, upAt, today],
  );
  const dom = useMemo(
    () => ({
      style: { width, height: locH, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
    [width, locH],
  );

  return (
    // Dissolved over Home at the end of the way back (`screen`).
    <Animated.View style={[styles.screen, screenStyle]}>
    {/* Its own corners ride the band below: the background's would sit across Done. */}
    <AppBackground panel strip={homeStrip} corners={false}>
      <Animated.View style={[StyleSheet.absoluteFill, pageStyle]} pointerEvents="box-none">
      {/* Inside the risen moon. */}
      <View style={[styles.inMoon, { top: moonTop, height: moonSize }]} pointerEvents="none">
        <In shown={shown} step={0} style={styles.time} accessible accessibilityRole="header" accessibilityLabel={`Up at ${up.value} ${up.unit}, ${payoffKicker(mornings)}`}>
            <Text style={styles.timeKicker}>Up at</Text>
            <View style={styles.timeRow}>
              <Text style={styles.timeValue} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
                {up.value}
              </Text>
              <Text style={styles.timeUnit} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
                {up.unit}
              </Text>
            </View>
            <Text style={styles.kicker}>{payoffKicker(mornings)}</Text>
          </In>
      </View>

      <View style={[styles.panel, { paddingBottom: strip + locH + BUBBLE_ROOM }]} pointerEvents="box-none">
        <View style={[styles.low, short && styles.lowShort]}>
          <In shown={shown} step={1} style={styles.stats}>
            <Stat value={`${best.value} ${best.unit}`} label="earliest this week" icon={sym('sunrise.fill', 'wb_twilight')} />
            <View style={styles.statRule} />
            <Stat value={`${week}/7`} label="this week" icon={sym('calendar', 'calendar_today')} />
          </In>

          <In shown={shown} step={2} style={styles.week}>
            <WeekStrip days={days} reduced={reduced} />
          </In>
        </View>
      </View>
      </Animated.View>

      {/* The payoff's strip, over the foot of the sky: its top edge is the panel's edge here. */}
      <Animated.View style={[styles.band, { top: height - strip - PANEL_RADIUS }, dropStyle]} pointerEvents="box-none">
        <View style={styles.corners} pointerEvents="none">
          <Svg width={PANEL_RADIUS} height={PANEL_RADIUS}>
            <Path d={CORNER} fill="#000000" />
          </Svg>
          <Svg width={PANEL_RADIUS} height={PANEL_RADIUS} style={styles.mirrored}>
            <Path d={CORNER} fill="#000000" />
          </Svg>
        </View>
        <View style={styles.strip}>
          <Animated.View style={[{ height: strip, paddingBottom: Math.max(insets.bottom, Space.l) }, pageStyle]}>
            <In shown={shown} step={3} style={styles.actions}>
              <PrimaryButton label="Done" onPress={close} />
              <TextButton label="Share" onPress={share} />
            </In>
          </Animated.View>
        </View>
      </Animated.View>

      {/* On the panel's edge, as on Home; one point past it so no hairline of sky shows under him. */}
      <Animated.View
        style={[styles.loc, { height: locH, bottom: strip - 1 }, dropStyle]}
        accessible
        accessibilityLabel="Loc, the raccoon"
      >
        <LocStage
          mood="smug"
          share={LOC_SHARE}
          present
          yellNonce={yells}
          onYell={onYell}
          onTap={onTap}
          snapNonce={snaps}
          onSnap={setLocShot}
          dom={dom}
        />
      </Animated.View>
      {said ? (
        <View style={[styles.speech, { bottom: strip + Math.round(locH * BUBBLE_AT) }]} pointerEvents="box-none">
          <LocBubble line={said} room={BUBBLE_ROOM + locH * (1 - BUBBLE_AT)} wide={Math.min(width - 32, 320)} onDismiss={() => setSaid(null)} />
        </View>
      ) : null}
      {cards > 0 ? (
        <View style={styles.offstage} pointerEvents="none">
          <ShareCard facts={card} loc={locShot} nonce={cards} onCard={onCard} dom={{ style: { width: 1, height: 1 } }} />
        </View>
      ) : null}
    </AppBackground>
    </Animated.View>
  );
}

/**
 * A piece of the page, laid out from the start but unseen until the moon is nearly up, then
 * coming into focus out of a blur in its turn: onboarding's `focus` (components/motion.tsx).
 */
function In({
  shown,
  step,
  style,
  children,
  ...rest
}: PropsWithChildren<{ shown: boolean; step: number; style?: StyleProp<ViewStyle> } & Omit<React.ComponentProps<typeof View>, 'style'>>) {
  const reduced = useReducedMotion();
  const enter = shown && !reduced;
  return (
    <Animated.View
      {...rest}
      pointerEvents={shown ? 'auto' : 'none'}
      style={[style, { opacity: shown ? 1 : 0 }, enter && focusIn(step * STEP_MS)]}
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


const styles = StyleSheet.create({
  screen: { flex: 1 },
  panel: { ...StyleSheet.absoluteFill, paddingHorizontal: Gap.gutter, justifyContent: 'flex-end' },
  // "Morning 12", under the time inside the moon (user, 2026-10-27).
  kicker: { ...Type.label, textAlign: 'center', marginTop: Space.s },
  inMoon: { position: 'absolute', left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  low: { alignItems: 'center', gap: Space.l },
  lowShort: { gap: Space.m },
  loc: { position: 'absolute', left: 0, right: 0 },
  // Black under the panel, as under Home's; Done sits where the tabs would.
  // The payoff's strip: black, reaching past the screen's foot so it stays covered as it drops.
  band: { position: 'absolute', left: 0, right: 0, bottom: -400 },
  corners: { height: PANEL_RADIUS, flexDirection: 'row', justifyContent: 'space-between' },
  mirrored: { transform: [{ scaleX: -1 }] },
  strip: { flex: 1, backgroundColor: '#000000', paddingTop: Space.l, paddingHorizontal: Gap.gutter },
  time: { alignItems: 'center' },
  timeKicker: { ...Type.secondary, color: Nocturne.text2 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  timeValue: { ...NUMBER_FONT, fontSize: 64, lineHeight: 72, letterSpacing: -1.5, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  timeUnit: { ...DisplayFont, fontSize: VoiceSize.aside, color: Nocturne.text2 },
  speech: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  // The share card's webview: painted, never seen.
  offstage: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: Space.xl },
  stat: { alignItems: 'center', gap: 2, minWidth: 96 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { ...NUMBER_FONT, fontSize: 22, color: Nocturne.text },
  statLabel: { ...Type.caption, color: Nocturne.text3 },
  statRule: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: Nocturne.edge },
  week: { alignSelf: 'center', maxWidth: 340, width: '100%' },
  actions: { gap: Space.s, alignItems: 'stretch' },
});
