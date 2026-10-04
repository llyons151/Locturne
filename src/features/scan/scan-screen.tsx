import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Segmented } from '@/components/segmented';
import * as haptic from '@/lib/haptics';
import { readLock } from '@/lib/lock-controller';
import { getRoutine } from '@/lib/routine';
import {
  generateQrData,
  getScanCode,
  getScanEditRefusal,
  QR_PREFIX,
  registerScanCode,
  submitScan,
  type ScanCode,
} from '@/lib/scan';
import { formatPreset } from '@/lib/text';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { Voice } from '../exits/voice';
import { QrCode } from './qr';
import { Scanner, type Scan } from './scanner';
import { ShareCode } from './share-code';

/**
 * Scan your code (GAME_PLAN, "Wake-up methods"), both halves:
 * - **Setup:** print a per-user QR, or pick a product barcode that lives in another room.
 *   Either way it's only saved once it's been scanned here, so nobody registers a code they
 *   can't actually scan at 7am. Only while the apps are awake (`registerScanCode`).
 * - **Morning:** scan it and the apps wake. Only the registered code counts.
 *
 * `/scan?mode=setup` or `/scan?mode=morning`; without a mode it picks the morning scan when
 * the apps are waiting for one, and setup otherwise.
 */

export type ScanMode = 'setup' | 'morning';

type Source = ScanCode['kind'];

type Stage =
  | { kind: 'morning'; miss?: boolean }
  | { kind: 'unlocked' }
  | { kind: 'notYet' }
  | { kind: 'awake' }
  | { kind: 'noCode' }
  | { kind: 'asleep' }
  | { kind: 'choose'; source: Source }
  | { kind: 'register'; source: Source; expect?: string; miss?: boolean }
  | { kind: 'saved' };

/** Night and day both refuse a scan, for different reasons. */
function notMorning(phase: string): Stage | null {
  if (phase === 'night') return { kind: 'notYet' };
  if (phase === 'day' || phase === 'off') return { kind: 'awake' };
  return null;
}

function firstStage(mode: ScanMode | undefined): Stage {
  const phase = readLock().phase;
  const code = getScanCode();
  if (mode === 'morning' || (!mode && phase === 'morning' && code)) {
    if (!code) return { kind: 'noCode' };
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
      return { line: "I'm up. Don't talk to me yet.", body: 'Your apps are awake until bedtime.' };
    case 'notYet':
      return {
        line: 'Shh. Still bedtime.',
        body: `Scanning works from ${formatPreset(getRoutine().morningStart)}. Bedtime wins until then.`,
      };
    case 'awake':
      return { line: "They're already up.", body: 'Nothing to scan for until tomorrow morning.' };
    case 'noCode':
      return {
        line: 'There is no code.',
        body: 'You can set one up once your apps are awake. This morning, your usual way still works.',
      };
    case 'asleep':
      return {
        line: 'Not from bed.',
        body: "You can set up or change your code once your apps are awake. Otherwise I'd let you register your pillow.",
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
      return { line: "Fine. That's the one.", body: 'Tomorrow morning, scan it and your apps wake up.' };
  }
}

export function ScanScreen({ mode }: { mode?: ScanMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>(() => firstStage(mode));
  // Keep showing the code they already printed rather than a new one each visit.
  const [qr] = useState(() => {
    const code = getScanCode();
    return code?.kind === 'qr' ? code.data : generateQrData();
  });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onMorningScan = ({ data }: Scan) => {
    const result = submitScan(data);
    if (result === 'unlocked') {
      haptic.done();
      setStage({ kind: 'unlocked' });
    } else if (result === 'notMorning') setStage(notMorning(readLock().phase) ?? { kind: 'awake' });
    else if (result === 'noCode') setStage({ kind: 'noCode' });
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
        {scanning ? (
          <Scanner
            onScan={
              stage.kind === 'morning' ? onMorningScan : onRegisterScan(stage.source, stage.expect)
            }
          />
        ) : null}

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

        {stage.kind === 'register' ? (
          <TextButton label="Back" onPress={() => setStage({ kind: 'choose', source: stage.source })} />
        ) : null}

        {finished || stage.kind === 'asleep' || stage.kind === 'notYet' || stage.kind === 'awake' || stage.kind === 'noCode' ? (
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
});
