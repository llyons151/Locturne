import { StyleSheet, View } from 'react-native';
import { CountText } from '@/components/count-text';
import { Text } from '@/components/text';

import { Nocturne, Type } from '@/theme';

/**
 * The count and its track, from the morning wake-up screen. Onboarding's practice walk uses
 * the same pair, so the demo looks like tomorrow does.
 */

/** The big upright number and its unit: "84" over "of 200 steps". */
export function BigNumber({ value, caption }: { value: string; caption: string }) {
  return (
    <View>
      <CountText value={value} />
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

/** A horizontal progress track, 0–1. */
export function Track({ progress }: { progress: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, progress)) * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { ...Type.body, color: Nocturne.text2 },
  track: { height: 6, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.cta },
});
