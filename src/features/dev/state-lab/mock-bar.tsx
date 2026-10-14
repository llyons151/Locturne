import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';

import { FAKE_COLOR } from '../wake-lab/fake-tag';
import { stepAppState } from './app-states';

/**
 * Dev only: on Home while a made-up state shows (app-states.ts), in the gap under the week
 * strip (`top`), clear of the counts above and of Loc, who sits over anything at the foot.
 * The arrows step through the states in place; the name opens the list.
 */
export function MockBar({ label, top }: { label: string; top: number }) {
  return (
    <View style={[styles.bar, { top }]}>
      <Arrow name="chevron.left" android="chevron_left" label="Previous state" onPress={() => stepAppState(-1)} />
      <Pressable
        onPress={() => router.push('/app-states')}
        accessibilityRole="button"
        accessibilityLabel={`Made-up state: ${label}. Opens the list.`}
        style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
      >
        <Text style={styles.text} numberOfLines={1}>
          FAKE · {label}
        </Text>
      </Pressable>
      <Arrow name="chevron.right" android="chevron_right" label="Next state" onPress={() => stepAppState(1)} />
    </View>
  );
}

function Arrow({ name, android, label, onPress }: { name: string; android: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      <SymbolView name={sym(name, android)} size={13} weight="semibold" tintColor={FAKE_COLOR} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tag: {
    flexShrink: 1,
    borderWidth: 1,
    borderColor: FAKE_COLOR,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  text: { color: FAKE_COLOR, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8 },
  arrow: {
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: FAKE_COLOR,
    borderStyle: 'dashed',
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pressed: { opacity: 0.6 },
});
