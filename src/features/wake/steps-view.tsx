import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatPreset } from '@/features/onboarding/time-wheel';
import { useStepCount } from '@/hooks/use-step-count';
import { stepsLine } from '@/lib/wake/lines';
import { Space } from '@/theme';

import { BigNumber, Body, MotionOff, Track, Voice } from './parts';

/**
 * "Walk it off": steps since morning start, counted live while he complains. Steps walked
 * before opening the app already count, so someone who got up and made coffee may find
 * they're done the moment it opens.
 *
 * When steps can't be counted at all (Motion & Fitness off, or no step counter, as on an
 * iPad), `stuck` is shown too, so there's always a way forward (GAME_PLAN: "Never leave
 * someone stuck").
 */
export function StepsView({
  goal,
  morningStart,
  onMet,
  footer,
  stuck,
}: {
  goal: number;
  morningStart: Date;
  onMet: () => void;
  footer?: ReactNode;
  stuck?: ReactNode;
}) {
  const { status, steps } = useStepCount(true, morningStart, goal);
  const walked = status === 'counting' && steps >= goal;

  useEffect(() => {
    if (walked) onMet();
  }, [walked, onMet]);

  if (status === 'denied') {
    return (
      <View style={styles.page}>
        <Voice text="I can't hear you walking." />
        <View style={styles.flex} />
        <View style={styles.bottom}>
          <MotionOff what="count your steps" />
          {footer}
          {stuck}
        </View>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <View style={styles.page}>
        <View style={styles.top}>
          <Voice text="I can't count steps on this." />
          <Body>Steps need the iPhone&apos;s motion sensor, and this device doesn&apos;t have one I can read.</Body>
        </View>
        <View style={styles.flex} />
        <View style={styles.bottom}>
          {footer}
          {stuck}
        </View>
      </View>
    );
  }

  const shown = Math.min(steps, goal);
  const left = Math.max(0, goal - steps);
  const since = formatPreset(morningStart.getHours() * 60 + morningStart.getMinutes());

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Voice text={stepsLine(steps, goal)} />
        <Body>Steps since {since} count, even the ones you took before opening me.</Body>
      </View>

      <View style={styles.flex} />

      <View
        style={styles.meter}
        accessible
        accessibilityLabel={`${shown} of ${goal} steps. ${left} more wakes your apps.`}
      >
        <BigNumber value={status === 'starting' ? '–' : String(shown)} caption={`of ${goal} steps`} />
        <Track progress={goal > 0 ? shown / goal : 1} />
        <Body>{left > 0 ? `${left} more and your apps wake up.` : 'That will do.'}</Body>
      </View>

      <View style={styles.bottom}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: Space.l },
  flex: { flex: 1, minHeight: Space.xxl },
  top: { gap: Space.l, marginTop: Space.xxl },
  meter: { gap: Space.m },
  bottom: { gap: Space.l, paddingTop: Space.l, paddingBottom: Space.s },
});
