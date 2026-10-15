import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { HoldButtonProps } from './HoldButton.types';

/** How far the light's soft front fades out, as a fraction of the width (as in the Swift button). */
const FEATHER = 0.38;
/** Letting go early, the fill drains back this fast. */
const DRAIN_MS = 260;

/**
 * Where the Swift button isn't in the binary (web, Android, a dev build older than the module):
 * the same hold, drawn in React Native. Press and blue light sweeps in from the very left edge
 * with a soft, feathered front (no drifting clouds here), the label turning `filledTextColor`
 * where it's full; let go early and it drains back. Reaching the end completes it.
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
  // The light is the pill plus its fading front, slid in from wholly off the left edge.
  const strip = width * (1 + FEATHER);

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

  const edge = (p: number) => {
    'worklet';
    return -FEATHER + (1 + FEATHER) * (1 - Math.pow(1 - p, 1.6));
  };
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: (edge(progress.get()) - 1) * width }] }));
  // The second label is clipped a little into the front, where the blue is deep enough to read on.
  const clip = useAnimatedStyle(() => ({ width: Math.max(0, (edge(progress.get()) + 0.03) * width) }));

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
      <Animated.View pointerEvents="none" style={[styles.fill, { width: strip }, fill]}>
        {strip > 0 && height > 0 ? (
          <Svg width={strip} height={height}>
            <Defs>
              <LinearGradient id="hold-shade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={fillTopColor ?? fillColor} />
                <Stop offset="1" stopColor={fillColor} />
              </LinearGradient>
              <LinearGradient id="hold-front" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset={1 / (1 + FEATHER)} stopColor="#FFFFFF" stopOpacity={1} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
              <Mask id="hold-mask">
                <Rect width={strip} height={height} fill="url(#hold-front)" />
              </Mask>
            </Defs>
            <Rect width={strip} height={height} fill="url(#hold-shade)" mask="url(#hold-mask)" />
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
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  filled: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  dim: { opacity: 0.7 },
});
