import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Nocturne } from '@/constants/nocturne';

import * as haptic from './haptics';

/** How long the whole grid takes to fill, regardless of size. */
const FILL_MS = 1800;
/** With a `lit` subset: the beat between the grid filling and the lit squares turning on. */
const LIGHT_PAUSE_MS = 400;
/** How long the lit squares take to turn on, one after another. */
const LIGHT_MS = 1600;
/** Smallest square that still reads as a square on a phone. */
export const MIN_SQUARE = 7;
const MAX_SQUARE = 14;

const popIn = {
  from: { opacity: 0, transform: [{ scale: 0.2 }] },
  '60%': { opacity: 1, transform: [{ scale: 1.12 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};
/** Unlit squares: the rest of the grid, there but quiet. */
const DIM = 0.16;
/**
 * A lit square switching on over its dim self. Colour only, no scale: the squares are
 * a few pixels apart, so any growth makes neighbours run into each other.
 */
const lightUp = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};
/** The life grid's squares are tiny and tightly packed, so they appear without an overshoot. */
const fadeIn = {
  from: { opacity: 0, transform: [{ scale: 0.6 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};

export type GridFit = { size: number; gap: number; columns: number; rows: number };

/**
 * The biggest square size that fits `count` squares in `width` × `height`,
 * or null if even MIN_SQUARE squares would clip.
 */
export function fitSquares(count: number, width: number, height: number): GridFit | null {
  if (count <= 0 || width <= 0 || height <= 0) return null;
  for (let size = MAX_SQUARE; size >= MIN_SQUARE; size -= 1) {
    const gap = Math.max(2, Math.round(size * 0.25));
    const columns = Math.min(count, Math.floor((width + gap) / (size + gap)));
    if (columns < 1) continue;
    const rows = Math.ceil(count / columns);
    if (rows * size + (rows - 1) * gap <= height) return { size, gap, columns, rows };
  }
  return null;
}

type Props = {
  squares: number;
  fit: GridFit;
  startDelay?: number;
  /** When set, only the first `lit` squares are bright; the rest stay dim. */
  lit?: number;
  onFilled?: () => void;
};

/**
 * One square per hour or day over a year, or per month over a life, sized by `fitSquares`.
 * Squares pop in row by row with a light tick per row, then a final thud. With `lit`,
 * the whole grid first fills in dim, then the lit squares switch on one after another.
 * Each square runs a native CSS animation, so no per-frame JS work.
 */
export function RevealGrid({ squares, fit, startDelay = 0, lit = squares, onFilled }: Props) {
  const reduced = useReducedMotion();
  const { size, gap, columns, rows } = fit;

  useEffect(() => {
    if (squares === 0) {
      onFilled?.();
      return;
    }
    if (reduced) {
      const id = setTimeout(() => {
        haptic.thud();
        onFilled?.();
      }, startDelay);
      return () => clearTimeout(id);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Cap the ticks so a tall grid of tiny squares doesn't buzz nonstop.
    const ticks = Math.min(rows, 12);
    const perTick = FILL_MS / ticks;
    for (let tick = 0; tick < ticks; tick += 1) {
      timers.push(setTimeout(haptic.tick, startDelay + tick * perTick));
    }
    let end = startDelay + FILL_MS + 250;
    if (lit < squares) {
      // Second pass: ticks while the lit squares switch on, then the thud.
      const lightStart = startDelay + FILL_MS + LIGHT_PAUSE_MS;
      const lightTicks = Math.min(lit, 10);
      for (let tick = 0; tick < lightTicks; tick += 1) {
        timers.push(setTimeout(haptic.tick, lightStart + (tick * LIGHT_MS) / lightTicks));
      }
      end = lightStart + LIGHT_MS + 350;
    }
    timers.push(
      setTimeout(() => {
        haptic.thud();
        onFilled?.();
      }, end),
    );
    return () => timers.forEach(clearTimeout);
    // onFilled is intentionally excluded: the animation should run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squares, lit, rows, startDelay, reduced]);

  return (
    <View
      style={[
        styles.grid,
        { width: columns * size + (columns - 1) * gap, height: rows * size + (rows - 1) * gap },
      ]}
      accessible
      accessibilityLabel={`${squares} squares`}
    >
      <Squares count={squares} lit={lit} fit={fit} startDelay={startDelay} animate={!reduced} />
    </View>
  );
}

const Squares = memo(function Squares({
  count,
  lit,
  fit,
  startDelay,
  animate,
}: {
  count: number;
  lit: number;
  fit: GridFit;
  startDelay: number;
  animate: boolean;
}) {
  const { size, gap, columns } = fit;
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  const radius = Math.max(2, Math.round(size * 0.22));
  const split = lit < count;
  const lightStart = startDelay + FILL_MS + LIGHT_PAUSE_MS;
  return (
    <>
      {items.map((i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: size,
              height: size,
              marginRight: (i + 1) % columns === 0 ? 0 : gap,
              marginBottom: gap,
            },
            animate && {
              animationName: split ? fadeIn : popIn,
              animationDuration: '420ms',
              animationDelay: `${Math.round(startDelay + (i * FILL_MS) / count)}ms`,
              animationFillMode: 'both',
              animationTimingFunction: 'ease-out',
            },
          ]}
        >
          {/* Every square has a dim base; lit ones get a bright layer that switches on over it. */}
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: Nocturne.square, opacity: split ? DIM : 1 }]} />
          {split && i < lit ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: radius, backgroundColor: Nocturne.square },
                animate && {
                  animationName: lightUp,
                  animationDuration: '380ms',
                  animationDelay: `${Math.round(lightStart + (i * LIGHT_MS) / lit)}ms`,
                  animationFillMode: 'both',
                  animationTimingFunction: 'ease-out',
                },
              ]}
            />
          ) : null}
        </Animated.View>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', alignSelf: 'center', overflow: 'visible' },
});
