'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { useLock } from '@/hooks/use-lock';
import { heldPhase } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { proveMorning, readLock } from '@/lib/lock-controller';
import { askForNotifications, shouldAskForNotifications } from '@/lib/notifications';
import { currentMorning, type LockState } from '@/lib/lock-state';
import { getRoutine, nightAt, toLockSettings } from '@/lib/routine';
import { getScanCode } from '@/lib/scan';
import { formatPreset } from '@/lib/text';
import { PHASE_LINES } from '@/lib/wake/lines';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { DownstairsView } from './downstairs-view';
import { Body, TopBar, Voice } from './parts';
import { StepsView } from './steps-view';

export type WakeMethodShown = 'downstairs' | 'steps';

const clockOf = (date: Date) => formatPreset(date.getHours() * 60 + date.getMinutes());

/** "Apps awake until 10:00 PM", from the routine that runs tonight (a waiting edit, a night off). */
function awakeLine(bedtimeStart: Date): string {
  const { start, on } = nightAt(bedtimeStart);
  return on ? `Apps awake until ${formatPreset(start.getHours() * 60 + start.getMinutes())}.` : 'Apps awake. Tonight is off.';
}

/**
 * The morning: prove you're up and the apps wake (GAME_PLAN, "Core loop" and "Wake-up
 * methods"). Opens on the routine's method; "walk N steps instead" is always there. Both
 * methods end the same way: `proveMorning` records the proof and syncs the shields, so this
 * screen never decides anything about the lock itself.
 *
 * Outside the morning it says why there's nothing to do: bedtime wins at night, and a
 * morning already proved stays proved.
 */
/** The phone is in hand the whole time; don't let it lock mid-staircase. Only while a method is up. */
function StayAwake() {
  useKeepAwake();
  return null;
}

export function WakeScreen({ method }: { method?: WakeMethodShown }) {
  const insets = useSafeAreaInsets();
  const lock = useLock();
  // Read each render: left open across a bedtime, the next morning uses the routine then in force.
  const routine = getRoutine();
  const [shown, setShown] = useState<WakeMethodShown>(method ?? (routine.method === 'steps' ? 'steps' : 'downstairs'));
  const [unlocked, setUnlocked] = useState<LockState | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onMet = useCallback(
    (kind: WakeMethodShown) => {
      const state = proveMorning(kind) ?? readLock();
      if (state.phase !== 'day') return; // bedtime came round, or the night was off
      haptic.done();
      setUnlocked(state);
      // The control VoiceOver was on goes away with the swap; say what happened.
      AccessibilityInfo.announceForAccessibility(`I'm up. ${awakeLine(state.nextChange)}`);
      // The first proven morning is the moment to ask (GAME_PLAN); iOS shows its own prompt once.
      shouldAskForNotifications()
        .then((ask) => (ask ? askForNotifications() : false))
        .catch(() => {});
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
    // Only with a code to scan. Replaced, like the scan screen's "Walk instead", so switching
    // between the two doesn't stack screens.
    const scan =
      routine.method === 'scan' && getScanCode() ? (
        <TextButton label="Scan your code instead" onPress={() => router.replace('/scan?mode=morning')} />
      ) : null;
    // Steps can't be counted here at all: passes, the scan code and the emergency unlock.
    const stuck = <TextButton label="Other ways to wake them" onPress={() => router.push('/exits')} />;
    content =
      shown === 'downstairs' ? (
        <DownstairsView goal={routine.stepGoal} onMet={onDownstairs} onSteps={() => switchTo('steps')} footer={scan} />
      ) : (
        <StepsView
          goal={routine.stepGoal}
          morningStart={morningStart}
          onMet={onSteps}
          stuck={stuck}
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
      {!unlocked && lock.phase === 'morning' ? <StayAwake /> : null}
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
          <Text style={styles.status}>{awakeLine(state.nextChange)}</Text>
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
  // Bedtime by the clock with nothing asleep (no lock armed, or an emergency used tonight).
  const awakeNight = state.phase === 'night' && heldPhase(state.phase) !== 'night';
  const phase = state.phase === 'morning' || awakeNight ? 'day' : state.phase;
  const body = awakeNight
    ? 'Your bedtime apps are awake tonight, so there is no morning lock to lift.'
    : {
        night: `Bedtime wins. Stairs and steps start counting at ${clockOf(state.nextChange)}.`,
        day: `This morning's done. ${awakeLine(state.nextChange)}`,
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
