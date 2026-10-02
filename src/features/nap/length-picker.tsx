import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as haptic from '@/lib/haptics';
import { Nocturne, Radius } from '@/theme';

import { lengthLabel, type LengthPickerProps } from './length-label';

/**
 * Nap length. On iPhone (`length-picker.ios.tsx`) it's the system segmented control; this
 * is the web preview's look-alike.
 */

export function LengthPicker({ value, options, onChange }: LengthPickerProps) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel="Nap length">
      {options.map((minutes) => {
        const on = minutes === value;
        return (
          <Pressable
            key={minutes}
            onPress={() => {
              haptic.tap();
              onChange(minutes);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{lengthLabel(minutes)}</Text>
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
