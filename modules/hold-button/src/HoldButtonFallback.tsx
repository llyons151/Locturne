import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { HoldButtonProps } from './HoldButton.types';

/** The gap between the fill and the pill's edge: none, it covers the whole pill (user, October 12, 2026). */
const INSET = 0;
/** Letting go early, the fill drains back this fast. */
const DRAIN_MS = 260;

/**
 * Where the Swift button isn't in the binary (web, Android, a dev build older than the module):
 * the same hold, drawn in React Native. Press and a pill fills it from the left, edge to edge, the
 * label turning `filledTextColor` wherever the fill has passed; let go
 * early and it drains back. Reaching the end completes it.
 */
export function HoldButtonFallback({
  label,
  duration = 1200,
  disabled,
  color = '#FFFFFF',
  fillColor = '#0A1429',
  fillTopColor,
  textColor = '#000000',
  filledTextColor = '#FFFFFF',
  onComplete,
  style,
}: HoldButtonProps) {
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);
  const inner = Math.max(0, width - INSET * 2);
  // The fill starts as a circle the inner pill's height, so its left end is round from the start.
  const dot = Math.min(inner, Math.max(0, height - INSET * 2));

  const press = () => {
    if (disabled) return;
    cancelAnimation(progress);
    progress.set(
      withTiming(1, { duration: duration * (1 - progress.get()), easing: Easing.linear }, (done) => {
        if (done) scheduleOnRN(onComplete);
      }),
    );
  };
  const release = () => {
    if (progress.get() >= 1) return;
    cancelAnimation(progress);
    progress.set(withTiming(0, { duration: DRAIN_MS * progress.get(), easing: Easing.out(Easing.quad) }));
  };

  const fill = useAnimatedStyle(() => {
    const p = progress.get();
    return { width: dot + (inner - dot) * p, opacity: Math.min(1, p * 12) };
  });
  // The second label is clipped to the fill's right end, so it changes colour where the fill has passed.
  const clip = useAnimatedStyle(() => {
    const p = progress.get();
    return { width: p > 0 ? INSET + dot + (inner - dot) * p : 0 };
  });

  return (
    <Pressable
      onPressIn={press}
      onPressOut={release}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold"
      accessibilityState={{ disabled }}
      onAccessibilityTap={onComplete}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
      style={[styles.pill, { backgroundColor: color }, style, disabled && styles.dim]}
    >
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: fillColor }, fill]}>
        {/* The shading spans the whole pill, so it doesn't stretch as the fill grows. */}
        {fillTopColor ? (
          <Svg width={inner} height={dot} style={styles.shade}>
            <Defs>
              <LinearGradient id="hold-fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={fillTopColor} />
                <Stop offset="1" stopColor={fillColor} />
              </LinearGradient>
            </Defs>
            <Rect width={inner} height={dot} fill="url(#hold-fill)" />
          </Svg>
        ) : null}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.clip, clip]}>
        <View style={[styles.filled, { width }]}>
          <Text style={[styles.label, { color: filledTextColor }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 16, overflow: 'hidden' },
  label: { fontSize: 17, fontWeight: '600' },
  fill: { position: 'absolute', left: INSET, top: INSET, bottom: INSET, borderRadius: 999, borderCurve: 'continuous', overflow: 'hidden' },
  shade: { position: 'absolute', left: 0, top: 0 },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  filled: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  dim: { opacity: 0.7 },
});
