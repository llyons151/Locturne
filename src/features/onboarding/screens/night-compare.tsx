import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Nocturne, Space, Type } from '@/theme';

import { compareLabel, compareRows, type CompareProps } from './night-compare-rows';

/**
 * Their usual night next to the night with him, on the paywall (Opal's before/after above
 * the plans, docs/ONBOARDING_MOBBIN.md). Built only from their own answers, and a tile only
 * shows when the two differ. Monochrome: "with me" is white, "your usual" dim. Was the
 * `your-night` step, folded in here so the middle of onboarding moves faster. On iPhone the tiles
 * are SwiftUI (night-compare.ios.tsx); this is the web and Android version.
 */
export function NightCompare(props: CompareProps) {
  const rows = compareRows(props);
  if (rows.length === 0) return null;
  return (
    // Two tiles, each centred: the time with him big, their usual small under it (user 2026-10-27).
    // The old three-column table sat left-aligned on a centred page, its headers off its times.
    <View style={styles.tiles} accessible accessibilityLabel={compareLabel(rows)}>
      {rows.map((row) => (
        <View key={row.label} style={styles.tile}>
          <Text style={styles.label}>{row.label.toUpperCase()}</Text>
          <Text style={styles.time}>{row.withMe}</Text>
          <Text style={styles.usual}>{`usually ${row.usual}`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Space.s },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Space.l,
    paddingHorizontal: Space.s,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    backgroundColor: Nocturne.surface,
  },
  label: { ...Type.label, color: Nocturne.text2 },
  time: { color: Nocturne.text, fontSize: 26, lineHeight: 32, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: Space.s },
  usual: { color: Nocturne.text2, ...Type.caption, fontVariant: ['tabular-nums'], marginTop: 2 },
});
