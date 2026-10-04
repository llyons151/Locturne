import { StyleSheet, Text, View } from 'react-native';

import { BigNumber, Track } from '@/components/meter';
import { Nocturne, Space, Type } from '@/theme';

/**
 * The `walk` page's live count: the morning screen's number and track (components/meter.tsx), so
 * the demo looks like tomorrow does. VoiceOver hears the count as one line, updated politely.
 */
export function WalkMeter({ steps, goal }: { steps: number; goal: number }) {
  const left = Math.max(0, goal - steps);
  return (
    <View
      style={styles.meter}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${steps} of ${goal} steps. ${left > 0 ? `${left} to go.` : 'Done.'}`}
    >
      <BigNumber value={String(steps)} caption={`of ${goal} steps`} />
      <Track progress={goal > 0 ? steps / goal : 1} />
      {left > 0 ? <Text style={styles.note}>Shaking the phone doesn’t count. I checked.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { gap: Space.m },
  note: { ...Type.secondary, color: Nocturne.text2 },
});
