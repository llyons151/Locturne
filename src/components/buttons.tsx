import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { tap } from '@/lib/haptics';
import { CTA_HEIGHT, Nocturne, Radius, Space } from '@/theme';

/** The main white pill. Every screen's bottom action uses it, at the same height. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  flex,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** A glyph before the label, as in the Sleep sheet's buttons. */
  icon?: SymbolViewProps['name'];
  /** Shares a row with another button. */
  flex?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.cta, flex && styles.flex, disabled && styles.ctaDisabled, pressed && styles.pressed]}
    >
      {icon ? <SymbolView name={icon} size={17} weight="semibold" tintColor={disabled ? Nocturne.text3 : Nocturne.onCta} /> : null}
      <Text style={[styles.ctaLabel, disabled && styles.ctaLabelDisabled]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The outlined pill that sits beside a `PrimaryButton`: the other, quieter choice. */
export function OutlineButton({ label, onPress, flex }: { label: string; onPress: () => void; flex?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.cta, styles.outline, flex && styles.flex, pressed && styles.pressed]}
    >
      <Text style={styles.outlineLabel} numberOfLines={1}>
        {label}
      </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.s,
  },
  flex: { flex: 1 },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Nocturne.progressTrack },
  outlineLabel: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  ctaDisabled: { backgroundColor: Nocturne.raised },
  ctaLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  ctaLabelDisabled: { color: Nocturne.text3 },
  pressed: { opacity: 0.75 },
  textButton: { alignSelf: 'center', paddingVertical: Space.xs },
  textButtonLabel: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },
});
