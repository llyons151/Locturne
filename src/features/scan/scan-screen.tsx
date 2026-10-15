'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Segmented } from '@/components/segmented';
import { useLock } from '@/hooks/use-lock';
import { heldPhase } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { readLock, routineAt } from '@/lib/lock-controller';
import type { Phase } from '@/lib/lock-state';
import {
  draftQrData,
  getScanCode,
  getScanEditRefusal,
  matches,
  QR_PREFIX,
  registerScanCode,
  submitScan,
  type ScanCode,
} from '@/lib/scan';
import { formatPreset } from '@/lib/text';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { Voice } from '../exits/voice';
import { awakeStatus } from '../wake/awake-status';
import { announceWoke } from '../wake/use-prove-morning';
import { awakeBody, savedBody } from './next-morning';
import { nextLockedMorning } from './next-locked-morning';
import { QrCode } from './qr';
import { Scanner, type Scan } from './scanner';
import { ShareCode } from './share-code';
import { liveScanStage, type Stage } from './scan-stage';
import { shownScanCode } from '../dev/wake-lab/stand-ins';
import { pretendPhase, pretendWoke } from '../dev/wake-lab/wake-preview';

/**
 * Scan your code (GAME_PLAN, "Wake-up methods"), both halves:
 * - **Setup:** print a per-user QR, or pick a product barcode that lives in another room.
 *   Either way it's only saved once it's been scanned here, so nobody registers a code they
 *   can't actually scan at 7am. Only while the apps are awake (`registerScanCode`).
 * - **Morning:** scan it and the apps wake. Only the registered code counts.
 *
 * `/scan?mode=setup` or `/scan?mode=morning`; without a mode it picks the morning scan when
 * the apps are waiting for one, and setup otherwise.
 *
 * In the wake preview's pretend morning (dev only) the morning half runs at any hour, against
 * a stand-in code if none is set up, and a match records nothing.
 */

export type ScanMode = 'setup' | 'morning';

type Source = ScanCode['kind'];

/**
 * Night and day both refuse a scan, for different reasons. A night or morning with nothing
 * asleep (`heldPhase`: no lock, paused, or after a lapse's last paid morning) is day.
 */
function notMorning(phase: Phase): Stage | null {
  // A pretend morning holds nothing, so there's nothing to ask `heldPhase`.
  if (pretendPhase()) return phase === 'morning' ? null : { kind: 'awake' };
  if (phase === 'night') return heldPhase('night') === 'night' ? { kind: 'notYet' } : { kind: 'awake' };
  if (phase === 'morning') return heldPhase('morning') === 'morning' ? null : { kind: 'awake' };
  return { kind: 'awake' };
}

function firstStage(mode: ScanMode | undefined): Stage {
  const phase = pretendPhase() ?? readLock().phase;
  const code = shownScanCode();
  if (mode === 'morning' || (!mode && phase === 'morning' && code)) {
    // No code: from bed it can't be set up ("your usual way still works"); in the day it can.
    if (!code) return phase === 'night' || phase === 'morning' ? { kind: 'noCode' } : { kind: 'choose', source: 'qr' };
    // A saved code only wakes a scan morning, never a steps or stairs one (`submitScan`).
    if (!pretendPhase() && phase === 'morning' && routineAt(new Date()).method !== 'scan') return { kind: 'notMethod' };
    return notMorning(phase) ?? { kind: 'morning' };
  }
  if (getScanEditRefusal()) return { kind: 'asleep' };
  return { kind: 'choose', source: code?.kind ?? 'qr' };
}

const SOURCES: { value: Source; label: string }[] = [
  { value: 'qr', label: 'My own code' },
  { value: 'barcode', label: 'A barcode' },
];

