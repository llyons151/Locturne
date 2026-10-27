import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cubicBezier, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { DayDotsView, isDayDotsViewAvailable } from 'day-dots';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/text';

import * as haptic from '@/lib/haptics';
import { noOrphan } from '@/lib/text';
import { Reveal } from '@/components/motion';
import { APP_FONT, Nocturne, Space, Type, VoiceSize } from '@/theme';

import { SKIPPED_REVEAL, type Answers } from '../content';
import { daysOver, LEAD_WHERE, leadFor, weeklyAmount, type Estimate } from '../estimate';
import { AMOUNT_BLUE, Body, page, useLeaving, Voice } from '../ui';

/**
 * The build-up, in ms from the page landing (user 2026-10-26: "build the anticipation"): the
 * screen has already gone dark and the glow come up behind it; then a line at a time, then the
 * number spins in, then the dots fill as the payoff.
 */
const BEAT_AT_MS = [700, 2200, 3700];
/** The days counting up in their line, slowing as they land. */
const NUMBER_MS = 1800;
/** After the total lands, the dots start filling. */
const DOTS_AFTER_MS = 900;
/** After the dots fill, the button comes in. */
const PAYOFF_AFTER_MS = 400;
/**
 * The way out to `build`, one scene with it (user 2026-10-26): the dots drop off the bottom,
 * the lowest row first, and only then does the moon come up with Loc. The flow holds the page
 * this long (`held`), so `build` waits for it.
 */
export const REVEAL_EXIT_MS = 760;
/** One row's fall, and the most the rows are spread over: a tall grid staggers tighter. */
const FALL_MS = 520;
const FALL_SPREAD_MS = 240;
/** Gathering speed, like something let go of. */
const FALL_EASING = cubicBezier(0.55, 0, 0.9, 0.45) as unknown as string;
/** The dots filling, from none to theirs, slowing as they get there. */
const COUNT_MS = 2400;

/**
 * The big number, the way Jomo shows it (user, 2026-10-26; docs/REVEAL_SCREEN_INSPO.md): Loc on
 * top, "At this rate / You're going to spend / 754 days / of your life on your phone in bed",
 * then one dot per day filling in under it. A lifetime from their `age` answer to
 * AVERAGE_LIFESPAN; skipped, it's one year. The number is their branch's end of the night
 * (`leadFor`). What they'd do with the time is the next step (`time-back`).
 */
