import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/text';

import { Nocturne } from '@/theme';

import type { SelectAllButtonProps } from './select-all-types';

/** The web preview's stand-in for the iPhone's SwiftUI glass button (`select-all-button.ios.tsx`). */
export function SelectAllButton({ all, onPress }: SelectAllButtonProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>
        {all ? '✕  Clear' : '✓  Select all'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  pressed: { opacity: 0.6 },
  label: { color: Nocturne.text, fontSize: 15, fontWeight: '600' },
});
