import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

/**
 * Home's centrepiece, after the user's reference (docs/design-references/rounded-panel-nav.png,
 * the middle "79%" screen): one big time with a small label beside it, a bar meter of thin
 * stripes showing how far through the day or the night it is, and a row under it with when
 * that started and how long is left.
 *
 * Monochrome, in moon white: the reference's rainbow stripes and purple light aren't ours,
 * and nothing glows.
 */

export type Meter = {
  /** The big time, "11:00". */
  value: string;
  /** Small after it: "pm". */
  unit?: string;
  /** Two short lines to its right: "Bedtime", "tonight". */
  label: [string, string];
  /** How far through the stretch it is, 0–1. Null hides the meter. */
  progress: number | null;
  /** Under the meter, left: "Awake since 7 am". */
  since?: string;
  /** Under the meter, right: a grey key and its white value ("Bedtime in", "4h 12m"). */
  left?: { key: string; value: string };
};

const BAR = 3;
const GAP = 3;

/** 23:00 → "11:00" and "pm". */
export function bigClock(minutes: number): { value: string; unit: string } {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return { value: `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')}`, unit: h < 12 ? 'am' : 'pm' };
}

/** 252 minutes → "4h 12m"; under an hour, "12m". */
export function duration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`;
}

/** Minutes from `from` to `to` on the clock, going forward (across midnight if need be). */
export const ahead = (from: number, to: number) => (to - from + 1440) % 1440;

/** Re-renders each minute, on the minute, so the meter and "in 4h 12m" stay true. */
export function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setTimeout(() => setNow(new Date()), 60_000 - (Date.now() % 60_000) + 50);
    return () => clearTimeout(id);
  }, [now]);
  return now;
}

export function NightMeter({ meter, accessibilityLabel }: { meter: Meter; accessibilityLabel: string }) {
  const { width } = useWindowDimensions();
  // As many stripes as fit the line, so they always run edge to edge.
  const count = Math.max(12, Math.floor((width - Gap.gutter * 2 + GAP) / (BAR + GAP)));
  const lit = meter.progress === null ? 0 : Math.round(Math.min(1, Math.max(0, meter.progress)) * count);

  return (
    <View style={styles.wrap} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.top}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
          {meter.value}
          {meter.unit ? <Text style={styles.unit}>{meter.unit}</Text> : null}
        </Text>
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>
          {meter.label[0]}
          {'\n'}
          {meter.label[1]}
        </Text>
      </View>

      {meter.progress === null ? null : (
        <>
          <View style={styles.bars}>
            {Array.from({ length: count }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  i < lit
                    ? // Lit stripes brighten toward "now", like the reference's run of colour.
                      { backgroundColor: Nocturne.accent ?? Nocturne.text, opacity: 0.45 + 0.55 * ((i + 1) / Math.max(1, lit)) }
                    : styles.unlit,
                ]}
              />
            ))}
          </View>
          <View style={styles.foot}>
            <Text style={styles.since} numberOfLines={1}>
              {meter.since}
            </Text>
            {meter.left ? (
              <Text style={styles.leftKey} numberOfLines={1}>
                {meter.left.key} <Text style={styles.leftValue}>{meter.left.value}</Text>
              </Text>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Space.l },
  top: { flexDirection: 'row', alignItems: 'center', gap: Space.l },
  value: {
    ...NUMBER_FONT,
    flexShrink: 1,
    color: Nocturne.text,
    fontSize: 84,
    lineHeight: 92,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 30, letterSpacing: 0 },
  label: { ...Type.secondary, fontSize: 16, lineHeight: 20, color: Nocturne.text2 },
  bars: { height: 44, flexDirection: 'row', alignItems: 'flex-end', gap: GAP },
  bar: { width: BAR, height: 44, borderRadius: BAR / 2 },
  // Still to come: shorter and dim, as in the reference.
  unlit: { height: 22, backgroundColor: Nocturne.progressTrack },
  foot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Space.m },
  since: { ...Type.secondary, color: Nocturne.text2, flexShrink: 1 },
  leftKey: { ...Type.secondary, color: Nocturne.text2 },
  leftValue: { color: Nocturne.text, fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
