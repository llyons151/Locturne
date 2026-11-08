import { StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { Text } from '@/components/text';

import { Nocturne, Space, Type } from '@/theme';

import { AVERAGE_COMPARE, averageCompareLabel } from './average-compare-rows';

/**
 * The average week on the phone in bed, without Locturne and with it, in one box on the paywall
 * where `NightCompare` sits for everyone else. Same smoked card. On iPhone it's SwiftUI
 * (average-compare.ios.tsx); this is the web and Android version.
 */
export function AverageCompare() {
  return (
    // The smoked card the iPhone version, the night box and the plan cards sit in (user 2026-11-08: "just a gray box").
    <GlassCard dark>
    <View style={styles.box} accessible accessibilityLabel={averageCompareLabel}>
      <View style={styles.columns}>
        {AVERAGE_COMPARE.columns.map((column, i) => (
          <View key={column.label} style={[styles.column, i > 0 && styles.divided]}>
            <Text style={styles.label}>{column.label.toUpperCase()}</Text>
            <Text style={[styles.amount, i === 0 && styles.without]}>{column.amount}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>{AVERAGE_COMPARE.caption}</Text>
    </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    paddingVertical: Space.l,
    paddingHorizontal: Space.s,
  },
  columns: { flexDirection: 'row', alignSelf: 'stretch' },
  column: { flex: 1, alignItems: 'center' },
  divided: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: Nocturne.edge },
  label: { ...Type.label, color: Nocturne.text2 },
  amount: { color: Nocturne.text, fontSize: 26, lineHeight: 32, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: Space.s },
  without: { color: Nocturne.text2 },
  caption: { color: Nocturne.text2, ...Type.caption, marginTop: Space.m },
});
