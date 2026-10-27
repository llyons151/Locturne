import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, makeMutable, useAnimatedStyle, useReducedMotion, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { MotionHold } from '@/components/motion';
import { MOON_SHOWS_FROM, moonSink, QUIZ_RISE_MS, restingMoonDisc } from '@/components/night-sky';
import LocStage from '@/features/home/loc-stage';
import { LEAVE_MS, LOC_VIEW, PANEL_CORNER } from '@/features/home/loc-rig';
import { thud } from '@/lib/haptics';
import { Gap, Space } from '@/theme';

import { EXIT_MS, SLIDE_IN_CURVE, SLIDE_IN_MS, SLIDE_OUT_MS, slideAnimation, Title, useLeaving } from '../ui';

/** His width as a share of the screen: the page's one big thing, like Home's Loc but larger. */
const SHARE = 0.56;
/** How much of the moon shows over the ground, as a share of its width. */
const MOON_SHOWS = 0.55;
/** How far the sink moves the moon per unit (night-sky.tsx's SINK_DEPTH). */
const SINK_DEPTH = 0.3;
const RISE = { duration: 900, easing: Easing.bezier(0.33, 0, 0.2, 1) };
/** The moon comes up with the ground, on its curve (ui.tsx's). */
const MOON_IN = { duration: SLIDE_IN_MS, easing: Easing.bezier(...SLIDE_IN_CURVE) };
/** From out of sight after the reveal: further to go, on the same curve. */
const MOON_UP = { duration: SLIDE_IN_MS + 300, easing: Easing.bezier(...SLIDE_IN_CURVE) };
/**
 * Down on its own curve, the one it leaves the quiz on (night-sky.tsx), not the ground's falling
 * curtain, which plunged it (user 2026-10-26). Starts with the ground, ends a little after.
 */
const MOON_OUT = { duration: QUIZ_RISE_MS, easing: Easing.bezier(0.65, 0, 0.35, 1) };
/** It follows the ground down a beat late, so it trails it instead of racing it (user 2026-10-26). */
const MOON_LAG_MS = 150;
/**
 * The ground's edge bends up into the screen's sides (user 2026-10-26: "round up, not down"),
 * on the same curve his covers bend on when the lump runs along it (loc-rig.ts), so they meet.
 */
const CORNER = PANEL_CORNER;
/** A corner's black: the square under the bend, the moon showing above it. Mirrored for the right. */
const CORNER_PATH = `M0 0 L0 ${CORNER} L${CORNER} ${CORNER} A${CORNER} ${CORNER} 0 0 1 0 0 Z`;

/**
 * The ground slides up once the last page's buttons have gone, and Loc comes up only once it's
 * landed; on the way out he leaves first, then the ground slides down without him (user
 * 2026-10-26). How long that way out takes, for the flow's swap.
 */
export const BUILD_ARRIVE_MS = EXIT_MS + SLIDE_IN_MS;
/**
 * After the reveal the moon is sunk out of sight: it rises on its own first, then the ground and
 * Loc slide up in front of it (user 2026-10-26). How long the slide waits for it.
 */
export const BUILD_RISE_FIRST_MS = 800;
/** Whether the moon is out of sight below the screen right now, so `build` raises it first. */
export const moonBelow = () => moonSink.get() > 1;
export const BUILD_EXIT_MS = LEAVE_MS + SLIDE_OUT_MS;

/** The ground's top in the window, for `BuildFloor`; -1 before it's measured. */
const groundTop = makeMutable(-1);

/**
 * The chapter break between the quiz and the setup (user's reference, 2026-10-26: a mascot
 * screen saying "now let's get it right"). Home's look on purpose: Loc in black, standing on
 * a black ground with the moon risen behind him, and the words on the ground under him.
 */
