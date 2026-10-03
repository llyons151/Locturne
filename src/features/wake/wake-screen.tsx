import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { formatPreset } from '@/features/onboarding/time-wheel';
import { useLock } from '@/hooks/use-lock';
import * as haptic from '@/lib/haptics';
import { proveMorning, readLock } from '@/lib/lock-controller';
import { currentMorning, type LockState } from '@/lib/lock-state';
import { getRoutine, toLockSettings } from '@/lib/routine';
import { PHASE_LINES } from '@/lib/wake/lines';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { DownstairsView } from './downstairs-view';
import { Body, TopBar, Voice } from './parts';
import { StepsView } from './steps-view';

export type WakeMethodShown = 'downstairs' | 'steps';

const clockOf = (date: Date) => formatPreset(date.getHours() * 60 + date.getMinutes());

/**
 * The morning: prove you're up and the apps wake (GAME_PLAN, "Core loop" and "Wake-up
 * methods"). Opens on the routine's method; "walk N steps instead" is always there. Both
 * methods end the same way: `proveMorning` records the proof and syncs the shields, so this
 * screen never decides anything about the lock itself.
 *
 * Outside the morning it says why there's nothing to do: bedtime wins at night, and a
 * morning already proved stays proved.
 */
export function WakeScreen({ method }: { method?: WakeMethodShown }) {
  // The phone is in hand the whole time; don't let it lock mid-staircase.
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [routine] = useState(() => getRoutine());
  const [shown, setShown] = useState<WakeMethodShown>(method ?? (routine.method === 'steps' ? 'steps' : 'downstairs'));
  const [unlocked, setUnlocked] = useState<LockState | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onMet = useCallback(
    (kind: WakeMethodShown) => {
      const state = proveMorning(kind) ?? readLock();
      if (state.phase !== 'day') return; // bedtime came round, or the night was off
      haptic.done();
      setUnlocked(state);
    },
    [],
  );
  const onSteps = useCallback(() => onMet('steps'), [onMet]);
  const onDownstairs = useCallback(() => onMet('downstairs'), [onMet]);

  const switchTo = (next: WakeMethodShown) => {
    haptic.tap();
    setShown(next);
  };

  let content;
  if (unlocked) content = <Unlocked state={unlocked} onDone={close} />;
  else if (lock.phase !== 'morning') content = <NotMorning state={lock} onClose={close} />;
  else {
    const morningStart = currentMorning(new Date(), toLockSettings(routine)).start;
    const scan =
      routine.method === 'scan' ? (
        <TextButton label="Scan your code instead" onPress={() => router.replace('/scan')} />
      ) : null;
    content =
      shown === 'downstairs' ? (
        <DownstairsView goal={routine.stepGoal} onMet={onDownstairs} onSteps={() => switchTo('steps')} footer={scan} />
      ) : (
        <StepsView
          goal={routine.stepGoal}
          morningStart={morningStart}
          onMet={onSteps}
          footer={
            <>
              {routine.method === 'downstairs' && (
                <TextButton label="Go downstairs instead" onPress={() => switchTo('downstairs')} />
              )}
              {scan}
            </>
          }
        />
      );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + Space.l }]}
      showsVerticalScrollIndicator={false}
    >
      <TopBar label={unlocked || lock.phase === 'day' ? 'Today' : 'This morning'} onClose={close} />
      {content}
    </ScrollView>
  );
}

/**
 * The success moment, kept small: his line, one honest status line, Done. No confetti
 * (VOICE.md: "confetti energy" is on the never list).
 */
function Unlocked({ state, onDone }: { state: LockState; onDone: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.page}>
      <View style={styles.top}>
        <Voice text="I'm up. Don't talk to me yet." />
        <View style={styles.statusRow}>
          <SymbolView name={sym('lock.open.fill', 'lock_open')} size={15} tintColor={Nocturne.text2} />
          <Text style={styles.status}>Apps awake until {clockOf(state.nextChange)}</Text>
        </View>
      </View>
      <View style={styles.flex} />
      <View style={styles.bottom}>
        <PrimaryButton label="Done" onPress={onDone} />
      </View>
    </Animated.View>
  );
}

/** Night, day or a night off: nothing to prove right now, and why. */
function NotMorning({ state, onClose }: { state: LockState; onClose: () => void }) {
  const phase = state.phase === 'morning' ? 'day' : state.phase;
  const body = {
    night: `Bedtime wins. Stairs and steps start counting at ${clockOf(state.nextChange)}.`,
    day: `This morning's done. Your apps are awake until ${clockOf(state.nextChange)}.`,
    off: 'Tonight is switched off, so there is no morning lock to lift.',
  }[phase];
  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Voice text={PHASE_LINES[phase]} />
        <Body>{body}</Body>
      </View>
      <View style={styles.flex} />
      <View style={styles.bottom}>
        <PrimaryButton label="Close" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { flexGrow: 1, paddingHorizontal: Gap.gutter },
  page: { flex: 1, gap: Space.l },
  flex: { flex: 1, minHeight: Space.xxl },
  top: { gap: Space.l, marginTop: Space.xxl },
  bottom: { gap: Space.l, paddingBottom: Space.s },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  status: { ...Type.body, color: Nocturne.text2 },
});
