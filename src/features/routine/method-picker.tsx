import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { Nocturne, Space, Type } from '@/theme';

import { type MethodPickerProps } from './method-picker-types';

/**
 * How you get up: the way picked as one row in the Routine card, opening the grid of ways in the
 * Sleep sheet's floating card (/wake-method), the same on iPhone as everywhere (user 2026-11-03).
 * The grid saves for itself, and the screen reloads on focus as the sheet closes, so `onPicked`
 * isn't needed here.
 */
export function MethodPicker({ options, selected, detail, separator }: MethodPickerProps) {
  const current = options.find((o) => o.value === selected) ?? options[0];
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        router.push('/wake-method');
      }}
      accessibilityRole="button"
      accessibilityLabel={`How you get up: ${current.title}`}
      accessibilityHint="Opens the ways to get up."
      style={({ pressed }) => [styles.method, separator && styles.separator, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <SymbolView name={current.icon} size={19} tintColor={Nocturne.text} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.change}>Change</Text>
      <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The way picked, as one row-sized button: its icon on a frosted tile, then "Change".
  method: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingVertical: Space.m, paddingHorizontal: Space.l },
  // A hairline above the setup row under it (Steps, Push-ups, your code or place).
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Nocturne.edge },
  pressed: { opacity: 0.6 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.frost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  detail: { ...Type.secondary, color: Nocturne.text2 },
  change: { color: Nocturne.text2, fontSize: 15 },
});
