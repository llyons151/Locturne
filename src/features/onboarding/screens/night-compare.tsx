import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { GlassCard } from '@/components/glass-card';
import { Nocturne, Space, Type } from '@/theme';

import { compareIcon, compareLabel, compareRows, type CompareProps } from './night-compare-rows';

/**
 * Their usual night next to the night with him, on the paywall (Opal's before/after above
 * the plans, docs/ONBOARDING_MOBBIN.md). Built only from their own answers, and a half only
 * shows when the two differ. One smoked card split down the middle, the card the Routine tab
 * and the schedule card use (user 2026-11-05: the grey boxes looked cheap). On iPhone the
 * text is SwiftUI (night-compare.ios.tsx); this is the web and Android version.
 */
export function NightCompare(props: CompareProps) {
  const rows = compareRows(props);
  if (rows.length === 0) return null;
  return (
    <GlassCard dark>
      <View style={styles.row} accessible accessibilityLabel={compareLabel(rows)}>
        {rows.map((row, i) => (
          <View key={row.label} style={styles.halfWrap}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.half}>
              <View style={styles.labelRow}>
                <SymbolView name={compareIcon(row.label)} size={12} tintColor={Nocturne.text2} />
                <Text style={styles.label}>{row.label.toUpperCase()}</Text>
              </View>
              <Text style={styles.time}>{row.withMe}</Text>
              <Text style={styles.usual}>{`usually ${row.usual}`}</Text>
            </View>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  halfWrap: { flex: 1, flexDirection: 'row' },
  half: { flex: 1, alignItems: 'center', paddingVertical: Space.l, paddingHorizontal: Space.s },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: Nocturne.edge, marginVertical: Space.l },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { ...Type.label, color: Nocturne.text2 },
  time: { color: Nocturne.text, fontSize: 26, lineHeight: 32, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: Space.s },
  usual: { color: Nocturne.text2, ...Type.caption, fontVariant: ['tabular-nums'], marginTop: 2 },
});
