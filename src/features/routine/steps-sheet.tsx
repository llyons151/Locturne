import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { STEPS_RANGE } from '@/lib/routine';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { applyRoutineEdit, getSetRoutine, refuseWhileAsleep } from './apply-edit';
import { PushupWheel } from './pushup-wheel';

/**
 * How many steps a walking morning takes, in the Sleep sheet's floating card, picked like push-ups
 * (user 2026-10-28; pushups-sheet.tsx): a title, the wheel in fifties, and Done. Saves however the
 * sheet closes, like every routine edit (apply-edit.ts).
 */
export function StepsSheet() {
  const [count, setCount] = useState(() => getSetRoutine().stepGoal);
  const latest = useRef(count);
  useEffect(() => {
    latest.current = count;
  }, [count]);

  // Saved as the sheet goes, whichever way it's closed. From bed (a deep link while the apps
  // are asleep) it's refused, and says so rather than dropping the number quietly.
  useEffect(
    () => () => {
      const set = getSetRoutine();
      if (set.stepGoal !== latest.current && !refuseWhileAsleep()) applyRoutineEdit({ ...set, stepGoal: latest.current });
    },
    [],
  );

  const done = () => {
    haptic.done();
    closeSleepSheet();
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Steps
        </Text>
        <Text style={styles.body}>How many it takes to wake your apps.</Text>
      </View>
      <PushupWheel value={count} onChange={setCount} range={STEPS_RANGE} label="Steps" />
      <Pressable
        onPress={done}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized to its contents inside the card, padded like the Sleep sheet.
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.l },
  head: { gap: Space.xs, alignItems: 'center' },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 19, lineHeight: 24, textAlign: 'center', marginTop: Space.xs },
  body: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: Nocturne.cta,
  },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
