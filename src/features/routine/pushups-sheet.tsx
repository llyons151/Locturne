import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { pushupGoalOf, SQUAT_MAX, SQUAT_MIN, squatGoalOf } from '@/lib/routine';
import type { Exercise } from '@/lib/wake/pushups';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { applyRoutineEdit, getSetRoutine, refuseWhileAsleep } from './apply-edit';
import { PushupWheel } from './pushup-wheel';

/**
 * How many push-ups a morning takes, in the Sleep sheet's floating card (user's ask,
 * 2026-10-10: "it should be a scroll wheel, you can pick as many as you want"). A title, the
 * wheel, and one white Done button, laid out like the Sleep sheet. The number saves however the
 * sheet closes, Done, a swipe or a tap outside (user, 2026-10-14: tapping out lost it), like
 * every routine edit (apply-edit.ts). Squats' count is picked the same way (`exercise`, /squats).
 */
const GOAL = {
  pushups: { title: 'Push-ups', of: pushupGoalOf, key: 'pushupGoal', range: undefined },
  squats: { title: 'Squats', of: squatGoalOf, key: 'squatGoal', range: { min: SQUAT_MIN, max: SQUAT_MAX, by: 1 } },
} as const;

export function PushupsSheet({ exercise = 'pushups' }: { exercise?: Exercise }) {
  const goal = GOAL[exercise];
  const [count, setCount] = useState(() => goal.of(getSetRoutine()));
  const latest = useRef(count);
  useEffect(() => {
    latest.current = count;
  }, [count]);

  // Saved as the sheet goes, whichever way it's closed. From bed (a deep link while the apps
  // are asleep) it's refused, and says so rather than dropping the number quietly.
  useEffect(
    () => () => {
      const set = getSetRoutine();
      if (goal.of(set) !== latest.current && !refuseWhileAsleep()) applyRoutineEdit({ ...set, [goal.key]: latest.current });
    },
    [goal],
  );

  const done = () => {
    haptic.done();
    closeSleepSheet();
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {goal.title}
        </Text>
        <Text style={styles.body}>How many it takes to wake your apps.</Text>
      </View>
      <PushupWheel value={count} onChange={setCount} range={goal.range} label={goal.title} />
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
