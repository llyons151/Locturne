import { Pressable, StyleSheet, Text } from 'react-native';

import { tap } from '@/lib/haptics';
import { CTA_HEIGHT, Nocturne, Radius, Space } from '@/theme';

/** The main white pill. Every screen's bottom action uses it, at the same height. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.cta, disabled && styles.ctaDisabled, pressed && styles.pressed]}
    >
      <Text style={[styles.ctaLabel, disabled && styles.ctaLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

/** A quiet grey text link for secondary actions. */
export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={styles.textButton}>
      <Text style={styles.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    minHeight: CTA_HEIGHT,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: Nocturne.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: Nocturne.raised },
  ctaLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  ctaLabelDisabled: { color: Nocturne.text3 },
  pressed: { opacity: 0.75 },
  textButton: { alignSelf: 'center', paddingVertical: Space.xs },
  textButtonLabel: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },
});
