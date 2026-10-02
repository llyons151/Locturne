import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as haptic from '@/lib/haptics';
import { Nocturne, Radius } from '@/theme';

import type { SegmentedProps } from './segmented-types';

/**
 * A few mutually exclusive choices. On iPhone (`segmented.ios.tsx`) it's the system
 * segmented control; this is the web preview's look-alike.
 */

export function Segmented<T extends string | number>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
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
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(118,118,128,0.24)',
  },
  segment: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  segmentOn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  label: { color: Nocturne.text, fontSize: 14, fontWeight: '500' },
  labelOn: { fontWeight: '600' },
});
