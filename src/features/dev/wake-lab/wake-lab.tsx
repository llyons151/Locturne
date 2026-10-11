import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import * as haptic from '@/lib/haptics';
import { getMorningPlace, judgeFix } from '@/lib/place';
import { getRoutine, pushupGoalOf, type WakeMethod } from '@/lib/routine';
import { getScanCode, matches } from '@/lib/scan';
import { Gap, Nocturne, Space } from '@/theme';

import { readFix } from '../../place/locate';
import { Scanner, type Scan } from '../../scan/scanner';
import { DownstairsView } from '../../wake/downstairs-view';
import { Body, TopBar, Voice } from '../../wake/parts';
import { PushupsView } from '../../wake/pushups-view';
import { StepsView } from '../../wake/steps-view';
import { usePushupsPreview } from './pushups-preview';

export const LAB_METHODS: { value: WakeMethod; title: string }[] = [
  { value: 'steps', title: 'Walk steps' },
  { value: 'downstairs', title: 'Go downstairs' },
  { value: 'scan', title: 'Scan a code' },
  { value: 'place', title: 'Get to a place' },
  { value: 'pushups', title: 'Push-ups' },
];

const titleOf = (method: WakeMethod) => LAB_METHODS.find((m) => m.value === method)?.title ?? method;

/**
 * Dev tool: runs one wake-up method's real sensor flow at any hour (/wake-lab?method=pushups).
 * The same views as the morning, but a pass only says so: nothing calls `proveMorning`, so no
 * proof is recorded and no shield moves. Steps count from when the test opened.
 */
export function WakeLab({ method: first }: { method: WakeMethod }) {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState(first);
  const [passed, setPassed] = useState(false);
  // Bumped by "Run it again" to remount the method with a fresh session.
  const [run, setRun] = useState(0);
  const [startedAt, setStartedAt] = useState(() => new Date());
  const routine = getRoutine();
  const preview = usePushupsPreview();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const onMet = () => {
    haptic.done();
    setPassed(true);
  };
  const again = () => {
    setPassed(false);
    setStartedAt(new Date());
    setRun((n) => n + 1);
  };
  const toSteps = () => {
    setMethod('steps');
    again();
  };

  let content;
  if (passed) {
    content = (
      <Animated.View entering={FadeIn.duration(400)} style={styles.page}>
        <View style={styles.top}>
          <Voice text="Test passed." />
          <Body>{`${titleOf(method)} works. Nothing was recorded and no apps were woken.`}</Body>
        </View>
        <View style={styles.flex} />
        <View style={styles.bottom}>
          <PrimaryButton label="Run it again" onPress={again} />
          <TextButton label="Done" onPress={close} />
        </View>
      </Animated.View>
    );
  } else if (method === 'downstairs') content = <DownstairsView key={run} goal={routine.stepGoal} onMet={onMet} onSteps={toSteps} />;
  else if (method === 'pushups')
    content = (
      <PushupsView
        key={run}
        goal={routine.stepGoal}
        target={preview.goal || pushupGoalOf(routine)}
        onMet={onMet}
        onSteps={toSteps}
        preview={preview}
      />
    );
  else if (method === 'scan') content = <ScanTest key={run} onMet={onMet} />;
  else if (method === 'place') content = <PlaceTest key={run} onMet={onMet} />;
  else content = <StepsView key={run} goal={routine.stepGoal} morningStart={startedAt} onMet={onMet} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + Space.l }]}
      showsVerticalScrollIndicator={false}
    >
      {passed ? null : <StayAwake />}
      <TopBar label={`Test · ${titleOf(method)}`} onClose={close} />
      {content}
    </ScrollView>
  );
}

function StayAwake() {
  useKeepAwake();
  return null;
}

/** The scanner against the registered code, by the same `matches` the morning uses. */
function ScanTest({ onMet }: { onMet: () => void }) {
  // Reads the stored code, so the React Compiler mustn't cache it from the first render.
  'use no memo';
  const code = getScanCode();
  const [last, setLast] = useState<Scan | null>(null);

  const onScan = (scan: Scan) => {
    if (code && matches(code, scan.data)) return onMet();
    haptic.thud();
    setLast(scan);
  };

  const read = last ? `Read ${last.type}: “${last.data}”.` : null;
  const body = !code
    ? `No code is set up, so nothing can match.${read ? ` ${read}` : ' Scans still show what the camera read.'}`
    : read
      ? `${read} That isn’t the code you set up.`
      : `Scan the ${code.kind === 'qr' ? 'printed QR code' : 'barcode'} you set up.`;

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Voice text={last && code ? 'Not that one.' : 'Go find your code.'} />
        <Body>{body}</Body>
      </View>
      <View style={styles.flex} />
      <View style={styles.bottom}>
        <Scanner onScan={onScan} />
      </View>
    </View>
  );
}

/** One location read, judged against the picked place by the same `judgeFix` the morning uses. */
function PlaceTest({ onMet }: { onMet: () => void }) {
  // Reads the stored place, so the React Compiler mustn't cache it from the first render.
  'use no memo';
  const place = getMorningPlace();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    const located = await readFix();
    setChecking(false);
    if (!located.ok) {
      haptic.thud();
      return setResult(`No location: ${located.why}.`);
    }
    const { fix } = located;
    const where = `${fix.latitude.toFixed(5)}, ${fix.longitude.toFixed(5)} (±${fix.accuracy === null ? '?' : Math.round(fix.accuracy)} m)`;
    if (!place) return setResult(`You're at ${where}. No place is picked, so there's nothing to judge against.`);
    const judged = judgeFix(place, fix, new Date());
    if (judged.kind === 'there') return onMet();
    haptic.thud();
    const distance = judged.distance === null ? 'unknown distance' : `${Math.round(judged.distance)} m away`;
    setResult(`${judged.kind === 'notThere' ? 'Not there' : 'Unsure'}: ${distance}. You're at ${where}.`);
  };

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <Voice text={place ? `Get to ${place.name}.` : 'There is no place.'} />
        <Body>{result ?? (place ? 'Check in when you’re there.' : 'Pick one in Routine to test a real check-in.')}</Body>
      </View>
      {checking ? <ActivityIndicator style={styles.spinner} color={Nocturne.text2} /> : null}
      <View style={styles.flex} />
      <View style={styles.bottom}>
        <PrimaryButton label={result ? 'Try again' : 'Check in'} icon="location.fill" onPress={check} disabled={checking} />
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
  spinner: { marginTop: Space.xl },
});
