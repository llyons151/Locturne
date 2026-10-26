import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

/** How long the hero fades in alone, how long it waits there by default, and how long it takes to rise. */
const SHOW_MS = 400;
const HOLD_MS = 900;
const RISE_MS = 600;
/** The rest of the page starts arriving this far into the rise, so it settles with the hero. */
const REST_AT = 0.35;
const MEASURE_TIMEOUT_MS = 1000;

/** Pages that have staged their hero this session, by their `once` name. */
const staged = new Set<string>();

/**
 * Hero first (docs/DUOLINGO_MOTION.md, Duolingo's streak screens): the page's one big thing
 * shows alone in the middle of the page, then rises into its place while what's above and below
 * it arrives. That rest is laid out from the start but invisible, so nothing jumps, and it's
 * remounted when the hero settles so its own entrances play then.
 *
 * The hero rises `hold` ms after it shows, or when `settle` turns true if given (a number that
 * has to land first). With `once`, a page the user comes back to (after editing something on it)
 * shows in place instead of staging its hero again.
 */
export function HeroFirst({
  before,
  hero,
  after,
  settle,
  hold = HOLD_MS,
  once,
  style,
  afterStyle,
}: {
  before?: ReactNode;
  hero: ReactNode;
  after?: ReactNode;
  settle?: boolean;
  hold?: number;
  once?: string;
  style?: StyleProp<ViewStyle>;
  afterStyle?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [inPlace] = useState(() => reduced || (once !== undefined && staged.has(once)));
  const [settled, setSettled] = useState(inPlace);
  const [measured, setMeasured] = useState(false);
  const [held, setHeld] = useState(false);
  const box = useRef({ height: 0, heroY: 0, heroHeight: 0, container: false, hero: false });
  // How far the hero sits below its place while it's alone (negative: above).
  const drop = useSharedValue(0);
  const shown = useSharedValue(inPlace ? 1 : 0);
  const lift = useSharedValue(inPlace ? 1 : 0);
  useEffect(() => {
    if (settled && once !== undefined) staged.add(once);
  }, [settled, once]);

  const measure = () => {
    const b = box.current;
    if (!b.container || !b.hero || measured || settled) return;
    drop.set(b.height / 2 - (b.heroY + b.heroHeight / 2));
    setMeasured(true);
  };
  const onContainer = (e: LayoutChangeEvent) => {
    box.current.height = e.nativeEvent.layout.height;
    box.current.container = true;
    measure();
  };
  const onHero = (e: LayoutChangeEvent) => {
    box.current.heroY = e.nativeEvent.layout.y;
    box.current.heroHeight = e.nativeEvent.layout.height;
    box.current.hero = true;
    measure();
  };

  // Never strand the page invisible: if layout hasn't reported in time, show everything in place.
  useEffect(() => {
    if (measured || settled) return;
    const id = setTimeout(() => {
      shown.set(1);
      lift.set(1);
      setSettled(true);
    }, MEASURE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [measured, settled, shown, lift]);

  // Alone in the middle first.
  useEffect(() => {
    if (!measured || settled) return;
    shown.set(withTiming(1, { duration: SHOW_MS, easing: Easing.out(Easing.cubic) }));
    const id = setTimeout(() => setHeld(true), SHOW_MS + hold);
    return () => clearTimeout(id);
  }, [measured, settled, hold, shown]);

  // Then up into place, the rest arriving on the way.
  const rise = settle ?? held;
  useEffect(() => {
    if (!rise || !measured || settled) return;
    shown.set(1);
    lift.set(withTiming(1, { duration: RISE_MS, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    const id = setTimeout(() => setSettled(true), RISE_MS * REST_AT);
    return () => clearTimeout(id);
  }, [rise, measured, settled, shown, lift]);

  const heroStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: drop.value * (1 - lift.value) }],
  }));

  return (
    <View style={style} onLayout={onContainer}>
      {before ? (
        <View key={settled ? 'before-in' : 'before'} style={!settled && styles.waiting} accessibilityElementsHidden={!settled}>
          {before}
        </View>
      ) : null}
      <Animated.View style={heroStyle} onLayout={onHero}>
        {hero}
      </Animated.View>
      {after ? (
        <View
          key={settled ? 'after-in' : 'after'}
          style={[afterStyle, !settled && styles.waiting]}
          accessibilityElementsHidden={!settled}
        >
          {after}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  waiting: { opacity: 0, pointerEvents: 'none' },
});
