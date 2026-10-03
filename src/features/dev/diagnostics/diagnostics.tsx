import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextButton } from '@/components/buttons';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { formatReport } from './report';
import { useDiagnostics } from './use-diagnostics';

/**
 * Diagnostics, web preview stand-in. On iPhone (`diagnostics.ios.tsx`) it's a native
 * grouped list; here it's plain rows, so the route still opens in the browser.
 */
export function Diagnostics() {
  const [sections, refresh] = useDiagnostics();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Diagnostics</Text>
        <TextButton label="Share report" onPress={() => Share.share({ message: formatReport(sections) })} />
        <TextButton label="Refresh" onPress={refresh} />
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={Type.label}>{section.title}</Text>
            {section.rows.map(([label, value], i) => (
              <View key={`${label}-${i}`} style={styles.row}>
                <Text style={Type.rowKey}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))}
            {section.footer ? <Text style={styles.footer}>{section.footer}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nocturne.bg, paddingHorizontal: Gap.gutter },
  content: { paddingVertical: Space.xl, gap: Space.l },
  title: { color: Nocturne.text, ...Type.title },
  section: { gap: Space.s },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Space.m },
  value: { color: Nocturne.text, ...Type.secondary, flexShrink: 1, textAlign: 'right' },
  footer: { color: Nocturne.text3, ...Type.caption },
});
