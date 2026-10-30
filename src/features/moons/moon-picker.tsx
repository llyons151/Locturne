import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { LADDER } from './moon-data';
import { DEFAULT_MOON, LADDER_MOONS, OTHER_MOONS, setMoon, useMoon } from './moon-theme';
import { MoonWheel } from './moon-wheel';

/** When each ladder moon unlocks (docs/reports/Moon count and unlock pacing.md). */
const UNLOCKS = ['Morning 1', 'Morning 3', 'Morning 7', 'Morning 14', 'Morning 30', 'Morning 50', 'Morning 100', 'Morning 150', 'Morning 200', 'Week 50', 'Secret'];

/** Today's moon, then your ladder from the moon lab in unlock order, then every other moon. */
const ROWS = [
  { id: DEFAULT_MOON.id, label: DEFAULT_MOON.name },
  ...LADDER_MOONS.map((m) => ({ id: m.id, label: `${m.name} · ${UNLOCKS[LADDER.indexOf(m.id)] ?? ''}` })),
  ...OTHER_MOONS.map((m) => ({ id: m.id, label: m.name })),
];

/**
 * Dev and preview builds: every moon, all unlocked, on Apple's wheel in the Sleep sheet's floating
 * card, picked like the step target (user, 2026-10-29: "exactly like" Steps). The moon changes behind
 * the card as the wheel turns.
 */
export function MoonPicker() {
  const worn = useMoon();
  const done = () => {
    haptic.done();
    closeSleepSheet();
  };
  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Moon
        </Text>
        <Text style={styles.body}>Your ladder first, then every other moon.</Text>
      </View>
      <MoonWheel rows={ROWS} value={worn.id} onChange={setMoon} />
      <Pressable onPress={done} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonLabel}>Done</Text>
      </Pressable>
    </View>
  );
}

// As steps-sheet.tsx.
const styles = StyleSheet.create({
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.l },
  head: { gap: Space.xs, alignItems: 'center' },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 19, lineHeight: 24, textAlign: 'center', marginTop: Space.xs },
  body: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  button: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: Nocturne.cta },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
