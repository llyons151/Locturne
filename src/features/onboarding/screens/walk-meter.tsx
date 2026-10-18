import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { BigNumber, Track } from '@/components/meter';
import { useSmoothSteps } from '@/hooks/use-smooth-steps';
import { Nocturne, Space, Type } from '@/theme';

/**
 * The `walk` page's live count: the morning screen's number and track (components/meter.tsx), so
 * the demo looks like tomorrow does. VoiceOver hears the count as one line, updated politely.
 */
export function WalkMeter({ steps: counted, goal }: { steps: number; goal: number }) {
  // Shown a step at a time between the pedometer's batches, as on the morning screen.
  const steps = useSmoothSteps(counted) ?? counted;
  const left = Math.max(0, goal - steps);
  return (
    <View
      style={styles.meter}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${steps} of ${goal} steps. ${left > 0 ? `${left} to go.` : 'Done.'}`}
    >
      <BigNumber value={String(steps)} caption={`of ${goal} steps`} center />
      <Track progress={goal > 0 ? steps / goal : 1} />
      {left > 0 ? <Text style={styles.note}>Shaking the phone doesn’t count. I checked.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: Space.m },
  note: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
});
