import { Pressable, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { Text } from '@/components/text';

import * as haptic from '@/lib/haptics';
import { Nocturne, Radius } from '@/theme';

import type { SegmentedProps } from './segmented-types';

/**
 * A few mutually exclusive choices. On iPhone (`segmented.ios.tsx`) it's the system
 * segmented control; this is the web preview's look-alike.
 */

export function Segmented<T extends string | number>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <GlassCard style={styles.track}>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.tap();
              onChange(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // iOS 26's glass segmented control: a glass track, the chosen side a brighter pane of glass.
  track: { borderRadius: Radius.pill },
  row: { flexDirection: 'row', padding: 4 },
  segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  segmentOn: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  label: { color: Nocturne.text2, fontSize: 15, fontWeight: '600' },
  labelOn: { color: Nocturne.text },
});
