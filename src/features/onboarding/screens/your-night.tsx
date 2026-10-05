import { StyleSheet, Text, View } from 'react-native';

import { Reveal } from '@/components/motion';
import type { WakeMethod } from '@/lib/routine';
import { Gap, Nocturne, Space, Type, VoiceSize } from '@/theme';

import { formatWhen, weeklyAmount } from '../estimate';
import { page, Voice } from '../ui';

type Row = { at: string; what: string };

/** The moment they're up, by how they prove it. A trip downstairs is about three minutes in. */
const UP: Record<WakeMethod, { after: number; what: string }> = {
  downstairs: { after: 3, what: 'Bottom of the stairs. Everyone’s up.' },
  steps: { after: 3, what: '200 steps. Everyone’s up.' },
  scan: { after: 2, what: 'Code scanned. Everyone’s up.' },
};

/**
 * Their usual night next to the night with him, built only from their own answers (Wayk's
 * typical-vs-Wayk morning, RISE's timeline: docs/ONBOARDING_10.md). Monochrome: "with me" gets
 * the white line, "your usual" a dim one. No accent colours, no badges.
 */
export function YourNight({
  bedtime,
  wake,
  nightMinutes,
  morningMinutes,
  weeklyMinutes,
  method,
}: {
  bedtime: number;
  wake: number;
  nightMinutes: number;
  morningMinutes: number;
  weeklyMinutes: number;
  method: WakeMethod;
}) {
  const up = UP[method];
  const usual: Row[] = [
    { at: formatWhen(bedtime), what: 'In bed.' },
    nightMinutes > 5 ? { at: formatWhen(bedtime + nightMinutes), what: 'Phone down. Finally.' } : null,
    { at: formatWhen(wake), what: 'Alarm.' },
    morningMinutes > 3 ? { at: formatWhen(wake + morningMinutes), what: 'Feet on the floor.' } : null,
  ].filter((row): row is Row => row !== null);
  const withMe: Row[] = [
    { at: formatWhen(bedtime), what: 'In bed. Apps asleep.' },
    { at: formatWhen(wake), what: 'Alarm. They’re still asleep.' },
    { at: formatWhen(wake + up.after), what: up.what },
  ];
  return (
    <View style={page.top}>
      <Voice text="Your night, drawn." size={VoiceSize.headline} header />
      <View style={styles.columns}>
        <Column label="Your usual" rows={usual} dim />
        <Column label="With me" rows={withMe} delay={500} />
      </View>
      <Reveal delay={1100}>
        <Text style={styles.total}>{`About ${weeklyAmount(weeklyMinutes)} back a week.`}</Text>
      </Reveal>
      <View style={page.gapAside} />
      <Voice text="Same night. Less phone. I’d call it a win if I were awake." size={VoiceSize.aside} delay={1500} sub />
    </View>
  );
}

function Column({ label, rows, dim, delay = 0 }: { label: string; rows: Row[]; dim?: boolean; delay?: number }) {
  return (
    <View style={styles.column}>
      <Reveal delay={delay}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </Reveal>
      <View style={styles.timeline}>
        <View style={[styles.rail, dim && styles.railDim]} />
        {rows.map((row, i) => (
          <Reveal key={`${row.at}-${row.what}`} delay={delay + 120 * (i + 1)} style={styles.row}>
            <View style={[styles.dot, dim && styles.dotDim]} />
            <View style={styles.rowText}>
              <Text style={[styles.at, dim && styles.textDim]}>{row.at}</Text>
              <Text style={[styles.what, dim && styles.textDim]}>{row.what}</Text>
            </View>
          </Reveal>
        ))}
      </View>
    </View>
  );
}

const DOT = 9;

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: Space.l, marginTop: Gap.block },
  column: { flex: 1, gap: Space.m },
  label: Type.label,
  timeline: { gap: Space.l },
  rail: { position: 'absolute', left: (DOT - 1.5) / 2, top: 6, bottom: 6, width: 1.5, backgroundColor: Nocturne.text },
  railDim: { backgroundColor: Nocturne.text3 },
  row: { flexDirection: 'row', gap: Space.s, alignItems: 'flex-start' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, marginTop: 5, backgroundColor: Nocturne.text },
  dotDim: { backgroundColor: Nocturne.text3 },
  rowText: { flex: 1, gap: 1 },
  at: { color: Nocturne.text, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  what: { color: Nocturne.text, ...Type.secondary },
  textDim: { color: Nocturne.text2 },
  total: { color: Nocturne.text, fontSize: 20, fontWeight: '700', marginTop: Gap.block },
});
