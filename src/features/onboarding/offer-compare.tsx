/**
 * The offer page's compare table (user's reference, 2026-11-07: a Free vs Premium table over a
 * sky, clouds at the bottom). No free tier here, so the left column is Apple's own Screen Time,
 * which answers "why not just use Screen Time?". The clouds are the moon: the sky raises it to a
 * low horizon under the table (NightSky `arcAt`), and the button sits on it.
 */
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { sym } from '@/components/grouped-list';
import { Reveal } from '@/components/motion';
import { Text } from '@/components/text';
import type { WakeMethod } from '@/lib/routine';

/** Where the moon's curve sits on the offer, as a share of the screen's height. */
export const OFFER_ARC_AT = 0.7;

/** What wakes their apps, as a row label. */
const WAKE_ROW: Record<WakeMethod, string> = {
  downstairs: 'Downstairs wakes them',
  steps: '200 steps wake them',
  scan: 'Your code wakes them',
  place: 'Your place wakes them',
  pushups: '10 push-ups wake them',
  downtime: 'Up an hour wakes them',
};

/** A cell: a tick, a dash, or a few words. */
type Cell = 'yes' | 'no' | string;
type Row = { icon: ReturnType<typeof sym>; label: string; apple: Cell; ours: Cell };

function rowsFor(method: WakeMethod, compact: boolean): Row[] {
  const rows: Row[] = [
    { icon: sym('moon.zzz.fill', 'bedtime'), label: 'Apps sleep at bedtime', apple: 'yes', ours: 'yes' },
    { icon: sym('hand.tap.fill', 'do_not_touch'), label: 'No “Ignore limit” button', apple: 'no', ours: 'yes' },
    { icon: sym('sunrise.fill', 'wb_twilight'), label: 'Asleep till you’re up', apple: 'no', ours: 'yes' },
    { icon: sym('figure.walk', 'directions_walk'), label: WAKE_ROW[method], apple: 'no', ours: 'yes' },
    { icon: sym('ticket.fill', 'confirmation_number'), label: 'Ways out early', apple: '∞', ours: '2/mo.' },
  ];
  // Short phones: the table has to end above the moon.
  if (!compact) rows.push({ icon: sym('moonphase.waxing.crescent', 'brightness_3'), label: 'Moons to collect', apple: 'no', ours: 'yes' });
  return rows;
}

const ROW_STAGGER_MS = 70;

export function OfferCompare({ method, compact, delay = 0 }: { method: WakeMethod; compact: boolean; delay?: number }) {
  const rows = rowsFor(method, compact);
  return (
    <View style={styles.table}>
      {/* Locturne's column, a frosted strip from its heading to the last row. */}
      <View style={styles.oursColumn} />
      <Reveal delay={delay}>
        <View style={styles.row}>
          <View style={styles.labelCell} />
          <Text style={[styles.head, styles.apple]}>Screen Time</Text>
          <Text style={[styles.head, styles.headOurs]}>Locturne</Text>
        </View>
      </Reveal>
      {rows.map((row, i) => (
        <Reveal key={row.label} delay={delay + ROW_STAGGER_MS * (i + 1)}>
          <View style={[styles.row, compact && styles.rowCompact]}>
            <View style={styles.labelCell}>
              <SymbolView name={row.icon} size={17} tintColor={TEXT} style={styles.icon} />
              {/* Two lines at most (user 2026-11-07): shrinks a touch before it would wrap a third. */}
              <Text style={styles.label} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
                {row.label}
              </Text>
            </View>
            <CellView cell={row.apple} apple />
            <CellView cell={row.ours} />
          </View>
        </Reveal>
      ))}
    </View>
  );
}

function CellView({ cell, apple }: { cell: Cell; apple?: boolean }) {
  return (
    <View style={[styles.cell, apple && styles.apple]}>
      {cell === 'yes' ? (
        <SymbolView name={sym('checkmark', 'check')} size={16} weight="semibold" tintColor={TEXT} />
      ) : cell === 'no' ? (
        <View style={styles.dash} />
      ) : (
        <Text style={styles.cellText}>{cell}</Text>
      )}
    </View>
  );
}

const TEXT = 'rgba(255,255,255,0.92)';
const CELL_W = 76;
/** Clear space between Screen Time's column and Locturne's strip. */
const COLUMN_GAP = 12;

const styles = StyleSheet.create({
  table: { alignSelf: 'stretch', marginTop: 28 },
  oursColumn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: CELL_W,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50 },
  rowCompact: { minHeight: 42 },
  labelCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 8 },
  icon: { width: 20, height: 20 },
  label: { flex: 1, color: TEXT, fontSize: 15, lineHeight: 19 },
  head: { width: CELL_W, textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', paddingVertical: 14 },
  headOurs: { color: '#FFFFFF' },
  apple: { width: CELL_W + 8, marginRight: COLUMN_GAP },
  cell: { width: CELL_W, alignItems: 'center', justifyContent: 'center' },
  cellText: { color: TEXT, fontSize: 15, fontWeight: '600' },
  dash: { width: 14, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
});
