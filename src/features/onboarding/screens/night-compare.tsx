import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import type { WakeMethod } from '@/lib/routine';
import { Nocturne, Space, Type } from '@/theme';

import { formatWhen } from '../estimate';

/** Minutes from the alarm to proof, by how they prove it. A trip downstairs is about three. */
const UP_AFTER: Record<WakeMethod, number> = { downstairs: 3, steps: 3, scan: 2, place: 15, pushups: 2 };

type Row = { label: string; usual: string; withMe: string };

/**
 * Their usual night next to the night with him, on the paywall (Opal's before/after above
 * the plans, docs/ONBOARDING_MOBBIN.md). Built only from their own answers, and a row only
 * shows when the two differ. Monochrome: "with me" is white, "your usual" dim. Was the
 * `your-night` step, folded in here so the middle of onboarding moves faster.
 */
export function NightCompare({
  bedtime,
  wake,
  nightMinutes,
  morningMinutes,
  method,
}: {
  bedtime: number;
  wake: number;
  nightMinutes: number;
  morningMinutes: number;
  method: WakeMethod;
}) {
  const upWithMe = wake + UP_AFTER[method];
  const rows: Row[] = [
    nightMinutes > 5 ? { label: 'Phone down', usual: formatWhen(bedtime + nightMinutes), withMe: formatWhen(bedtime) } : null,
    wake + morningMinutes > upWithMe
      ? { label: 'Out of bed', usual: formatWhen(wake + morningMinutes), withMe: formatWhen(upWithMe) }
      : null,
  ].filter((row): row is Row => row !== null);
  if (rows.length === 0) return null;
  return (
    <View
      style={styles.table}
      accessible
      accessibilityLabel={rows.map((row) => `${row.label}: usually ${row.usual}, with me ${row.withMe}`).join('. ')}
    >
      <View style={styles.row}>
        <View style={styles.labelCell} />
        <Text style={[styles.head, styles.dim]}>USUAL</Text>
        <Text style={styles.head}>WITH ME</Text>
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.labelCell, styles.label]}>{row.label}</Text>
          <Text style={[styles.time, styles.dim]}>{row.usual}</Text>
          <Text style={styles.time}>{row.withMe}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    gap: Space.xs,
    paddingVertical: Space.m,
    paddingHorizontal: Space.l,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Nocturne.edge,
  },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  labelCell: { flex: 1.1 },
  label: { color: Nocturne.text2, ...Type.secondary },
  head: { flex: 1, ...Type.label, color: Nocturne.text },
  time: { flex: 1, color: Nocturne.text, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dim: { color: Nocturne.text2 },
});
