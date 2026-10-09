import { Pressable, StyleSheet, Text } from 'react-native';

import type { HoldButtonProps } from './HoldButton.types';

/**
 * Where the Swift button isn't in the binary (web, Android, a dev build older than the module):
 * a plain pill that still needs the hold, without the fill.
 */
export function HoldButtonFallback({
  label,
  duration = 1200,
  disabled,
  color = '#FFFFFF',
  textColor = '#000000',
  onComplete,
  style,
}: HoldButtonProps) {
  return (
    <Pressable
      onLongPress={onComplete}
      delayLongPress={duration}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onAccessibilityTap={onComplete}
      style={({ pressed }) => [styles.pill, { backgroundColor: color }, style, (pressed || disabled) && styles.dim]}
    >
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 16 },
  label: { fontSize: 17, fontWeight: '600' },
  dim: { opacity: 0.7 },
});
