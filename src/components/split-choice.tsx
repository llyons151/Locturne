import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { type Symbol } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { Nocturne, Space, Type } from '@/theme';

/**
 * TIDE's split row (user's reference, 2026-10-08): one pill, two halves, each a round icon,
 * a title and a short grey line. The chosen half sits on a lighter pane, like a segmented
 * control. Used by the nap sheet and the Apps tab.
 */

const INK = Nocturne.text;
const INK2 = Nocturne.text2;
const ACCENT = Nocturne.accent ?? Nocturne.text;
const GLASS = 'rgba(255, 255, 255, 0.07)';

/** `compact` is a shorter row for the top of a tab (the Apps switcher); the nap sheet keeps the full one. */
export function Split({ label, compact, children }: { label?: string; compact?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.split, compact && styles.splitCompact]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {children}
    </View>
  );
}

/** One half of the split row: a round icon, then the title over a grey line. */
export function SplitHalf({
  icon,
  title,
  detail,
  selected,
  compact,
  onPress,
}: {
  icon: Symbol;
  title: string;
  detail: string;
  selected: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      style={({ pressed }) => [styles.half, compact && styles.halfCompact, selected && styles.halfOn, pressed && styles.pressed]}
    >
      <View style={[styles.icon, selected && styles.iconOn]}>
        <SymbolView name={icon} size={13} tintColor={selected ? Nocturne.onCta : INK2} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, !selected && styles.titleOff]} numberOfLines={1}>{title}</Text>
        <Text style={styles.detail} numberOfLines={1}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  split: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: GLASS,
  },
  half: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.s,
    paddingVertical: Space.m,
    paddingHorizontal: Space.s,
    borderRadius: 18,
    borderCurve: 'continuous',
  },
  splitCompact: { borderRadius: 18 },
  halfCompact: { paddingVertical: Space.xs + 2, borderRadius: 14 },
  halfOn: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  pressed: { opacity: 0.7 },
  icon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS },
  iconOn: { backgroundColor: ACCENT },
  text: { flexShrink: 1 },
  title: { color: INK, fontSize: 15, fontWeight: '600' },
  titleOff: { color: INK2 },
  detail: { ...Type.caption, color: INK2 },
});
