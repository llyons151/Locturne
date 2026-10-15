import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Nocturne } from '@/theme';

import { globeFrame, orbTime, type OrbSize } from './globe';

/**
 * A dotted globe with a scan sweeping it (thinking-orbs' "searching"), for a short wait on a
 * location read. Decorative: whatever it sits beside says what's happening. Every orb runs off
 * one clock, so two on screen stay in step. Reduce Motion gets one still frame.
 */
export function SearchingOrb({ size = 20, color = Nocturne.text, style }: { size?: OrbSize; color?: string; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [t, setT] = useState(() => (reduced ? 0.6 : orbTime(size, performance.now() / 1000)));

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const tick = () => {
      setT(orbTime(size, performance.now() / 1000));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [size, reduced]);

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {globeFrame(size, reduced ? 0.6 : t).map((layer, i) =>
          layer.d ? <Path key={i} d={layer.d} fill={color} fillOpacity={layer.opacity} /> : null,
        )}
      </Svg>
    </View>
  );
}
