import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { getAccess, watchAccess } from '@/lib/screen-time';
import { Nocturne, Space, Type } from '@/theme';
import { ScreenTimeReport, isScreenTimeReportAvailable } from '../../../modules/screen-time-report';

const SAMPLE_MINUTES = [248, 205, 281, 192, 234, 310, 265, 213, 182, 246, 220, 195, 267, 302, 241, 208, 174, 232, 198, 260, 215, 184, 226, 201, 168, 212, 185, 241, 197, 134];
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;

/** Real totals are rendered entirely by the report extension, never bridged into JS. */
export function UsageScreen() {
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [revision, setRevision] = useState(0);
  const [access, setAccess] = useState(getAccess);
  const refresh = useCallback(() => {
    setAccess(getAccess());
    setRevision((value) => value + 1);
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    const stop = watchAccess(refresh);
    return () => { sub.remove(); stop(); };
  }, [refresh]);

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Screen time</Text>
        {Platform.OS === 'web' && <Text style={styles.caption}>Sample data</Text>}
      </View>
      <Segmented label="Screen time range" value={days} options={[{ value: 1, label: 'Today' }, { value: 7, label: '7 days' }, { value: 30, label: '30 days' }]} onChange={setDays} />
      {Platform.OS === 'web' ? <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.preview}><PreviewChart days={days} /><PreviewApps days={days} /></ScrollView> : !isScreenTimeReportAvailable ? (
        <Text style={styles.message}>Screen time reports will be available with the next app build.</Text>
      ) : access !== 'approved' ? (
        <View style={styles.preview}>
          <Text style={styles.message}>{access === 'denied' ? 'Screen Time access is off. Open Settings from the You tab to restore it.' : 'Set up Screen Time from the Apps tab to see your usage.'}</Text>
          <Link href={access === 'denied' ? '/(tabs)/profile' : '/(tabs)/apps'} asChild>
            <Pressable style={styles.accessButton} accessibilityRole="button"><Text style={styles.title}>{access === 'denied' ? 'Go to You' : 'Set up Screen Time'}</Text></Pressable>
          </Link>
        </View>
      ) : (
        <ScreenTimeReport days={days} revision={revision} style={{ flex: 1 }} />
      )}
    </View>
  );
}

function PreviewChart({ days }: { days: 1 | 7 | 30 }) {
  const values = SAMPLE_MINUTES.slice(-days);
  const total = values.reduce((sum, value) => sum + value, 0);
  const ceiling = Math.ceil(Math.max(...values) / 60) * 60;
  const average = total / days;
  const dates = values.map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1 - days);
    return date;
  });
  return (
    <View style={styles.preview}>
      <View style={styles.heading}>
        <View><Text selectable style={styles.total}>{duration(total)}</Text><Text style={styles.caption}>Total screen time</Text></View>
        <View style={styles.average}><Text selectable style={styles.averageValue}>{duration(Math.round(average))}</Text><Text style={styles.caption}>Daily average</Text></View>
      </View>
      <View style={styles.plot}>
        <View style={styles.graph}>
          {[0, 0.5, 1].map((fraction) => <View key={fraction} style={[styles.grid, { bottom: `${fraction * 100}%` }]} />)}
          <View style={styles.bars}>
            {values.map((value, index) => (
              <View key={index} accessible accessibilityLabel={`${dates[index].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${duration(value)}`} style={[styles.bar, { height: `${value / ceiling * 100}%` }]} />
            ))}
          </View>
          <View style={[styles.averageLine, { bottom: `${average / ceiling * 100}%` }]} />
        </View>
        <View style={styles.axis}><Text style={styles.caption}>{ceiling / 60}h</Text><Text style={styles.caption}>{ceiling / 120}h</Text><Text style={styles.caption}>0h</Text></View>
      </View>
      <View style={styles.dates}>
        {(days <= 7 ? dates : [dates[0], dates[14], dates[29]]).map((date, index) => <Text key={index} style={styles.caption}>{date.toLocaleDateString(undefined, days <= 7 ? { weekday: 'narrow' } : { month: 'short', day: 'numeric' })}</Text>)}
      </View>
      <Text style={styles.caption}>{days === 1 ? 'Today so far' : `Last ${days} days · includes today so far`}</Text>
    </View>
  );
}

function PreviewApps({ days }: { days: 1 | 7 | 30 }) {
  const total = SAMPLE_MINUTES.slice(-days).reduce((sum, value) => sum + value, 0);
  const apps = [{ name: 'Instagram', share: 0.32 }, { name: 'YouTube', share: 0.25 }, { name: 'TikTok', share: 0.19 }, { name: 'Safari', share: 0.14 }, { name: 'Messages', share: 0.10 }];
  return <View style={styles.appSection}>
    <Text accessibilityRole="header" style={styles.total}>All apps</Text>
    <Text style={styles.caption}>Most used first · sample data</Text>
    {apps.map((app) => <View key={app.name} style={styles.appRow}>
      <View style={styles.heading}><Text style={styles.title}>{app.name}</Text><Text selectable style={styles.title}>{duration(Math.round(total * app.share))}</Text></View>
      <View style={styles.track}><View style={[styles.fill, { width: `${app.share * 100}%` }]} /></View>
      <Text style={styles.caption}>{Math.round(app.share * 100)}% of screen time</Text>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  accessButton: { minHeight: 44, justifyContent: 'center', padding: Space.l, borderRadius: 20, backgroundColor: Nocturne.surface },
  appSection: { gap: Space.m, paddingTop: Space.xl, paddingBottom: Space.xxl },
  appRow: { gap: Space.s, paddingVertical: Space.m, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Nocturne.edge },
  track: { height: 4, borderRadius: 2, backgroundColor: Nocturne.edge },
  fill: { height: 4, borderRadius: 2, backgroundColor: Nocturne.text },
  card: { flex: 1, padding: Space.xl, gap: Space.l, backgroundColor: Nocturne.bg },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.s, flexWrap: 'wrap' },
  title: { ...Type.body, fontWeight: '600', color: Nocturne.text },
  caption: { ...Type.legal, color: Nocturne.text2 },
  message: { ...Type.secondary, color: Nocturne.text2, paddingVertical: Space.xl },
  preview: { gap: Space.m },
  total: { ...Type.title, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  average: { alignItems: 'flex-end' },
  averageValue: { ...Type.body, fontWeight: '600', color: Nocturne.text, fontVariant: ['tabular-nums'] },
  plot: { flexDirection: 'row', gap: Space.s, height: 104, marginTop: Space.s },
  graph: { flex: 1 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: Space.xs },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: Nocturne.text },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: Nocturne.edge },
  averageLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: Nocturne.text, opacity: 0.7 },
  axis: { justifyContent: 'space-between', width: 28, marginVertical: -8 },
  dates: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 36 },
});
