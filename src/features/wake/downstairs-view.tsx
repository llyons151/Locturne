import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Track } from '@/components/meter';
import * as haptic from '@/lib/haptics';
import { DOWNSTAIRS, heightProgress, holdProgress, type DownstairsSession } from '@/lib/wake/downstairs';
import { downstairsLine } from '@/lib/wake/lines';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { Body, MotionOff, Voice } from './parts';
import { useDownstairs } from './use-downstairs';

/**
 * "Go downstairs" (docs/DOWNSTAIRS_METHOD.md): tap Start in bed, carry the phone down a
 * floor, and stay there five seconds. A live height meter fills as they go. "Walk N steps
 * instead" is always on offer: it proves the same thing, and covers a dead barometer, a
 * hotel or a bad knee.
 */
export function DownstairsView({
  goal,
  onMet,
  onSteps,
  footer,
}: {
  goal: number;
  onMet: () => void;
  onSteps: () => void;
  footer?: ReactNode;
}) {
  const { access, session, start, stop } = useDownstairs();
  const status = session?.status;
  const met = status === 'met';

  useEffect(() => {
    if (met) onMet();
  }, [met, onMet]);

  // A light tap when the hold begins, so they know to stop walking.
  const holding = status === 'holding';
  useEffect(() => {
    if (holding) haptic.tick();
  }, [holding]);

  // A silent sensor: stop listening, and say so below.
  const broken = access === 'unavailable' || status === 'noSignal' || status === 'flat';
  useEffect(() => {
    if (broken) stop();
  }, [broken, stop]);

  const instead = `Walk ${goal} steps instead`;

  if (access === 'denied') {
    return (
      <View style={styles.page}>
        <Voice text="I can't feel the stairs." />
        <View style={styles.flex} />
        <View style={styles.bottom}>
          <MotionOff what="tell when you change floors" />
          <TextButton label={instead} onPress={onSteps} />
          {footer}
        </View>
      </View>
    );
  }

  if (broken) {
    return (
      <View style={styles.page}>
        <View style={styles.top}>
          <Voice text={downstairsLine('flat', 0)} />
          <Body>
            {access === 'unavailable'
              ? `This phone has no barometer I can read. Walk ${goal} steps instead; they count the same.`
              : `It may be the sensor, or the phone. Walk ${goal} steps instead; they count the same.`}
          </Body>
        </View>
        <View style={styles.flex} />
        <View style={styles.bottom}>
          <PrimaryButton label={instead} onPress={onSteps} />
          {access !== 'unavailable' && <TextButton label="Try the stairs again" onPress={start} />}
          {footer}
        </View>
      </View>
    );
  }

  const progress = session ? heightProgress(session) : 0;
  const line = downstairsLine(status ?? 'idle', progress);
  const running = !!session && !met && status !== 'timedOut';

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Voice text={line} />
        <Body>{bodyFor(status)}</Body>
      </View>

      <View style={styles.flex} />

      {session && <HeightMeter session={session} />}

      <View style={styles.bottom}>
        {!session && <PrimaryButton label="Start" onPress={start} disabled={access === 'checking'} />}
        {status === 'timedOut' && <PrimaryButton label="Start again" onPress={start} />}
        {running && <TextButton label="Stop" onPress={stop} />}
        {!met && <TextButton label={instead} onPress={onSteps} />}
        {footer}
      </View>
    </View>
  );
}

function bodyFor(status: DownstairsSession['status'] | undefined): string {
  switch (status) {
    case undefined:
      return 'Tap Start, then take the stairs with your phone. One floor down, or up, and stay there for five seconds.';
    case 'holding':
      return 'Stay on this floor for five seconds.';
    case 'timedOut':
      return 'Nothing like a floor in five minutes. Start again on the stairs, or walk instead.';
    default:
      return 'Keep the screen on and take the stairs. Up counts too.';
  }
}

/** The live meter: metres moved so far against the floor needed, then the five-second hold. */
function HeightMeter({ session }: { session: DownstairsSession }) {
  const metres = Math.abs(session.change);
  const holding = session.status === 'holding' || session.status === 'met';
  const hold = holdProgress(session);
  const secondsLeft = Math.max(0, Math.ceil(((1 - hold) * DOWNSTAIRS.holdMs) / 1000));
  const direction = session.change < -0.2 ? 'down' : session.change > 0.2 ? 'up' : null;

  return (
    <View
      style={styles.meter}
      accessible
      accessibilityLabel={
        holding
          ? `Floor reached. Hold for ${secondsLeft} more seconds.`
          : `${metres.toFixed(1)} of ${DOWNSTAIRS.threshold} metres${direction ? `, going ${direction}` : ''}.`
      }
    >
      <View style={styles.reading}>
        <Text style={styles.metres} maxFontSizeMultiplier={1.2}>
          {metres.toFixed(1)}
        </Text>
        <Text style={styles.unit}>
          m {direction ?? ''} <Text style={styles.of}>of {DOWNSTAIRS.threshold} m</Text>
        </Text>
      </View>
      <Track progress={heightProgress(session)} />
      <Text style={styles.hold}>
        {session.status === 'met' ? 'Floor reached.' : holding ? `Hold ${secondsLeft} s` : ' '}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, gap: Space.l },
  flex: { flex: 1, minHeight: Space.xxl },
  top: { gap: Space.l, marginTop: Space.xxl },
  bottom: { gap: Space.l, paddingBottom: Space.s },
  meter: { gap: Space.m },
  reading: { flexDirection: 'row', alignItems: 'baseline', gap: Space.s },
  metres: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 72, lineHeight: 80, fontVariant: ['tabular-nums'] },
  unit: { ...Type.body, color: Nocturne.text, fontWeight: '600' },
  of: { color: Nocturne.text2, fontWeight: '400' },
  hold: { ...Type.secondary, color: Nocturne.text2, fontVariant: ['tabular-nums'] },
});
