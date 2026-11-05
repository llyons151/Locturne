import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { DOWNTIME_MINUTES_RANGE, DOWNTIME_STEPS_RANGE, downtimeMinutesOf, downtimeStepsOf } from '@/lib/routine';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { applyRoutineEdit, getSetRoutine, refuseWhileAsleep } from './apply-edit';
import { PushupWheel } from './pushup-wheel';

/**
 * Step away's two numbers (wake/downtime.ts), each on the wheel the other counts use
 * (steps-sheet.tsx): how long the apps stay asleep once you're up, in quarter hours, and the
 * steps that show you're up, in tens. Saves however the sheet closes, like every routine edit
 * (apply-edit.ts), so from bed it's refused and says why.
 */
const PARTS = {
  minutes: {
    title: 'Step away',
    body: 'Minutes your apps stay asleep, counted from your first steps.',
    label: 'Minutes',
    of: downtimeMinutesOf,
    key: 'downtimeMinutes',
    range: DOWNTIME_MINUTES_RANGE,
  },
  steps: {
    title: 'Steps first',
    body: 'Steps that show you’re out of bed. Then the timer starts.',
    label: 'Steps',
    of: downtimeStepsOf,
    key: 'downtimeSteps',
    range: DOWNTIME_STEPS_RANGE,
  },
} as const;

export function DowntimeSheet({ part }: { part: keyof typeof PARTS }) {
  const spec = PARTS[part];
  const [count, setCount] = useState(() => spec.of(getSetRoutine()));
  const latest = useRef(count);
  useEffect(() => {
    latest.current = count;
  }, [count]);

  useEffect(
    () => () => {
      const set = getSetRoutine();
      if (spec.of(set) !== latest.current && !refuseWhileAsleep()) applyRoutineEdit({ ...set, [spec.key]: latest.current });
    },
    [spec],
  );

  const done = () => {
    haptic.done();
    closeSleepSheet();
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {spec.title}
        </Text>
        <Text style={styles.body}>{spec.body}</Text>
      </View>
      <PushupWheel value={count} onChange={setCount} range={spec.range} label={spec.label} />
      <Pressable onPress={done} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonLabel}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