/** Loc's line and the plain sentence under it, per stage. */
function words(stage: Stage): { line: string; body: string } {
  switch (stage.kind) {
    case 'morning':
      return stage.miss
        ? { line: 'Not that one.', body: "That isn't the code you set up. Find the real one." }
        : { line: 'Go find your code.', body: 'Scan it and your apps wake up. Only your code counts.' };
    case 'unlocked':
      return { line: "I'm up. Don't talk to me yet.", body: awakeStatus(readLock()) };
    case 'notYet':
      return {
        line: 'Shh. Still bedtime.',
        body: `Scanning works from ${formatPreset(routineAt(new Date()).morningStart)}. Bedtime wins until then.`,
      };
    case 'awake':
      return { line: "They're already up.", body: awakeBody(nextLockedMorning(new Date()), new Date()) };
    case 'noCode':
      return {
        line: 'There is no code.',
        body: 'You can set one up in the day, once you’re up. Until then, your usual way still works.',
      };
    case 'notMethod':
      return {
        line: 'Nice try.',
        body: 'Your code only counts on mornings you wake with it. Do your usual morning, or use a pass.',
      };
    case 'asleep':
      return {
        line: 'Not from bed.',
        body: "You can set up or change your code in the day, once you're up. Otherwise I'd let you register your pillow.",
      };
    case 'choose':
      return stage.source === 'qr'
        ? {
            line: 'This one is yours.',
            body: "Print it and put it somewhere that isn't your bedroom. The kitchen. The bathroom. Somewhere with light.",
          }
        : {
            line: 'Pick something that never moves.',
            body: 'A barcode on something that stays in another room: the coffee, the toothpaste, the cat food.',
          };
    case 'register':
      if (stage.miss)
        return stage.source === 'qr'
          ? { line: 'Not that one.', body: 'Scan the code you just printed.' }
          : { line: "That won't work.", body: 'Links and scraps of codes change. Try a product barcode.' };
      return stage.source === 'qr'
        ? { line: 'Now scan the printout.', body: "That's how we both know it works." }
        : { line: 'Scan it.', body: "Whatever you scan now is the only code I'll accept in the morning." };
    case 'saved':
      return { line: "Fine. That's the one.", body: savedBody(nextLockedMorning(new Date()), new Date()) };
  }
}

