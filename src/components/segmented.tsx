import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withSpring } from 'react-native-reanimated';
import { Text } from '@/components/text';

import * as haptic from '@/lib/haptics';
import { Radius } from '@/theme';

import type { SegmentedProps } from './segmented-types';

/**
 * A few mutually exclusive choices. On iPhone (`segmented.ios.tsx`) it's the system
 * segmented control; this is the web preview's look-alike, drawn to Apple's dark-mode
 * values: a grey capsule track and a solid thumb that slides to the chosen segment.
 */

const PAD = 2;
// Quick and settled, like the system control: no wobble at rest.
const SLIDE = { damping: 26, stiffness: 380 };

export function Segmented<T extends string | number>({ value, options, onChange, label }: SegmentedProps<T>) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const segment = width ? (width - PAD * 2) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const thumb = useAnimatedStyle(() => {
    const x = index * segment;
    return { width: segment, transform: [{ translateX: reduced ? x : withSpring(x, SLIDE) }] };
  });

  return (
    <View
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {segment ? <Animated.View style={[styles.thumb, thumb]} /> : null}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (on) return;
              haptic.tap();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={styles.segment}
          >
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // iOS's tertiarySystemFill (dark) for the track: translucent, so it takes the sky's colour.
  // The thumb is frosted white rather than systemGray3, like the cards' tiles (no flat grey).
  track: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  segment: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  label: { color: 'rgba(235, 235, 245, 0.6)', fontSize: 14, fontWeight: '500' },
  labelOn: { color: '#FFFFFF', fontWeight: '600' },
});
