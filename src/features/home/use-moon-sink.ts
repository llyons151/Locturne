import { useEffect } from 'react';
import { Easing, useReducedMotion, withTiming } from 'react-native-reanimated';

import { moonSink } from '@/components/night-sky';
import { useTabSelected } from '@/hooks/use-tab-selected';

/**
 * Home is the only tab the moon rests on: every other tab sinks it, so their cards sit on
 * calm, dark sky. Run from Home, which stays mounted under the others, so one place decides.
 */
export function useMoonSink() {
  const reduced = useReducedMotion();
  const selected = useTabSelected();
  useEffect(() => {
    const to = selected ? 0 : 1;
    moonSink.set(reduced ? to : withTiming(to, { duration: 1600, easing: Easing.bezier(0.45, 0, 0.25, 1) }));
  }, [selected, reduced]);
  useEffect(() => () => moonSink.set(0), []);
}
