import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Nocturne } from '@/constants/nocturne';

import { AppTile } from './app-icons';
import { formatClock } from './estimate';
import { Reveal } from './motion';
import { NUMBER_FONT } from './rolling-number';
import { Gap, Radius, Space, Type } from './tokens';

const MAX_ICONS = 5;

/**
 * Tonight's lock as one finished object: lights out on the left, the alarm on the
 * right, the 200-step walk between them, and the apps that sleep underneath.
 */
export function ScheduleCard({
  bedtime,
  wake,
  apps,
  compact,
  onChange,
}: {
  bedtime: number;
  wake: number;
  apps: string[];
  compact: boolean;
  onChange: (what: 'bedtime' | 'wake' | 'apps') => void;
}) {
  const shown = apps.slice(0, MAX_ICONS);
  const extra = apps.length - shown.length;
  const iconSize = compact ? 34 : 40;

  return (
    <Reveal style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.times}>
        <Time
          label="Lights out"
          icon={{ ios: 'moon.fill', android: 'bedtime', web: 'bedtime' }}
          minutes={bedtime}
          compact={compact}
          onChange={() => onChange('bedtime')}
        />
        <Time
          label="Alarm"
          icon={{ ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' }}
          minutes={wake}
          compact={compact}
          onChange={() => onChange('wake')}
          alignEnd
        />
      </View>

      <View style={styles.walk} accessible accessibilityLabel="Then 200 steps wake your apps">
        <WalkGlyph name={{ ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' }} />
        <View style={styles.dashes}>
          {Array.from({ length: 40 }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <Text style={styles.walkLabel}>200 steps</Text>
        <View style={styles.dashes}>
          {Array.from({ length: 40 }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <WalkGlyph name={{ ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' }} />
      </View>

      <View style={styles.divider} />

      <View style={styles.appsRow}>
        <View style={styles.icons} accessible accessibilityLabel={`Asleep: ${apps.join(', ')}`}>
          {shown.map((app) => (
            <AppTile key={app} name={app} size={iconSize} />
          ))}
          {extra > 0 ? (
            <View style={[styles.more, { width: iconSize, height: iconSize, borderRadius: iconSize * 0.225 }]}>
              <Text style={styles.moreLabel}>+{extra}</Text>
            </View>
          ) : null}
        </View>
        <ChangeLink label="Change apps" onPress={() => onChange('apps')} />
      </View>
      <Text style={styles.appsCaption}>
        {apps.length === 1 ? '1 app sleeps.' : `${apps.length} apps sleep.`} Calls and texts don’t.
      </Text>
    </Reveal>
  );
}

function Time({
  label,
  minutes,
  compact,
  onChange,
  alignEnd,
  icon,
}: {
  label: string;
  icon: SymbolViewProps['name'];
  minutes: number;
  compact: boolean;
  onChange: () => void;
  alignEnd?: boolean;
}) {
  const [clock, suffix] = formatClock(minutes).split(' ');
  return (
    <View style={[styles.time, alignEnd && styles.timeEnd]}>
      <View style={[styles.labelRow, alignEnd && styles.labelRowEnd]}>
        <SymbolView name={icon} size={12} tintColor={Nocturne.text2} />
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      </View>
      <Text
        style={[styles.clock, compact && styles.clockCompact]}
        maxFontSizeMultiplier={1.2}
        accessibilityLabel={`${label}, ${clock} ${suffix}`}
      >
        {clock}
        <Text style={styles.suffix}> {suffix}</Text>
      </Text>
      <ChangeLink label={`Change ${label.toLowerCase()}`} text="Change" onPress={onChange} />
    </View>
  );
}

function ChangeLink({ label, text = 'Change', onPress }: { label: string; text?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={10}>
      <Text style={styles.change}>{text}</Text>
    </Pressable>
  );
}

function WalkGlyph({ name }: { name: SymbolViewProps['name'] }) {
  return <SymbolView name={name} size={18} tintColor={Nocturne.accent ?? Nocturne.text} />;
}

const styles = StyleSheet.create({
  card: {
    marginTop: Gap.block,
    marginBottom: Gap.block,
    borderRadius: Radius.card,
    // Frosted moon glass over the night sky, like the quiz moon, not a charcoal box.
    backgroundColor: Nocturne.frost,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    padding: 20,
  },
  cardCompact: { marginTop: Space.l, marginBottom: Space.l, padding: Space.l },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { gap: 4 },
  timeEnd: { alignItems: 'flex-end' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelRowEnd: { flexDirection: 'row-reverse' },
  label: Type.label,
  clock: { ...NUMBER_FONT, color: Nocturne.accent ?? Nocturne.text, fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] },
  clockCompact: { fontSize: 34, lineHeight: 40 },
  suffix: { color: Nocturne.text2, fontSize: 16, fontWeight: '600' },
  change: { color: Nocturne.text2, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  walk: { flexDirection: 'row', alignItems: 'center', gap: Space.s, marginTop: Space.l },
  // Evenly spaced dashes, clipped to whatever width the row leaves.
  dashes: { flex: 1, flexDirection: 'row', gap: 4, overflow: 'hidden' },
  // Round dots, like footprints across the night.
  dash: { width: 3, flexShrink: 0, height: 3, borderRadius: 1.5, backgroundColor: Nocturne.text3 },
  walkLabel: { color: Nocturne.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Nocturne.edge, marginVertical: Space.l },
  appsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  icons: { flexDirection: 'row', gap: 8, flexShrink: 1 },
  more: { backgroundColor: Nocturne.frost, borderWidth: 1, borderColor: Nocturne.edge, alignItems: 'center', justifyContent: 'center' },
  moreLabel: { color: Nocturne.text, fontSize: 14, fontWeight: '700' },
  appsCaption: { color: Nocturne.text2, ...Type.secondary, marginTop: Space.m },
});