export function ScanScreen({ mode }: { mode?: ScanMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [storedStage, setStage] = useState<Stage>(() => firstStage(mode));
  const stage = liveScanStage(storedStage, firstStage(mode), lock, getScanEditRefusal() !== null);
  // Keep showing the code they already printed rather than a new one each visit.
  const [qr] = useState(() => {
    const code = getScanCode();
    return code?.kind === 'qr' ? code.data : draftQrData();
  });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onMorningScan = ({ data }: Scan) => {
    const pretend = pretendPhase() !== null;
    const result = pretend ? (matches(shownScanCode(), data) ? 'unlocked' : 'wrongCode') : submitScan(data);
    if (result === 'unlocked') {
      if (pretend) {
        haptic.done();
        pretendWoke();
      } else {
        // Home is where the morning ends (docs/HOME_INTERACTIVE.md): the camera closes and the
        // apps wake there, Loc's line and all.
        announceWoke(readLock());
        if (router.canGoBack()) return router.back();
      }
      setStage({ kind: 'unlocked', morningKey: readLock().morningKey });
    } else if (result === 'notMorning') setStage(notMorning(pretendPhase() ?? readLock().phase) ?? { kind: 'awake' });
    else if (result === 'noCode') setStage({ kind: 'noCode' });
    else if (result === 'notMethod') setStage({ kind: 'notMethod' });
    else {
      haptic.thud();
      setStage({ kind: 'morning', miss: true });
    }
  };

  const onRegisterScan = (source: Source, expect: string | undefined) => (scan: Scan) => {
    // A printed QR must be the one on screen; a QR that looks like someone else's Locturne code isn't a barcode.
    const wrong = source === 'qr' ? scan.data.trim() !== expect : scan.data.startsWith(QR_PREFIX);
    const result = wrong ? 'unusable' : registerScanCode({ kind: source, data: scan.data, type: scan.type });
    if (result === null) {
      haptic.done();
      setStage({ kind: 'saved' });
    } else if (result === 'asleep') setStage({ kind: 'asleep' });
    else {
      haptic.thud();
      setStage({ kind: 'register', source, expect, miss: true });
    }
  };

  const { line, body } = words(stage);
  const scanning = stage.kind === 'morning' || stage.kind === 'register';
  const finished = stage.kind === 'unlocked' || stage.kind === 'saved';

  // Scanning is the camera and nothing else (user, 2026-10-14): edge to edge, an X, and a
  // square to put the code in. A wrong code says so under the square for a moment. The other
  // ways to wake the apps are on Home, where the X goes back to.
  if (scanning) {
    return (
      <View style={styles.camera}>
        <Scanner
          fill
          onScan={stage.kind === 'morning' ? onMorningScan : onRegisterScan(stage.source, stage.expect)}
          expected={stage.kind === 'morning' ? shownScanCode()?.data : stage.expect}
          overlay={
            <View pointerEvents="none" style={styles.aim}>
              <View style={styles.square} />
              {stage.miss ? (
                <Animated.View key={`${stage.kind}-miss`} entering={FadeIn.duration(200)} style={styles.missPill}>
                  <Text style={styles.miss}>{line}</Text>
                </Animated.View>
              ) : null}
            </View>
          }
        />
        <Pressable
          onPress={() => (stage.kind === 'register' ? setStage({ kind: 'choose', source: stage.source }) : close())}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={stage.kind === 'register' ? 'Back' : 'Close'}
          style={[styles.x, { top: insets.top + Space.s }]}
        >
          <SymbolView name={sym('xmark', 'close')} size={17} weight="semibold" tintColor="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.m, paddingBottom: insets.bottom + Space.l }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.bar}>
        <TextButton label={finished ? 'Done' : 'Close'} onPress={close} />
      </View>

      <Animated.View key={`${stage.kind}-${line}`} entering={FadeIn.duration(300)} style={styles.top}>
        <Voice text={line} />
        <Text style={styles.body}>{body}</Text>
      </Animated.View>

      <View style={styles.flex} />

      <View style={styles.bottom}>
        {stage.kind === 'choose' ? (
          <>
            <Segmented
              label="Which code"
              value={stage.source}
              options={SOURCES}
              onChange={(source) => setStage({ kind: 'choose', source })}
            />
            {stage.source === 'qr' ? (
              <>
                <View style={styles.qr}>
                  <QrCode data={qr} size={220} />
                </View>
                <ShareCode data={qr} />
                <PrimaryButton
                  label="I've put it out. Scan it"
                  onPress={() => setStage({ kind: 'register', source: 'qr', expect: qr })}
                />
              </>
            ) : (
              <PrimaryButton label="Scan a barcode" onPress={() => setStage({ kind: 'register', source: 'barcode' })} />
            )}
          </>
        ) : null}

        {finished || stage.kind === 'asleep' || stage.kind === 'notYet' || stage.kind === 'awake' || stage.kind === 'noCode' || stage.kind === 'notMethod' ? (
          <PrimaryButton label={finished ? 'Done' : 'Okay'} onPress={close} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Nocturne.bg },
  content: { flexGrow: 1, paddingHorizontal: Gap.gutter },
  bar: { flexDirection: 'row', justifyContent: 'flex-start' },
  top: { gap: Space.l, marginTop: Space.xxl },
  body: { ...Type.body, color: Nocturne.text2 },
  flex: { flex: 1, minHeight: Space.xl },
  bottom: { gap: Space.l, paddingBottom: Space.s },
  qr: { alignSelf: 'center', borderRadius: Space.m, overflow: 'hidden' },

  camera: { flex: 1, backgroundColor: '#000000' },
  aim: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // Where to hold the code: a plain white outline, a little smaller than the screen's width.
  square: { width: 250, height: 250, borderRadius: 28, borderCurve: 'continuous', borderWidth: 3, borderColor: '#FFFFFF' },
  missPill: {
    position: 'absolute',
    top: '50%',
    marginTop: 125 + Space.l,
    paddingHorizontal: Space.l,
    paddingVertical: Space.s,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  miss: { ...Type.body, color: '#FFFFFF', fontWeight: '600' },
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
});
