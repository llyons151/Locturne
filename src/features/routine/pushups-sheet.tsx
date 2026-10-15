import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { pushupGoalOf } from '@/lib/routine';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { applyRoutineEdit, getSetRoutine } from './apply-edit';
import { PushupWheel } from './pushup-wheel';

/**
 * How many push-ups a morning takes, in the Sleep sheet's floating card (user's ask,
 * 2026-10-10: "it should be a scroll wheel, you can pick as many as you want"). A title, the
 * wheel, and one white Done button, laid out like the Sleep sheet. The number saves however the
 * sheet closes, Done, a swipe or a tap outside (user, 2026-10-14: tapping out lost it), like
 * every routine edit (apply-edit.ts).
 */
export function PushupsSheet() {
  const [count, setCount] = useState(() => pushupGoalOf(getSetRoutine()));
  const latest = useRef(count);
  useEffect(() => {
    latest.current = count;
  }, [count]);

  // Saved as the sheet goes, whichever way it's closed.
  useEffect(
    () => () => {
      const set = getSetRoutine();
      if (pushupGoalOf(set) !== latest.current) applyRoutineEdit({ ...set, pushupGoal: latest.current });
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
          Push-ups
        </Text>
        <Text style={styles.body}>How many it takes to wake your apps.</Text>
      </View>
      <PushupWheel value={count} onChange={setCount} />
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
