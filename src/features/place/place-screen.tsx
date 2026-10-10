'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Text } from '@/components/text';
import { useLock } from '@/hooks/use-lock';
import { heldPhase } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { readLock, routineAt } from '@/lib/lock-controller';
import type { Phase } from '@/lib/lock-state';
import { getMorningPlace, getPlaceEditRefusal, submitPlaceFix } from '@/lib/place';
import { getRoutine } from '@/lib/routine';
import { formatPreset } from '@/lib/text';
import { Gap, Nocturne, Radius, Space, Type } from '@/theme';

import { Voice } from '../exits/voice';
import { nextLockedMorning } from '../scan/next-locked-morning';
import { awakeStatus } from '../wake/awake-status';
import { readFix } from './locate';
import { livePlaceStage, placeWords, type Stage } from './place-stage';
import { usesMiles } from './units';

/**
 * Leave the house (GAME_PLAN, "Wake-up methods"), both halves:
 * - **Setup:** in its own sheet, `/place-pick` (place-pick.tsx). This screen only sends there.
 * - **Morning:** get there and tap Check in. One location read; a fix at the place wakes the
 *   apps (`submitPlaceFix`).
 *
 * `/place?mode=setup` or `/place?mode=morning`; without a mode it picks the morning check when
 * the apps are waiting for one, and setup otherwise.
 */

export type PlaceMode = 'setup' | 'morning';

/** Night and day both refuse a check-in, as on the scan screen. */
function notMorning(phase: Phase): Stage | null {
  if (phase === 'night') return heldPhase('night') === 'night' ? { kind: 'notYet' } : { kind: 'awake' };
  if (phase === 'morning') return heldPhase('morning') === 'morning' ? null : { kind: 'awake' };
  return { kind: 'awake' };
}

function firstStage(mode: PlaceMode | undefined): Stage {
  const phase = readLock().phase;
  const place = getMorningPlace();
  if (mode === 'morning' || (!mode && phase === 'morning' && place)) {
    if (!place) return phase === 'night' || phase === 'morning' ? { kind: 'noPlace' } : { kind: 'pick' };
    return notMorning(phase) ?? { kind: 'morning' };
  }
  if (getPlaceEditRefusal()) return { kind: 'asleep' };
  return { kind: 'pick' };
}


export function PlaceScreen({ mode }: { mode?: PlaceMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [storedStage, setStage] = useState<Stage>(() => firstStage(mode));
  const stage = livePlaceStage(storedStage, firstStage(mode), lock, getPlaceEditRefusal() !== null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const routine = getRoutine();

  const onCheckIn = async () => {
    setStage({ kind: 'checking' });
    const located = await readFix();
    if (!located.ok) {
      haptic.thud();
      setStage({ kind: 'noFix', why: located.why });
      return;
    }
    const result = submitPlaceFix(located.fix);
    if (result.kind === 'unlocked') {
      haptic.done();
      setStage({ kind: 'unlocked', morningKey: readLock().morningKey });
    } else if (result.kind === 'notMorning') setStage(notMorning(readLock().phase) ?? { kind: 'awake' });
    else if (result.kind === 'noPlace') setStage({ kind: 'noPlace' });
    else if (result.kind === 'notThere') {
      haptic.thud();
      setStage({ kind: 'notThere', distance: result.distance });
    } else {
      haptic.thud();
      setStage({ kind: 'unsure' });
    }
  };

  const now = new Date();
  const { line, body } = placeWords(stage, {
    place: getMorningPlace()?.name ?? null,
    awake: stage.kind === 'unlocked' ? awakeStatus(readLock()) : '',
    next: stage.kind === 'awake' || stage.kind === 'saved' ? nextLockedMorning(now) : null,
    morningStart: formatPreset(routineAt(now).morningStart),
    stepGoal: routine.stepGoal,
    imperial: usesMiles(),
    now,
  });
  const finished = stage.kind === 'unlocked' || stage.kind === 'saved';
  const morning = stage.kind === 'morning' || stage.kind === 'notThere' || stage.kind === 'unsure' || stage.kind === 'noFix';
  const steps = () => router.replace({ pathname: '/wake', params: { method: 'steps' } });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.m, paddingBottom: insets.bottom + Space.l }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.bar}>
        <TextButton label={finished ? 'Done' : 'Close'} onPress={close} />
      </View>

      <Animated.View key={`${stage.kind}-${line}`} entering={FadeIn.duration(300)} style={styles.top}>
        <Voice text={line} />
        <Text style={styles.body}>{body}</Text>
      </Animated.View>

      {stage.kind === 'checking' ? <ActivityIndicator style={styles.spinner} color={Nocturne.text2} /> : null}

      <View style={styles.flex} />

      <View style={styles.bottom}>
        {morning ? (
          <>
            <PrimaryButton label={stage.kind === 'morning' ? 'Check in' : 'Try again'} icon="location.fill" onPress={onCheckIn} />
            {stage.kind === 'noFix' && stage.why !== 'failed' ? (
              <TextButton label="Open Settings" onPress={() => Linking.openSettings()} />
            ) : null}
            {/* Every morning offers walking instead (GAME_PLAN): no signal, a closed gym, a sick day. */}
            <TextButton label={`Walk ${routine.stepGoal} steps instead`} onPress={steps} />
            <TextButton label="Other ways to wake them" onPress={() => router.push('/exits')} />
          </>
        ) : null}

        {/* Picking happens in its own sheet (place-pick.tsx). */}
        {stage.kind === 'pick' || stage.kind === 'confirm' ? (
          <PrimaryButton label="Pick your place" onPress={() => router.replace('/place-pick')} />
        ) : null}

        {finished || stage.kind === 'asleep' || stage.kind === 'notYet' || stage.kind === 'awake' || stage.kind === 'noPlace' ? (
          <PrimaryButton label={finished ? 'Done' : 'Okay'} onPress={close} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Pure black, like the picker sheet (user's ask, 2026-10-09).
  screen: { flex: 1, backgroundColor: '#000000' },
  content: { flexGrow: 1, paddingHorizontal: Gap.gutter },
  bar: { flexDirection: 'row', justifyContent: 'flex-start' },
  top: { gap: Space.l, marginTop: Space.xxl },
  body: { ...Type.body, color: Nocturne.text2 },
  pick: { gap: Space.m, marginTop: Gap.block },
  input: {
    ...Type.body,
    color: Nocturne.text,
    backgroundColor: Nocturne.surface,
    borderRadius: Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nocturne.edge,
    paddingHorizontal: Space.l,
    paddingVertical: Space.m,
  },
  note: { ...Type.secondary, color: Nocturne.text2 },
  spinner: { marginTop: Space.xl },
  flex: { flex: 1, minHeight: Space.xl },
  bottom: { gap: Space.l, paddingBottom: Space.s },
});
