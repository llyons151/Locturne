import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { SymbolView } from 'expo-symbols';

import { Text } from '@/components/text';
import { getAccess, watchAccess } from '@/lib/screen-time';
import { Nocturne, Space, Type } from '@/theme';
import { isScreenTimeReportAvailable, ScreenTimeReport } from '../../../modules/screen-time-report';

const RANGES = [{ days: 7, label: '1W' }, { days: 30, label: '1M' }, { days: 90, label: '3M' }, { days: 180, label: '6M' }];

/** The compact Home report; private device data is drawn inside Apple's extension. */
export function ScreenTimeChart({ height = 178 }: { height?: number }) {
  const [days, setDays] = useState(7);
  const [access, setAccess] = useState(getAccess);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => { setAccess(getAccess()); setRevision((value) => value + 1); }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const stop = watchAccess(refresh);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { stop(); subscription.remove(); };
  }, [refresh]);

  return <View style={styles.card}>
    <View style={styles.titleRow}><Text style={styles.title}>Daily screen time</Text><Text style={styles.subtitle}>{Platform.OS === 'web' ? 'Sample data' : `Last ${days} days`}</Text></View>
    <View style={styles.header}>
      <View style={styles.ranges} accessibilityRole="radiogroup" accessibilityLabel="Screen time range">
        {RANGES.map((range) => <Pressable key={range.days} accessibilityRole="radio" accessibilityState={{ checked: days === range.days }} accessibilityLabel={`Last ${range.days} days`} onPress={() => setDays(range.days)} style={styles.range}>
          <View style={[styles.pill, days === range.days && styles.selected]}><Text style={[styles.rangeText, days === range.days && styles.selectedText]}>{range.label}</Text></View>
        </Pressable>)}
      </View>
      <Link href="/usage" asChild><Pressable accessibilityLabel="View all screen time usage" style={styles.details}><Text style={styles.rangeText}>Usage ↗</Text></Pressable></Link>
    </View>
    {Platform.OS === 'web' ? <Preview key={days} days={days} height={height} /> : !isScreenTimeReportAvailable ? <Text style={[styles.message, { minHeight: height }]}>Screen time will appear with the next app build.</Text> : access !== 'approved' ? <Link href={access === 'denied' ? '/(tabs)/profile' : '/(tabs)/apps'} style={styles.message}>Enable Screen Time to see your usage →</Link> : <ScreenTimeReport compact days={days} revision={revision} style={{ height }} />}
  </View>;
}

