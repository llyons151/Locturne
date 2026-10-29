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
import { MOON_SHOWS_FROM, moonScale, moonSink, moonSinkForCentre, restingMoonDisc } from '@/components/night-sky';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { CTA_HEIGHT, DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import { homeEntrance, REPLAY_START_MS } from '../home/entrance';
import { holdLocLines, markLocSaid, passLocPose } from '../home/loc';
import { LocBubble } from '../home/loc-bubble';
import { locSpecial } from '../home/loc-lines';
import { LOC_VIEW } from '../home/loc-rig';
import LocStage from '../home/loc-stage';
import { weekDays } from '../home/week';
import { homeWeekSpot } from '../home/week-spot';
import { WeekStrip } from '../home/week-strip';
import { APPS_AWAKE, clockParts, payoffBrag, payoffKicker, payoffMoment, shareText } from './payoff';
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
  /** Past mornings this week no night locked (`WeekDay.free`), as Home has them, so the two weeks match. */
  free: Set<string>;
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
 * Room over Done, from the panel's edge; Share's row sits right under it. Done hugged the edge
 * with an empty band under Share (user, 2026-10-28: "the spacing just looks a little off").
 */
const STRIP_TOP = Space.xl;

/**
 * Done hands back to Home (user, 2026-10-27: "flawless"), one thing after another: the page
 * fades out; then everything moves back to where Home has it, together on one curve (the moon
 * sinks, the panel's edge and Loc drop to Home's strip); then this screen goes and Home's own
 * entrance fades its pieces in. Home is underneath all along, so nothing has to load.
 */
const OUT_MS = 320;
const SETTLE_AT_MS = 160;
/**
 * Slow, with a soft start and a long landing (user, 2026-10-28: the week "rushes into frame…
 * needs to feel buttery smooth"; was 720 ms on a symmetric ease-in-out).
 */
const SETTLE_MS = 1150;
const SETTLE = Easing.bezier(0.33, 0, 0.15, 1);
/** Last, the screen dissolves over Home (identical by then but for Loc's pose and the tabs). */
// Short: by now only the sky, Loc and the strip are left, and Home's pieces wait for it to go.
const DISSOLVE_MS = 220;
/**
 * His pose goes over to Home's Loc this long before the dissolve (`passLocPose`), so the trip
 * from one webview to the other is over and both show the same raccoon as it starts (user
 * 2026-10-28: he glitched back to Home's own pose).
 */
const PASS_LEAD_MS = 160;

/** The moon's rise behind him once he yells, all the way to the top: quick off the edge, a long settle. */
const RISE_MS = 2200;
const RISE = Easing.bezier(0.16, 1, 0.3, 1);
/** The page comes into focus this far into the rise, as the moon nears the top. */
const PAGE_AT_MS = 1100;
/**
 * The risen moon, small, with the time inside (Bloom's day ring, user 2026-10-28): its diameter
 * as a share of the screen's width, at most this many points, and the room over it.
 */
const MOON_SHARE = 0.46;
const MOON_MAX = 190;
const MOON_GAP = Space.xl;

/** Loc's line comes up this long after the page starts coming into focus, and stays till Done (user, 2026-10-28: the band over him sat empty once it went). */
const LINE_AT_MS = 1600;
/** Home's week is its entrance's step 1 (entrance.ts): left in place for ours to land on. */
const HOME_WEEK_STEP = 1;
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
  const { mornings, today, won, free, upAt, start, earliest, sayKey } = facts;
  // The sky is laid out over Home's tab strip, so the moon and the panel are Home's exactly; the
  // payoff's own strip is taller (Done, Share under it), drawn over the sky's foot as a black band
  // with the panel's corners, and drops to Home's on the way back (`drop`).
  const homeStrip = tabStripHeight(insets.bottom);
  // Share's row has its own air round the label, so the foot can give back some of the home bar's inset.
  // (user, 2026-10-28: too much space below Share).
  const foot = Math.max(insets.bottom - Space.l, Space.s);
  const strip = STRIP_TOP + CTA_HEIGHT + Space.xs + SHARE_ROW + foot;
  const lift = Math.max(0, strip - homeStrip);
  // Loc's canvas runs the panel's full width, so he can wander along the edge.
  const locH = Math.round((width * LOC_SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  // The moon rises to the top and shrinks as it goes, into a small moon with the time inside;
  // under it the headline and the apps, then this week (Bloom's layout, user 2026-10-28).
  const moonSize = Math.round(Math.min(width * MOON_SHARE, MOON_MAX) * (short ? 0.7 : 1));
  const moonTop = insets.top + (short ? Space.s : MOON_GAP);
  const sinkTo = moonSinkForCentre(width, height, homeStrip, moonTop + moonSize / 2);
  const scaleTo = moonSize / (restingMoonDisc(width, height).r * 2);
  // Where the yell sends the moon, read when he yells: kept in step after each render, not
  // written during it.
  const moonTo = useRef({ sink: sinkTo, scale: scaleTo });
  useEffect(() => {
    moonTo.current = { sink: sinkTo, scale: scaleTo };
  }, [sinkTo, scaleTo]);
  // The moon waits out of sight until Loc yells (loc-rig.ts, YELL): then the phone buzzes and it
  // rises behind him, and the page comes into focus as it nears the top.
  const [shown, setShown] = useState(false);
  const yelled = useRef(false);
  // Tap him and he yells again (user, 2026-10-27: he shouldn't just sit there once it's over).
  const [yells, setYells] = useState(1);
  // Bumped on the way back: his pose goes to Home's Loc (`passLocPose`).
  const [passes, setPasses] = useState(0);
  const leaving = useRef(false);
  // Home's entrance is played once on the way back, whichever comes first: the hand-back or
  // this screen unmounting (which must never leave Home's pieces hidden). A second play restarts it.
  const handedBack = useRef(false);
  const handBack = useCallback(() => {
    if (handedBack.current) return;
    handedBack.current = true;
    homeEntrance.play();
  }, []);
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
    const to = moonTo.current;
    moonSink.set(reduced ? to.sink : withTiming(to.sink, { duration: RISE_MS, easing: RISE }));
    moonScale.set(reduced ? to.scale : withTiming(to.scale, { duration: RISE_MS, easing: RISE }));
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
    return () => clearTimeout(up);
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
      moonScale.set(1);
      // Never leave Home's pieces hidden, however this screen goes.
      if (leaving.current) handBack();
    };
  }, [onYell, handBack]);
  const days = weekDays(today, won, free);
  const week = days.filter((d) => d.done).length;
  const up = clockParts(upAt);
  // Only a fact that flatters today (user, 2026-10-28); otherwise the apps stand alone.
  const brag = payoffBrag(upAt, start, earliest, week);
  // The page, faded out as a whole on the way back; the sky, the strip and Loc stay. Then the
  // strip's edge and Loc drop to Home's strip.
  const page = useSharedValue(1);
  const pageStyle = useAnimatedStyle(() => ({ opacity: page.get() }));
  const drop = useSharedValue(0);
  const dropStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drop.get() }] }));
  const screen = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.get() }));
  // On Done the week doesn't fade: it flies up onto Home's (week-spot.ts), on the moon's curve.
  const weekRef = useRef<View>(null);
  const flyX = useSharedValue(0);
  const flyY = useSharedValue(0);
  const weekOut = useSharedValue(1);
  const weekOutStyle = useAnimatedStyle(() => ({ opacity: weekOut.get() }));
  const flyStyle = useAnimatedStyle(() => ({ transform: [{ translateX: flyX.get() }, { translateY: flyY.get() }] }));
  const navigation = useNavigation();
  const close = () => {
    if (leaving.current) return;
    leaving.current = true;
    setSaid(null);
    // Home's week stays put for ours to land on; with nowhere to land, it all fades as before.
    const spot = homeWeekSpot();
    homeEntrance.hide(spot ? [HOME_WEEK_STEP] : []);
    if (!spot) weekOut.set(withTiming(0, { duration: OUT_MS, easing: Easing.out(Easing.cubic) }));
    const back = () => {
      // Already dissolved: the stack's own fade would only be a pause.
      navigation.setOptions({ animation: 'none' });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    };
    if (reduced) {
      moonSink.set(HOME_SINK);
      moonScale.set(1);
      drop.set(lift);
      back();
      handBack();
      return;
    }
    page.set(withTiming(0, { duration: OUT_MS, easing: Easing.out(Easing.cubic) }));
    const settle = { duration: SETTLE_MS, easing: SETTLE };
    moonSink.set(withDelay(SETTLE_AT_MS, withTiming(HOME_SINK, settle)));
    moonScale.set(withDelay(SETTLE_AT_MS, withTiming(1, settle)));
    drop.set(withDelay(SETTLE_AT_MS, withTiming(lift, settle)));
    weekRef.current?.measureInWindow((x, y) => {
      if (!spot) return;
      flyX.set(withDelay(SETTLE_AT_MS, withTiming(spot.x - x, settle)));
      flyY.set(withDelay(SETTLE_AT_MS, withTiming(spot.y - y, settle)));
    });
    // Then away over Home, as Home's pieces start coming into focus.
    const settled = SETTLE_AT_MS + SETTLE_MS;
    // Home's Loc keeps anything he'd say until its six pieces are in focus.
    const gone = settled + DISSOLVE_MS + 30;
    holdLocLines(gone + REPLAY_START_MS + 5 * FOCUS_STEP_MS + FOCUS_MS);
    setTimeout(() => setPasses((n) => n + 1), Math.max(0, settled - PASS_LEAD_MS));
    screen.set(withDelay(settled, withTiming(0, { duration: DISSOLVE_MS, easing: Easing.inOut(Easing.quad) })));
    // Home's pieces come in once this screen has gone, not under it: closing it is heavy work,
    // and the entrance started first stalled halfway, then played again from unmounting, so it
    // faded in, stopped, and faded in again (user, 2026-10-28).
    setTimeout(() => {
      back();
      requestAnimationFrame(handBack);
    }, gone);
  };
  // Share sends the card: the screen as a picture (share-card.tsx), with the line as its caption.
  const [cards, setCards] = useState(0);
  const card: CardFacts = {
    value: up.value,
    unit: up.unit,
    kicker: payoffKicker(mornings),
    reward: APPS_AWAKE.replace('\n', ' '),
    brag,
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
      {/* Everything here fades on Done (`pageStyle`) but the week, which flies up onto Home's. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Inside the risen moon. */}
      <Animated.View style={[styles.inMoon, { top: moonTop, height: moonSize }, pageStyle]} pointerEvents="none">
        {/* A shade over the moon's bright middle, so the time reads on the frost (payoff lab #2). */}
        <In shown={shown} step={0} style={[styles.shade, { width: moonSize, height: moonSize }]}>
          <Svg width={moonSize} height={moonSize}>
            <Defs>
              <RadialGradient id="payoff-moon-shade" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#060B18" stopOpacity={0.42} />
                <Stop offset="0.6" stopColor="#060B18" stopOpacity={0.26} />
                <Stop offset="1" stopColor="#060B18" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={moonSize / 2} cy={moonSize / 2} r={moonSize / 2} fill="url(#payoff-moon-shade)" />
          </Svg>
        </In>
        <In shown={shown} step={0} style={styles.time} accessible accessibilityRole="header" accessibilityLabel={`Up at ${up.value} ${up.unit}, ${payoffKicker(mornings)}`}>
          <View style={styles.timeRow}>
            <Text style={[styles.timeValue, short && styles.timeValueShort]} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
              {up.value}
            </Text>
            <Text style={styles.timeUnit} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
              {up.unit}
            </Text>
          </View>
          <Text style={styles.kicker}>{payoffKicker(mornings)}</Text>
        </In>
      </Animated.View>

      {/* Under it (payoff lab #2, user 2026-10-28): the headline, the brag when there is one, then this week. */}
      {/* Centred in the sky between the moon and Loc's line (user, 2026-10-28: too high, too close to the moon). */}
      <View
        style={[styles.below, { top: moonTop + moonSize + Space.l, bottom: strip + Math.round(locH * BUBBLE_AT) + BUBBLE_ROOM }]}
        pointerEvents="box-none"
      >
        <Animated.View style={pageStyle}>
        <In shown={shown} step={1} style={styles.reward} accessible accessibilityLabel={[APPS_AWAKE.replace('\n', ' '), brag].filter(Boolean).join(' ')}>
          <Text style={[styles.heading, short && styles.headingShort]}>{APPS_AWAKE}</Text>
          {/* An SE has no room for it under the two-line headline. */}
          {brag && !short ? <Text style={styles.brag}>{brag}</Text> : null}
        </In>
        </Animated.View>
        <In shown={shown} step={2} style={[styles.week, short && styles.weekShort]}>
          <Animated.Text style={[styles.weekLabel, pageStyle]}>This week</Animated.Text>
          {/* Home's week dots, the mist ones on iPhone (week-strip.ios.tsx; user, 2026-10-28). */}
          <Animated.View ref={weekRef} style={[flyStyle, weekOutStyle]}>
            <WeekStrip days={days} reduced={reduced} />
          </Animated.View>
        </In>
      </View>
      </View>

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
          <Animated.View style={[{ height: strip, paddingBottom: foot }, pageStyle]}>
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
          passNonce={passes}
          onPass={passLocPose}
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // "Morning 12", under the time inside the moon (user, 2026-10-27).
  kicker: { ...Type.label, textAlign: 'center', marginTop: Space.xs },
  inMoon: { position: 'absolute', left: 0, right: 0, justifyContent: 'center', alignItems: 'center' },
  // The night's own navy over the moon's middle, gone by its rim, so it never shows an edge.
  shade: { position: 'absolute' },
  loc: { position: 'absolute', left: 0, right: 0 },
  // Black under the panel, as under Home's; Done sits where the tabs would.
  // The payoff's strip: black, reaching past the screen's foot so it stays covered as it drops.
  band: { position: 'absolute', left: 0, right: 0, bottom: -400 },
  corners: { height: PANEL_RADIUS, flexDirection: 'row', justifyContent: 'space-between' },
  mirrored: { transform: [{ scaleX: -1 }] },
  strip: { flex: 1, backgroundColor: '#000000', paddingTop: STRIP_TOP, paddingHorizontal: Gap.gutter },
  time: { alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  timeValue: { ...NUMBER_FONT, fontSize: 48, lineHeight: 54, letterSpacing: -1.2, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  timeValueShort: { fontSize: 34, lineHeight: 40 },
  timeUnit: { ...DisplayFont, fontSize: VoiceSize.aside, color: Nocturne.text2 },
  speech: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  // The share card's webview: painted, never seen.
  offstage: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, opacity: 0 },
  below: { position: 'absolute', left: Gap.gutter, right: Gap.gutter, alignItems: 'center', justifyContent: 'center' },
  reward: { alignItems: 'center', gap: Space.s },
  // Onboarding's page title (user, 2026-10-28: Bloom's "You're on a roll!").
  heading: { ...Type.heading, color: Nocturne.text, textAlign: 'center' },
  headingShort: Type.headingCompact,
  brag: { ...Type.headingSub, color: Nocturne.text2, textAlign: 'center' },
  // Full width between the gutters, as Home's, so the dots land on Home's exactly.
  week: { alignSelf: 'stretch', marginTop: Space.xxxl, gap: Space.m },
  weekShort: { marginTop: Space.xl, gap: Space.s },
  // Bloom's "THIS WEEK" over the dots.
  weekLabel: { ...Type.label, textAlign: 'center' },
  actions: { gap: Space.xs, alignItems: 'stretch' },
});
