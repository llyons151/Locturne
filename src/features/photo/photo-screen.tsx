'use no memo';
// Reads the lock and routine during render, which change outside React (as scan-screen.tsx).

import { CameraView, useCameraPermissions } from 'expo-camera';
import { SymbolView } from 'expo-symbols';
import { useNavigation, useRouter, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ASKING_APPLE, PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import { SearchingOrb } from '@/components/thinking-orb';
import { heldPhase } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { readLock, routineAt } from '@/lib/lock-controller';
import { submitPhoto } from '@/lib/photo-proof';
import { formatPreset } from '@/lib/text';
import { judgePhoto, missWords, type PhotoKind, type PhotoReading } from '@/lib/wake/photo';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { photoCheckAvailable, readPhoto } from '../../../modules/photo-check';
import { FAKE_COLOR, FakeTag } from '../dev/wake-lab/fake-tag';
import { pretendPhase, pretendWoke, useWakePreview } from '../dev/wake-lab/wake-preview';
import { Voice } from '../exits/voice';
import { askWalk } from '../home/walk-request';
import { morningName } from '../scan/next-morning';
import { nextLockedMorning } from '../scan/next-locked-morning';
import { openPayoffNow, openPretendPayoff } from '../wake/open-payoff';
import { announceWoke } from '../wake/use-prove-morning';

/**
 * Touch grass and Sunlight (wake/photo.ts): the camera, a shutter, and Loc's verdict. The photo is
 * read on the phone (modules/photo-check) and thrown away; a pass wakes the apps and opens the
 * payoff, as a matched scan does. Only a photo taken here counts, never one from the library.
 *
 * In the wake preview's pretend morning (dev only) it runs at any hour, records nothing, and shows
 * the reading's numbers under a miss, for tuning on a real lawn. The preview's fake camera (the
 * scan camera's setting) swaps the camera for two buttons: the real thing, or not.
 */

/** The words for each way. */
export const PHOTO_WORDS: Record<PhotoKind, { aim: string; line: string; body: string; title: string }> = {
  grass: {
    title: 'Touch grass',
    line: 'Go touch grass.',
    body: 'Real grass, outside. Take a photo of it and your apps wake up.',
    aim: 'Fill the frame with grass',
  },
  sun: {
    title: 'Sunlight',
    line: 'Go find the sun.',
    body: 'Step outside and take a photo of the sun, or the brightest bit of sky. Your apps wake up.',
    aim: 'Point at the sun. Don’t stare',
  },
};

type Stage =
  | { kind: 'camera'; miss?: { line: string; body: string; numbers?: string } }
  | { kind: 'checking' }
  | { kind: 'notYet' }
  | { kind: 'awake' }
  | { kind: 'notMethod' }
  | { kind: 'oldBuild' };

/** Night, day, or another way's morning refuse the camera before it opens. */
function firstStage(kind: PhotoKind, fake: Fake): Stage {
  if (!photoCheckAvailable() && fake === 'real') return { kind: 'oldBuild' };
  const pretend = pretendPhase();
  if (pretend) return pretend === 'morning' ? { kind: 'camera' } : pretend === 'night' ? { kind: 'notYet' } : { kind: 'awake' };
  const phase = readLock().phase;
  if (phase === 'night') return heldPhase('night') === 'night' ? { kind: 'notYet' } : { kind: 'awake' };
  if (phase !== 'morning' || heldPhase('morning') !== 'morning') return { kind: 'awake' };
  if (routineAt(new Date()).method !== kind) return { kind: 'notMethod' };
  return { kind: 'camera' };
}

// The scan camera's fake setting (wake preview) covers this camera too: both are expo-camera.
type Fake = 'real' | 'fake' | 'ask' | 'denied';

/** A made-up reading for the fake camera's buttons. */
const fakeReading = (kind: PhotoKind, right: boolean): PhotoReading =>
  right
    ? kind === 'grass'
      ? { labels: [{ id: 'grass', confidence: 0.8 }], green: 0.6, sky: 0.05, blob: 0, blobFill: 0, mean: 0.35, brightness: 6 }
      : { labels: [{ id: 'blue_sky', confidence: 0.8 }], green: 0, sky: 0.6, blob: 0.01, blobFill: 0.7, mean: 0.7, brightness: 11 }
    : { labels: [{ id: 'bed', confidence: 0.7 }], green: 0.02, sky: 0.1, blob: 0, blobFill: 0, mean: 0.3, brightness: 2 };

const numbersOf = (r: PhotoReading) =>
  [
    r.labels.slice(0, 4).map((l) => `${l.id} ${l.confidence.toFixed(2)}`).join(', ') || 'no labels',
    `green ${r.green.toFixed(2)} · sky ${r.sky.toFixed(2)} · blob ${r.blob.toFixed(4)}/${r.blobFill.toFixed(2)} · BV ${r.brightness?.toFixed(1) ?? '—'}`,
  ].join('\n');

/** The apps are up already: when the next photo is wanted (the scan's `awakeBody`, in photo words). */
function awakeWords(morning: ReturnType<typeof nextLockedMorning>): string {
  if (morning === 'unscheduled') return 'Nothing is scheduled to sleep, so there’s nothing to photo.';
  if (!morning) return 'Every night is off, so there’s nothing to photo.';
  return `Nothing to photo until ${morningName(morning, new Date())}.`;
}

export function PhotoScreen({ kind }: { kind: PhotoKind }) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const fake = useWakePreview().scan;
  const [stage, setStage] = useState<Stage>(() => firstStage(kind, fake));
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const words = PHOTO_WORDS[kind];

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const walkInstead = () => {
    askWalk(readLock().morningKey);
    close();
  };

  const judge = (reading: PhotoReading) => {
    const verdict = judgePhoto(kind, reading);
    const pretend = pretendPhase() !== null;
    if (!verdict.ok) {
      haptic.thud();
      return setStage({ kind: 'camera', miss: { ...missWords(kind, verdict.miss), numbers: pretend ? numbersOf(reading) : undefined } });
    }
    const result = pretend ? 'unlocked' : submitPhoto(kind);
    if (result === 'notMorning') return setStage(readLock().phase === 'night' ? { kind: 'notYet' } : { kind: 'awake' });
    if (result === 'notMethod') return setStage({ kind: 'notMethod' });
    // Straight to the payoff, the camera gone without sliding (as the scan: Home mustn't flash first).
    navigation.setOptions({ animation: 'none' });
    if (pretend) {
      haptic.done();
      pretendWoke(kind);
      if (openPretendPayoff('replace')) return;
    } else {
      announceWoke(readLock());
      if (openPayoffNow('replace')) return;
    }
    close();
  };

  const snap = async () => {
    if (stage.kind !== 'camera' || !camera.current) return;
    haptic.tap();
    setStage({ kind: 'checking' });
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7, exif: false, skipProcessing: false });
      if (!photo?.uri) throw new Error('no photo');
      judge(await readPhoto(photo.uri));
    } catch {
      setStage({ kind: 'camera', miss: { line: 'That didn’t take.', body: 'Try the photo again.' } });
    }
  };

  if (stage.kind !== 'camera' && stage.kind !== 'checking') {
    const { line, body } =
      stage.kind === 'notYet'
        ? { line: 'Shh. Still bedtime.', body: `This works from ${formatPreset(routineAt(new Date()).morningStart)}. Bedtime wins until then.` }
        : stage.kind === 'awake'
          ? { line: "They're already up.", body: awakeWords(nextLockedMorning(new Date())) }
          : stage.kind === 'notMethod'
            ? { line: 'Nice try.', body: `${words.title} only counts on mornings you wake with it. Do your usual morning.` }
            : { line: 'Not on this version.', body: 'Update Locturne from the App Store to use this. Your walk still works.' };
    return (
      <View style={[styles.screen, { paddingTop: insets.top + Space.m, paddingBottom: insets.bottom + Space.xxl }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.top}>
          <Voice text={line} />
          <Text style={styles.body}>{body}</Text>
        </Animated.View>
        <View style={styles.flex} />
        <View style={styles.bottom}>
          <PrimaryButton label="Okay" onPress={close} />
          {stage.kind === 'oldBuild' ? <TextButton label={`Walk ${routineAt(new Date()).stepGoal} steps instead`} onPress={walkInstead} /> : null}
        </View>
      </View>
    );
  }

  const checking = stage.kind === 'checking';
  const miss = stage.kind === 'camera' ? stage.miss : undefined;
  return (
    <View style={styles.camera}>
      <PhotoCamera
        cameraRef={camera}
        fake={fake}
        active={focused}
        onReady={() => setReady(true)}
        onFake={(right) => judge(fakeReading(kind, right))}
        denied={<TextButton label={`Walk ${routineAt(new Date()).stepGoal} steps instead`} onPress={walkInstead} />}
      />

      <View pointerEvents="none" style={[styles.aimPill, { top: insets.top + Space.s + 6 }]}>
        <Text style={styles.aim}>{words.aim}</Text>
      </View>

      {miss ? (
        <Animated.View key={miss.line + (miss.numbers ?? '')} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.missCard} pointerEvents="none">
          <Text style={styles.missLine}>{miss.line}</Text>
          <Text style={styles.missBody}>{miss.body}</Text>
          {miss.numbers ? <Text style={styles.numbers}>{miss.numbers}</Text> : null}
        </Animated.View>
      ) : null}

      {checking ? (
        <Animated.View entering={FadeIn.duration(150)} style={styles.checking} pointerEvents="none">
          <SearchingOrb />
          <Text style={styles.checkingText}>Looking…</Text>
        </Animated.View>
      ) : null}

      {fake === 'real' ? (
        <View style={[styles.shutterRow, { bottom: insets.bottom + 40 }]}>
          <Pressable
            onPress={snap}
            disabled={checking || !ready}
            accessibilityRole="button"
            accessibilityLabel="Take the photo"
            style={({ pressed }) => [styles.shutter, (checking || !ready) && styles.off, pressed && styles.pressed]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={close}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={[styles.x, { top: insets.top + Space.s }]}
      >
        <SymbolView name={sym('xmark', 'close')} size={17} weight="semibold" tintColor="#FFFFFF" />
      </Pressable>
    </View>
  );
}

/**
 * The back camera, edge to edge, with the same permission handling as the scan camera
 * (scanner.tsx): straight to Apple's prompt the first time, Settings once it's been refused.
 */
function PhotoCamera({
  cameraRef,
  fake,
  active,
  onReady,
  onFake,
  denied,
}: {
  cameraRef: React.RefObject<CameraView | null>;
  fake: Fake;
  active: boolean;
  onReady: () => void;
  onFake: (right: boolean) => void;
  denied: React.ReactNode;
}) {
  const [realPermission, requestReal, getPermission] = useCameraPermissions();
  const [fakeGranted, setFakeGranted] = useState(false);
  const permission =
    fake === 'real' ? realPermission : { granted: fake === 'fake' || (fake === 'ask' && fakeGranted), canAskAgain: fake === 'ask' };
  const requestPermission = async () => {
    if (fake === 'real') return requestReal();
    setFakeGranted(true);
  };
  const askNow = !!permission && !permission.granted && permission.canAskAgain;
  const asked = useRef(false);
  useEffect(() => {
    if (!askNow || asked.current) return;
    asked.current = true;
    requestPermission().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when there's something to ask
  }, [askNow]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => {});
    });
    return () => subscription.remove();
  }, [getPermission]);

  if (!permission) return <View style={StyleSheet.absoluteFill} />;
  if (askNow) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.waiting]} accessibilityLabel={ASKING_APPLE}>
        <SearchingOrb />
        <Text style={styles.checkingText}>{ASKING_APPLE}</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.ask]}>
        <Text style={[styles.body, styles.center]}>Camera access is off for Locturne. Turn it on in Settings to take the photo.</Text>
        <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} />
        {denied}
      </View>
    );
  }
  if (fake !== 'real') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fake]}>
        <FakeTag what="camera" style={styles.fakeTag} />
        <FakeButton label="Snap the real thing" onPress={() => onFake(true)} />
        <FakeButton label="Snap something else" onPress={() => onFake(false)} />
      </View>
    );
  }
  return <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" active={active} onCameraReady={onReady} animateShutter />;
}

function FakeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.fakeButton}>
      <Text style={styles.fakeLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Nocturne.bg, paddingHorizontal: Gap.gutter },
  top: { gap: Space.l, marginTop: Space.xxl },
  body: { ...Type.body, color: Nocturne.text2 },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
  bottom: { gap: Space.l },

  camera: { flex: 1, backgroundColor: '#000000' },
  aimPill: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Space.l,
    paddingVertical: Space.s,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  aim: { ...Type.secondary, color: '#FFFFFF', fontWeight: '600' },
  missCard: {
    position: 'absolute',
    left: Gap.gutter,
    right: Gap.gutter,
    bottom: 200,
    alignItems: 'center',
    gap: Space.xs,
    paddingHorizontal: Space.l,
    paddingVertical: Space.m,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  missLine: { ...Type.body, color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  missBody: { ...Type.secondary, color: 'rgba(255, 255, 255, 0.85)', textAlign: 'center' },
  numbers: { ...Type.secondary, fontSize: 11, lineHeight: 14, color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', marginTop: Space.xs },
  checking: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: Space.s, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  checkingText: { ...Type.secondary, color: '#FFFFFF', fontWeight: '600' },
  shutterRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  // The system camera's shutter: a white disc in a white ring.
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF' },
  pressed: { transform: [{ scale: 0.94 }] },
  off: { opacity: 0.4 },
  x: {
    position: 'absolute',
    left: Gap.gutter,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  waiting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.s },
  ask: { justifyContent: 'center', padding: Space.xl, gap: Space.l, backgroundColor: Nocturne.bg },
  fake: { backgroundColor: '#0b0b0d', justifyContent: 'center', padding: Space.l, gap: Space.m },
  fakeTag: { position: 'absolute', top: 110, left: Space.m },
  fakeButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: FAKE_COLOR, borderRadius: 12, paddingVertical: Space.m, alignItems: 'center' },
  fakeLabel: { ...Type.secondary, color: Nocturne.text, fontWeight: '600' },
});