function Preview({ days, height }: { days: number; height: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const root = useRef<View>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    if (selected === null) return;
    const dismiss = (event: PointerEvent) => { if (!(root.current as unknown as HTMLElement)?.contains(event.target as Node)) setSelected(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [selected]);
  const values = Array.from({ length: days }, (_, i) => 150 + i / days * 70 + Math.sin(i * 1.8) * 25 + Math.cos(i * 0.7) * 20);
  const max = Math.ceil(Math.max(...values) / 120) * 120;
  const bottom = height - 32;
  const labels = days === 7 ? values.map((_, i) => i) : [0, Math.floor((days - 1) / 2), days - 1];
  const ink = Nocturne.accent ?? Nocturne.text;
  const x = (i: number) => 8 + i * 274 / Math.max(1, days - 1);
  const y = (v: number) => bottom - v / max * (bottom - 12);
  const date = (i: number) => { const d = new Date(); d.setDate(d.getDate() + i + 1 - days); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
  const minutes = selected === null ? 0 : Math.round(values[selected]);
  const bubbleWidth = Math.min(230, width);
  const anchorX = selected === null ? 0 : x(selected) / 320 * width;
  const bubbleX = Math.min(width - bubbleWidth, Math.max(0, anchorX - bubbleWidth / 2));
  return <View ref={root} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    <Svg width="100%" height={height} viewBox={`0 0 320 ${height}`} preserveAspectRatio="none" accessibilityRole="image" accessibilityLabel={`Sample daily screen time over ${days} days, in hours.`}>
      {Array.from({ length: 7 }, (_, i) => {
        const value = max * i / 6;
        return <Line key={i} x1={8} x2={288} y1={y(value)} y2={y(value)} stroke={Nocturne.edge} strokeWidth={0.6} />;
      })}
      {[0, max / 2, max].map((value) => <SvgText key={value} x={318} y={y(value) + 3} textAnchor="end" fontSize={9} fill={Nocturne.text2}>{value / 60}h</SvgText>)}
      <Path d={values.map((value, i) => `${i ? 'L' : 'M'}${x(i)},${y(value)}`).join(' ')} stroke={ink} strokeWidth={2} strokeLinejoin="round" fill="none" />
      {values.map((value, i) => <Circle key={i} cx={x(i)} cy={y(value)} r={i === selected ? 4 : days === 7 ? 3 : 1.5} fill={Nocturne.bg} stroke={ink} strokeWidth={1.6} />)}
      {labels.map((i) => {
        const day = new Date(); day.setDate(day.getDate() + i + 1 - days);
        return <SvgText key={i} x={x(i)} y={height - 3} textAnchor={i === 0 ? 'start' : i === days - 1 ? 'end' : 'middle'} fontSize={9} fontWeight="600" fill={Nocturne.text2}>{days === 7 ? day.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase() : date(i)}</SvgText>;
      })}
      {days === 7 && values.map((value, i) => <SvgText key={i} x={x(i)} y={height - 16} textAnchor={i === 0 ? 'start' : i === days - 1 ? 'end' : 'middle'} fontSize={9} fill={Nocturne.text2}>{(value / 60).toFixed(1)}h</SvgText>)}
    </Svg>
    <View style={{ position: 'absolute', top: 0, left: '2.5%', right: '10%', height, flexDirection: 'row' }}>
      {values.map((v, i) => <Pressable key={i} onPress={() => setSelected(i)} accessibilityRole="button" accessibilityLabel={`${date(i)}, ${Math.round(v)} minutes`} style={{ flex: 1 }} />)}
    </View>
    {selected !== null && <View style={[styles.callout, { left: bubbleX, width: bubbleWidth }]} accessibilityLiveRegion="polite">
      <View style={[styles.arrow, { left: Math.max(16, Math.min(bubbleWidth - 26, anchorX - bubbleX - 5)) }]} />
      <Text style={styles.calloutTitle}>{selected === days - 1 ? 'Today' : date(selected)}</Text>
      <Pressable onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Close screen time details" style={styles.close}>
        <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} tintColor="#E5E5EA" />
      </Pressable>
      <Text style={styles.calloutBody}>{Math.floor(minutes / 60)}h {minutes % 60}m of screen time on this day.</Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  callout: { position: 'absolute', top: 0, padding: 14, gap: 6, borderRadius: 16, borderCurve: 'continuous', backgroundColor: '#252527', boxShadow: '0 4px 16px rgba(0,0,0,0.25)' },
  arrow: { position: 'absolute', bottom: -5, width: 12, height: 12, borderRadius: 2, transform: [{ rotate: '45deg' }], backgroundColor: '#252527' },
  calloutTitle: { ...Type.caption, fontWeight: '600', color: '#F2F2F7', paddingRight: 28 },
  calloutBody: { ...Type.caption, color: '#CECED3', paddingRight: 12 },
  close: { position: 'absolute', right: 0, top: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Space.s, flexWrap: 'wrap', paddingTop: Space.s, paddingBottom: Space.m },
  title: { ...Type.secondary, fontWeight: '600', color: Nocturne.text },
  subtitle: { ...Type.legal, color: '#B6B7BE' },
  card: { backgroundColor: '#000000', borderRadius: 16, borderCurve: 'continuous', paddingHorizontal: Space.l, paddingTop: Space.s, paddingBottom: Space.l },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: Space.xs, paddingBottom: Space.m },
  ranges: { flexDirection: 'row', backgroundColor: Nocturne.raised, borderRadius: 22, paddingHorizontal: Space.xs },
  range: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 18, borderCurve: 'continuous' },
  selected: { backgroundColor: Nocturne.cta },
  rangeText: { ...Type.legal, color: Nocturne.text2, fontWeight: '700' },
  selectedText: { color: Nocturne.onCta },
  details: { minHeight: 44, justifyContent: 'center' },
  message: { ...Type.caption, color: '#B6B7BE', minHeight: 148, paddingVertical: Space.xl },
});
