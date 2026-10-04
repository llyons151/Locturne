import { StyleSheet, Text, View } from 'react-native';

import { Nocturne, NUMBER_FONT, Type } from '@/theme';

/**
 * The count and its track, from the morning wake-up screen. Onboarding's practice walk uses
 * the same pair, so the demo looks like tomorrow does.
 */

/** The big upright number and its unit: "84" over "of 200 steps". */
export function BigNumber({ value, caption }: { value: string; caption: string }) {
  return (
    <View>
      <Text style={styles.number} maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
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
  number: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 72, lineHeight: 80, fontVariant: ['tabular-nums'] },
  caption: { ...Type.body, color: Nocturne.text2 },
  track: { height: 6, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.cta },
});
