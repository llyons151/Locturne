import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Track } from '@/components/meter';
import * as haptic from '@/lib/haptics';
import { PUSHUPS, repProgress, walkProgress, type PushupsSession } from '@/lib/wake/pushups';
import { pushupsLine, spokenRep } from '@/lib/wake/lines';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { Body, MotionOff, Voice } from './parts';
import { usePushups } from './use-pushups';

/**
 * Push-ups (GAME_PLAN, "Wake-up methods"): tap Start, carry the phone a few steps to the
 * floor, put it down face-up, and do ten. The proximity sensor counts each rep, and Loc says
 * the count out loud, since the screen goes dark under your chest. "Walk N steps instead" is
 * always on offer, like every method.
 */
export function PushupsView({
  goal,
  target,
  onMet,
  onSteps,
  footer,
}: {
  /** The step goal, for "walk instead". */
  goal: number;
  /** Push-ups to do: the routine's `pushupGoal`. */
  target: number;
  onMet: () => void;
  onSteps: () => void;
  footer?: ReactNode;
}) {
  const { access, session, start, cancel, say } = usePushups();
  const [quiet, setQuiet] = useState(false);
  const status = session?.status;
  const met = status === 'met';
  const reps = session?.reps ?? 0;
  // Read by the effects below without re-running them: turning the voice back on says nothing.
  const quietNow = useRef(quiet);
  useEffect(() => {
    quietNow.current = quiet;
  }, [quiet]);

  useEffect(() => {
    if (met) onMet();
  }, [met, onMet]);

  // Each rep: the count out loud and a tap, since the screen is dark under your chest.
  const said = useRef(0);
  useEffect(() => {
    if (reps > said.current) {
      haptic.tick();
      if (!quietNow.current) say(spokenRep(reps, target));
      AccessibilityInfo.announceForAccessibility(`${reps} of ${target}`);
    }
    said.current = reps;
  }, [reps, target, say]);

  // Settled flat: tell them to go, out loud, since they may already be on the floor.
  const counting = status === 'counting';
  useEffect(() => {
    if (!counting) return;
    haptic.tick();
    if (!quietNow.current) say(said.current > 0 ? 'Go on.' : 'Go.');
  }, [counting, say]);

  const instead = `Walk ${goal} steps instead`;

  if (access === 'denied') {
    return (
      <View style={styles.page}>
        <Voice text="I can't tell you got to the floor." />
        <View style={styles.flex} />
        <View style={styles.bottom}>
          <MotionOff what="count the steps to the floor" />
          <TextButton label={instead} onPress={onSteps} />
          {footer}
        </View>
      </View>
    );
  }

  if (access === 'unavailable') {
    return (
      <View style={styles.page}>
        <View style={styles.top}>
          <Voice text="I can't feel you on this phone." />
          <Body>{`Push-ups need the iPhone's proximity sensor, and I can't turn it on here. Walk ${goal} steps instead; they count the same.`}</Body>
        </View>
        <View style={styles.flex} />
        <View style={styles.bottom}>
          <PrimaryButton label={instead} onPress={onSteps} />
          {footer}
        </View>
      </View>
    );
  }

  const lifted = status === 'placing' && reps > 0;
  const line = pushupsLine(status ?? 'idle', reps, target, session?.miss ?? null, lifted);
  const running = !!session && !met && status !== 'timedOut';

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Voice text={line} />
        <Body>{bodyFor(status, lifted, target)}</Body>
      </View>

      <View style={styles.flex} />

      {session && <Meter session={session} />}

      <View style={styles.bottom}>
        {!session && <PrimaryButton label="Start" onPress={() => start(target)} disabled={access === 'checking'} />}
        {status === 'timedOut' && <PrimaryButton label="Start again" onPress={() => start(target)} />}
        {running && (
          <TextButton label={quiet ? 'Count out loud' : 'Count quietly'} onPress={() => setQuiet((q) => !q)} />
        )}
        {running && <TextButton label="Stop" onPress={cancel} />}
        {!met && <TextButton label={instead} onPress={onSteps} />}
        {footer}
      </View>
    </View>
  );
}

function bodyFor(status: PushupsSession['status'] | undefined, lifted: boolean, target: number): string {
  switch (status) {
    case undefined:
      return `Tap Start and take me a few steps to the floor. Put me down face-up and do ${target} push-ups over me, chest to the top of the screen.`;
    case 'walking':
      return 'Walk me to a clear bit of floor.';
    case 'placing':
      return lifted
        ? 'Lay me flat, face-up, and keep going. The ones you did still count.'
        : 'Face-up, flat, and somewhere I won’t get stepped on.';
    case 'counting':
      return 'Chest down until the screen goes dark, then push up. I count out loud.';
    case 'timedOut':
      return 'Nothing like a push-up in ten minutes. Start again, or walk instead.';
    default:
      return '';
  }
}

/** Steps to the floor while walking, then the rep count against the ten. */
function Meter({ session }: { session: PushupsSession }) {
  const walking = session.status === 'walking';
  const value = walking ? Math.min(session.steps, PUSHUPS.walkSteps) : session.reps;
  const of = walking ? PUSHUPS.walkSteps : session.goal;
  const unit = walking ? 'steps' : 'push-ups';
  return (
    <View style={styles.meter} accessible accessibilityLabel={`${value} of ${of} ${unit}.`}>
      <View style={styles.reading}>
        <Text style={styles.count} maxFontSizeMultiplier={1.2}>
          {value}
        </Text>
        <Text style={styles.unit}>
          {unit} <Text style={styles.of}>of {of}</Text>
        </Text>
      </View>
      <Track progress={walking ? walkProgress(session) : repProgress(session)} />
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
  count: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 72, lineHeight: 80, fontVariant: ['tabular-nums'] },
  unit: { ...Type.body, color: Nocturne.text, fontWeight: '600' },
  of: { color: Nocturne.text2, fontWeight: '400' },
});