export function RevealScreen({
  numbers,
  answers,
  onPayoff,
}: {
  numbers: Estimate;
  /** The branch picks which end of the night the number counts. */
  answers: Pick<Answers, 'pain' | 'worstTime'>;
  onPayoff?: () => void;
}) {
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(false);
  const [payoff, setPayoff] = useState(false);
  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setPayoff(true), reduced ? 0 : PAYOFF_AFTER_MS);
    return () => clearTimeout(timer);
  }, [landed, reduced]);
  // A light user's page (and a skipper's, also `lightUser`) has nothing to wait for.
  const payoffShown = payoff || numbers.lightUser;
  useEffect(() => {
    if (payoffShown) onPayoff?.();
  }, [payoffShown, onPayoff]);

  if (numbers.skipped) {
    return (
      <View style={page.top}>
        <Voice text={SKIPPED_REVEAL.headline} size={VoiceSize.headline} header />
        <View style={page.gapHeadline} />
        <Body>{SKIPPED_REVEAL.body}</Body>
      </View>
    );
  }

  if (numbers.lightUser) {
    return (
      <View style={page.top}>
        <Voice text="You’re barely on it." size={VoiceSize.headline} header />
        <View style={page.gapHeadline} />
        <Body>Only {weeklyAmount(numbers.weeklyMinutes)} a week. I’ll mostly handle mornings.</Body>
      </View>
    );
  }

  const lead = leadFor(numbers, answers.pain, answers.worstTime);
  // Their life from here if they gave an age (`age`), else one year.
  const life = numbers.yearsLeft > 0;
  const days = Math.max(1, daysOver(lead.minutes, life ? numbers.yearsLeft : 1));
  // Lines that lead up to the number, a beat each (DRAFT copy for the founder's voice pass), all
  // one size with just the amount picked out in light blue (user 2026-10-26). The second is their
  // own year (or week, when the big number is already the year), so the number reads as the sum
  // of something they can picture.
  const yearDays = daysOver(lead.minutes, 1);
  const where = LEAD_WHERE[lead.scope];
  const beats: Beat[] = [
    ['I did the math.'],
    life && yearDays >= 2
      ? ['That’s ', `${yearDays} days`, ` a year ${where}.`]
      : ['', weeklyAmount(lead.minutes), ` a week ${where}.`],
  ];
  // The last line is the total itself, counting up in place (user 2026-10-26: one line, so the
  // dots get the room).
  const tail = life ? ' over the rest of your life.' : ' a year.';
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${beats.map((b) => b.join('')).join(' ')} ${days.toLocaleString('en-US')} days${tail} Each dot is a day.`}
    >
      <Count value={days} beats={beats} tail={tail} onLanded={() => setLanded(true)} />
    </View>
  );
}

/**
 * The build-up and the payoff (user 2026-10-26): two lines a beat apart, then the total in a line
 * of its own, counting up in light blue and landing, then one dot a day fills in under it, row by
 * row (from Stardust's year calendar and MacroFactor's year strip). Dots, not squares: one a day
 * lands harder than one a week. Ticks as it counts and as the dots fill, a thud on the total.
 */
/** A line: plain text, then optionally the amount picked out in light blue, then the rest. */
type Beat = [string, string?, string?];

function Count({ value, beats, tail, onLanded }: { value: number; beats: Beat[]; tail: string; onLanded: () => void }) {
  const reduced = useReducedMotion();
  const leaving = useLeaving();
  // How many of the lines are up; the last is the total, which counts once it's there.
  const [beat, setBeat] = useState(reduced ? beats.length + 1 : 0);
  const [counted, setCounted] = useState(reduced ? value : 0);
  const [landed, setLanded] = useState(reduced);
  const [shown, setShown] = useState(reduced ? value : 0);
  // When the dots began to fill (epoch ms), for the native dots, which fill on the same clock.
  const [fillStart, setFillStart] = useState(reduced ? 1 : 0);
  // The space under the number, which the dots fill as a tall rectangle.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (reduced) {
      onLanded();
      return;
    }
    const timers = BEAT_AT_MS.map((at, i) => setTimeout(() => setBeat(i + 1), at));
    // The total counts up as its line comes into focus: ticks as it goes, a thud as it lands.
    let frame = 0;
    timers.push(
      setTimeout(() => {
        const began = Date.now();
        const ease = Easing.out(Easing.cubic);
        const tickEvery = Math.max(1, Math.ceil(value / 12));
        let last = 0;
        frame = requestAnimationFrame(function step() {
          const t = Math.min(1, (Date.now() - began) / NUMBER_MS);
          const n = Math.round(ease(t) * value);
          if (n !== last) {
            if (n < value && Math.floor(n / tickEvery) > Math.floor(last / tickEvery)) haptic.tick();
            last = n;
            setCounted(n);
          }
          if (t < 1) frame = requestAnimationFrame(step);
          else {
            haptic.thud();
            setLanded(true);
          }
        });
      }, BEAT_AT_MS[BEAT_AT_MS.length - 1]),
    );
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
    // The build-up runs once, when the page lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The dots: once the number has landed, they fill to it.
  useEffect(() => {
    if (!landed || reduced) return;
    // Eases in as well as out: a plain ease-out filled a dozen dots in the first frame.
    const ease = Easing.bezierFn(0.4, 0, 0.2, 1);
    const tickEvery = Math.max(1, Math.ceil(value / 12));
    let began = 0;
    let last = 0;
    let frame = 0;
    const wait = setTimeout(() => {
      began = Date.now();
      setFillStart(began);
      frame = requestAnimationFrame(function step() {
        const t = Math.min(1, (Date.now() - began) / COUNT_MS);
        const n = Math.round(ease(t) * value);
        if (n !== last) {
          if (n < value && Math.floor(n / tickEvery) > Math.floor(last / tickEvery)) haptic.tick();
          last = n;
          setShown(n);
        }
        if (t < 1) frame = requestAnimationFrame(step);
        else onLanded();
      });
    }, DOTS_AFTER_MS);
    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(frame);
    };
    // Runs once, when the number lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed]);
  // The total as it counts, padded to its final width with figure spaces (tabular digits), so the
  // centred line doesn't shuffle sideways as digits arrive.
  const final = value.toLocaleString('en-US');
  const now = counted.toLocaleString('en-US');
  const total = `${'\u2007'.repeat(Math.max(0, final.length - now.length))}${now} ${value === 1 ? 'day' : 'days'}`;
  // A line comes into focus like every onboarding line once its beat arrives; before that an
  // invisible copy holds its place, so nothing below moves.
  const line = (on: boolean, [before, amount, after]: Beat, style: object = styles.line) => {
    const text = (
      <Text style={[APP_FONT, style, !on && styles.hidden]} maxFontSizeMultiplier={1.3}>
        {amount ? before : noOrphan(before)}
        {amount ? <Text style={styles.amount}>{amount}</Text> : null}
        {after ? noOrphan(after) : null}
      </Text>
    );
    return on ? <Reveal>{text}</Reveal> : text;
  };
  return (
    <>
      <Animated.View style={[styles.hero, leaving && HERO_OUT]}>
        {/* What they told it, then what it comes to: two groups, with air between them. */}
        <View style={styles.group}>
          {line(beat >= 1, beats[0])}
          {line(beat >= 2, beats[1])}
        </View>
        {line(beat >= 3, ['', total, tail])}
      </Animated.View>
      {/* The dots in the middle of the space that's left, with their key under them. */}
      <View
        style={styles.dotsArea}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (!area || Math.abs(area.width - w) > 1 || Math.abs(area.height - h) > 1) setArea({ width: w, height: h });
        }}
      >
        <DayGrid days={value} shown={shown} fillStart={fillStart} falling={leaving} area={area} />
        <Animated.View style={leaving && HERO_OUT}>{line(shown >= value && landed, ['Each dot is a day.'], styles.caption)}</Animated.View>
      </View>
    </>
  );
}

/**
 * The largest dot pitch that fits `total` dots in the space, and no bigger than MAX_PITCH.
 * Whole points only: a fractional pitch left the fill's clip edge on the next dot's edge,
 * which showed as slivers along the rows still to come.
 */
function fit(total: number, width: number, height: number): { pitch: number; cols: number } {
  for (let pitch = MAX_PITCH; pitch > 2; pitch--) {
    const cols = Math.floor(width / pitch);
    if (cols > 0 && Math.ceil(total / cols) * pitch <= height) return { pitch, cols };
  }
  const pitch = 2;
  return { pitch, cols: Math.max(1, Math.floor(width / pitch)) };
}

/** Dots at their largest, for small counts; the gap is under a third of the pitch. */
const MAX_PITCH = 18;

/**
 * How long the dark takes to come down over the sky, and to lift (back to the quiz, or for
 * `build`'s moonrise). The same both ways, so coming in plays going back in reverse (user 2026-10-26).
 */
const DARK_MS = 1200;
/**
 * The glow at the top, in the moon's own colours (user 2026-10-26), sampled from its images: the
 * slate of its face (moon-frosted.png) in the middle, the brighter blue of its rim light
 * (moon-glow.png) toward the edge, then the dark.
 */
const MOON_FACE = '#5E7595';
const MOON_RIM = '#5880D2';
const GLOW_AFTER_MS = 900;
const GLOW_MS = 1800;
/**
 * The moon's way down off the screen under the reveal, and back up from there: a little slower
 * than the quiz's rise, so the fall doesn't rush (user 2026-10-26). It goes only as far as it's
 * out of sight (MOON_SHOWS_FROM), so the whole fall is one you can see.
 */
export const REVEAL_MOON_MS = 1600;
/**
 * The quiz's wash and moon leaving for the reveal: slower than any other way out of the quiz, so
 * the screen dims the way going back brightens it (user 2026-10-26).
 */
export const REVEAL_SKY_MS = 1500;

/**
 * The reveal is told in the dark (user 2026-10-26): the sky goes completely black, then a blue
 * glow comes up from the top, in the moon's blue. It lifts as `build` raises the moon behind Loc,
 * so the bad news and "now let's fix it" play as one scene. The flow draws it between the sky and
 * the pages.
 */
export function RevealDark({ shown }: { shown: boolean }) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const dark = useSharedValue(0);
  const glow = useSharedValue(0);
  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    if (reduced) {
      dark.set(shown ? 1 : 0);
      glow.set(shown ? 1 : 0);
      return;
    }
    dark.set(withTiming(shown ? 1 : 0, { duration: DARK_MS, easing: ease }));
    // The glow comes up once the screen has gone dark, and goes with it.
    glow.set(
      shown
        ? withDelay(GLOW_AFTER_MS, withTiming(1, { duration: GLOW_MS, easing: ease }))
        : withTiming(0, { duration: DARK_MS, easing: ease }),
    );
  }, [shown, reduced, dark, glow]);
  const darkStyle = useAnimatedStyle(() => ({ opacity: dark.get() }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.dark, darkStyle]} />
      {/* The user asked for this glow (2026-10-26): the moon's blue, from the top, on this page only. */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="reveal-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={MOON_FACE} stopOpacity={0.7} />
              <Stop offset="0.38" stopColor={MOON_FACE} stopOpacity={0.45} />
              <Stop offset="0.62" stopColor={MOON_RIM} stopOpacity={0.32} />
              <Stop offset="1" stopColor={MOON_RIM} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={width / 2} cy={-height * 0.06} rx={width * 0.95} ry={height * 0.42} fill="url(#reveal-glow)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A row of `cols` dots, `pitch` apart, as one path: the grid is this, once per row. */
function rowPath(cols: number, pitch: number) {
  const box = Math.max(1.5, pitch * 0.72);
  const r = (box / 2).toFixed(2);
  let d = '';
  for (let i = 0; i < cols; i++) {
    const x = i * pitch;
    d += `M${x.toFixed(2)} ${r}a${r} ${r} 0 1 0 ${box.toFixed(2)} 0a${r} ${r} 0 1 0 -${box.toFixed(2)} 0z`;
  }
  return { d, box };
}

/**
 * One dot per day, as rows of one drawn row, each shown up to the dots counted so far.
 * The page puts it under the number, taking only the height it needs, up to a share of the
 * screen. `falling`: the way out to `build`, every row dropping off the bottom of the screen.
 */
function DayGrid({
  days: total,
  shown,
  fillStart,
  falling,
  area,
}: {
  days: number;
  shown: number;
  fillStart: number;
  falling: boolean;
  /** The space it has, its key line included. */
  area: { width: number; height: number } | null;
}) {
  const { height: screen } = useWindowDimensions();
  // As big as the space allows, the full width, once its key line has room (user 2026-10-26: a
  // narrow 3:4 block read too small).
  const tall = area ? area.height - KEY_ROOM : 0;
  const layout = area && tall > 0 ? fit(total, area.width, tall) : null;
  const row = useMemo(() => {
    if (!layout) return null;
    const { d, box } = rowPath(layout.cols, layout.pitch);
    return {
      // Clip edges sit in the middle of the gap between dots, never on one.
      half: (layout.pitch - box) / 2,
      svg: (
        <Svg width={layout.cols * layout.pitch} height={layout.pitch}>
          <Path d={d} fill={Nocturne.cta} />
        </Svg>
      ),
    };
  }, [layout?.pitch, layout?.cols]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = layout ? Math.ceil(total / layout.cols) : 0;
  const lit = layout ? Math.ceil(shown / layout.cols) : 0;
  // The lowest row goes first, so the rows never pass through each other.
  const stagger = rows > 1 ? Math.min(45, FALL_SPREAD_MS / (rows - 1)) : 0;
  // On an iPhone the dots are Metal pearls (modules/day-dots); the SVG dots are the web's.
  if (NATIVE_DOTS) {
    const fallDistance = Math.round(screen * 0.7);
    return (
      <View
        style={styles.grid}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {layout ? (
          <View style={{ width: layout.cols * layout.pitch, height: rows * layout.pitch }}>
            <DayDotsView
              style={[styles.nativeDots, { width: layout.cols * layout.pitch, height: rows * layout.pitch + fallDistance }]}
              pointerEvents="none"
              total={total}
              cols={layout.cols}
              pitch={layout.pitch}
              fillStart={fillStart}
              fillMs={COUNT_MS}
              falling={falling}
              fallMs={FALL_MS}
              stagger={stagger}
              fallDistance={fallDistance}
            />
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View
      style={styles.grid}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {layout && row ? (
        <View style={{ width: layout.cols * layout.pitch, height: rows * layout.pitch - row.half * 2 }}>
          {Array.from({ length: lit }, (_, i) => {
            const count = Math.min(layout.cols, shown - i * layout.cols);
            return (
              <Animated.View
                key={i}
                style={[
                  styles.clip,
                  { top: i * layout.pitch, width: Math.max(0, count * layout.pitch - row.half), height: layout.pitch - row.half },
                  falling && fall(screen, (rows - 1 - i) * stagger),
                ]}
              >
                {row.svg}
              </Animated.View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Room kept under the grid for "Each dot is a day." and the space above the button. */
const KEY_ROOM = Space.m + Type.secondary.lineHeight + Space.l;
/** The Metal dots, on an iPhone whose build has them (a build from before falls back to SVG). */
const NATIVE_DOTS = Platform.OS === 'ios' && isDayDotsViewAvailable;

/** One row's drop: down past the bottom of the screen, fading as it goes. */
function fall(distance: number, delay: number) {
  return {
    animationName: {
      from: { opacity: 1, transform: [{ translateY: 0 }] },
      to: { opacity: 0, transform: [{ translateY: distance * 0.7 }] },
    },
    animationDuration: `${FALL_MS}ms`,
    animationDelay: `${delay}ms`,
    animationTimingFunction: FALL_EASING,
    animationFillMode: 'both',
  } as const;
}

/**
 * The number and its line on the way out: back into a blur where they stand, like any page.
 * The blur on the web only: iOS never draws it, and animating it forces the slow path (motion.tsx).
 */
const HERO_OUT = {
  animationName:
    Platform.OS === 'web'
      ? { from: { opacity: 1, filter: 'blur(0px)' }, to: { opacity: 0, filter: 'blur(8px)' } }
      : { from: { opacity: 1 }, to: { opacity: 0 } },
  animationDuration: '300ms',
  animationTimingFunction: 'ease-in',
  animationFillMode: 'forwards',
} as const;

const styles = StyleSheet.create({
  // The number, its line and the dots; the header is Home's hero (user 2026-10-26).
  dark: { backgroundColor: '#000000' },
  // The number, its line and the grid as one block from the top, like the other pages (user 2026-10-26).
  wrap: { flex: 1, paddingTop: Space.m },
  hero: { alignItems: 'center', gap: Space.xl },
  group: { alignItems: 'center', gap: Space.xs },
  dotsArea: { flex: 1, justifyContent: 'center', marginTop: Space.m },
  hidden: { opacity: 0 },
  // The first beat in white, the rest in the body grey, like a sentence building up to the number.
  // Every line the same: one size and weight, white, so only the amount stands out.
  line: { fontSize: 20, lineHeight: 27, fontWeight: '600', color: Nocturne.text, textAlign: 'center', maxWidth: 330 },
  amount: { color: AMOUNT_BLUE, fontVariant: ['tabular-nums'] },
  caption: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center', marginTop: Space.m },
  grid: { alignSelf: 'stretch', alignItems: 'center' },
  clip: { position: 'absolute', left: 0, overflow: 'hidden' },
  // Runs on past the grid down the screen, for the fall; the grid's own box keeps the layout.
  nativeDots: { position: 'absolute', left: 0, top: 0 },
});