export function BuildChapter({ title }: { title: string }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const leaving = useLeaving();
  const ground = useRef<View>(null);
  const h = Math.round((width * SHARE * LOC_VIEW.height) / LOC_VIEW.width);
  // Read once on arrival: the moon's rise below changes it.
  const [wait] = useState(() => (!reduced && moonBelow() ? BUILD_RISE_FIRST_MS : 0));
  const [landed, setLanded] = useState(reduced);
  useEffect(() => {
    if (landed) return;
    const id = setTimeout(() => setLanded(true), BUILD_ARRIVE_MS + wait);
    return () => clearTimeout(id);
  }, [landed, wait]);

  // Raise the resting moon until its top `MOON_SHOWS` sits over the ground's edge, behind him.
  // Measured on the ground's slot, which never moves: the sliding sheet is inside it.
  const raise = useCallback(() => {
    ground.current?.measureInWindow((_x, top, _w, tall) => {
      if (!tall) return;
      groundTop.set(top);
      const disc = restingMoonDisc(width, height);
      const size = disc.r * 2;
      // Never so low it shows under the ground, behind the button.
      const want = Math.min(top - size * MOON_SHOWS, top + tall - size);
      const sink = (want - (disc.cy - disc.r)) / (size * SINK_DEPTH);
      // Sunk out of sight (after the reveal): it rises the whole way, from where it first shows,
      // so a little slower (user 2026-10-26).
      const below = moonSink.get() > 1;
      if (below) moonSink.set(Math.min(moonSink.get(), MOON_SHOWS_FROM));
      moonSink.set(reduced ? sink : withDelay(EXIT_MS, withTiming(sink, below ? MOON_UP : MOON_IN)));
    });
  }, [width, height, reduced]);
  // Back to its resting place for `method` (or the reveal, going back): with the ground, once
  // he's gone, and on unmount in case it never left (Reduce Motion skips the way out).
  // The drop outlasts the page, so unmounting mid-drop mustn't restart it: that was a bump.
  const dropping = useRef(false);
  useEffect(() => {
    if (!leaving) return;
    dropping.current = true;
    moonSink.set(withDelay(LEAVE_MS + MOON_LAG_MS, withTiming(0, MOON_OUT)));
  }, [leaving]);
  // The ground and his stage slide as one: his canvas draws the covers' corners when the lump runs.
  const slide = reduced ? null : leaving ? slideAnimation('out', height, LEAVE_MS) : slideAnimation('in', height, EXIT_MS + wait);
  useEffect(
    () => () => {
      if (!dropping.current) moonSink.set(reduced ? 0 : withTiming(0, RISE));
    },
    [reduced]
  );

  return (
    <View style={styles.page}>
      <Animated.View style={[styles.loc, { width, height: h }, slide]} accessible accessibilityLabel="Loc, the raccoon">
        <LocStage
          mood="awake"
          share={SHARE}
          present={landed && !leaving}
          burrowOnTap
          onTap={thud}
          dom={{
            style: { width, height: h, backgroundColor: 'transparent' },
            scrollEnabled: false,
            bounces: false,
            contentInsetAdjustmentBehavior: 'never',
          }}
        />
      </Animated.View>
      <View ref={ground} style={styles.slot} onLayout={raise}>
        <Animated.View style={[styles.ground, slide]}>
          <Svg width={CORNER} height={CORNER} style={[styles.corner, styles.cornerLeft]} pointerEvents="none">
            <Path d={CORNER_PATH} fill="#000000" />
          </Svg>
          <Svg width={CORNER} height={CORNER} style={[styles.corner, styles.cornerRight]} pointerEvents="none">
            <Path d={CORNER_PATH} fill="#000000" />
          </Svg>
          {/* The words wait until the ground has landed, so they don't blur in mid-slide. */}
          <MotionHold offset={reduced ? 0 : BUILD_ARRIVE_MS + wait}>
            <Title>{title}</Title>
          </MotionHold>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * The ground from its edge to the screen's bottom, behind the page: the page's own
 * ground stops at the button, and the moon's glow would show round it there. The flow draws
 * this between the sky and the page while `build` is up or leaving, and it slides with the
 * ground on the same animation, so no moon shows between them.
 */
export function BuildFloor({ leaving, after = 0 }: { leaving: boolean; /** A held last page's way out (the reveal's), waited for like the page is. */ after?: number }) {
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  // Fixed on arrival, like the footer's: `after` drops to 0 once the last page has gone. Coming
  // from the reveal it also waits for the moon to rise first.
  const [wait] = useState(() => after + (!reduced && moonBelow() ? BUILD_RISE_FIRST_MS : 0));
  const style = useAnimatedStyle(() => ({ top: groundTop.get() < 0 ? '100%' : groundTop.get() }));
  return (
    <Animated.View
      style={[styles.floor, style, !reduced && (leaving ? slideAnimation('out', height, LEAVE_MS) : slideAnimation('in', height, wait + EXIT_MS))]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#000000' },
  page: { flex: 1, justifyContent: 'flex-end' },
  // Full width, so a burrow's lump has the whole edge to travel along.
  loc: { alignSelf: 'center', marginBottom: -1 },
  // Out to the screen's sides and down to the button.
  slot: { marginHorizontal: -Gap.gutter, marginBottom: -Space.l },
  // The strip's black like Home's.
  ground: {
    backgroundColor: '#000000',
    paddingHorizontal: Gap.gutter,
    paddingTop: Space.xl,
    paddingBottom: Space.l * 2,
  },
  corner: { position: 'absolute', top: -CORNER },
  cornerLeft: { left: 0 },
  cornerRight: { right: 0, transform: [{ scaleX: -1 }] },
});
