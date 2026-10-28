import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { Split, SplitHalf } from '@/components/split-choice';
import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { draftQrData, getScanCode, getScanEditRefusal, type ScanCode } from '@/lib/scan';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { SCAN_CODE_HEADLINE, SCAN_CODE_WORDS } from '../onboarding/screens/scan-code';
import { applyRoutineEdit, getSetRoutine } from '../routine/apply-edit';
import { printCode } from './print-code';
import { QrCode } from './qr';

type Source = ScanCode['kind'];

/** Smaller than onboarding's full page: the sheet floats over the Routine tab. */
const CODE_SIZE = 180;

/**
 * Setting up the wake-up code from Routine (or You), in the Sleep sheet's floating card like
 * Push-ups (user 2026-10-28: "a swipe up thing… the switcher that's used on the onboarding").
 * Laid out like onboarding's `scan-code`: the headline, the switcher, its line, the code, then
 * the next thing to do as the button: print it, then scan it. The camera opens over the sheet
 * (`/scan` with the code it expects); once a code is saved there, the sheet closes too.
 *
 * `select`: opened by choosing "Scan a code" with no code yet (user 2026-10-28). Saving a code
 * also makes scanning the method; closing without one leaves the routine as it was, like the
 * place picker, so the routine never sits on a scan with no code.
 */
export function CodeSheet({ select = false }: { select?: boolean }) {
  const router = useRouter();
  const [source, setSource] = useState<Source>(() => getScanCode()?.kind ?? 'qr');
  // Keep showing the code they already printed rather than a new one each visit.
  const [qr] = useState(() => {
    const code = getScanCode();
    return code?.kind === 'qr' ? code.data : draftQrData();
  });
  const [printed, setPrinted] = useState(() => getScanCode()?.kind === 'qr');
  const [printing, setPrinting] = useState(false);
  const [refused] = useState(() => getScanEditRefusal() !== null);

  // Back from the camera with a new code saved: done here too.
  const [before] = useState(() => getScanCode()?.data);
  useFocusEffect(
    useCallback(() => {
      const now = getScanCode()?.data;
      if (!now || now === before) return;
      // Opened by choosing "Scan a code" with none yet: a saved code also makes it the method.
      if (select) applyRoutineEdit({ ...getSetRoutine(), method: 'scan' });
      closeSleepSheet();
    }, [before, select]),
  );

  const print = () => {
    if (printing) return;
    setPrinting(true);
    printCode(qr).finally(() => {
      setPrinting(false);
      setPrinted(true);
    });
  };
  const scan = () =>
    router.push({ pathname: '/scan', params: { mode: 'setup', source, ...(source === 'qr' && { expect: qr }) } });

  if (refused) {
    return (
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Not from bed.
          </Text>
          <Text style={styles.body}>You can set up or change your code in the day, once you’re up.</Text>
        </View>
        <SheetButton
          label="Okay"
          onPress={() => {
            haptic.tap();
            closeSleepSheet();
          }}
        />
      </View>
    );
  }

  const toPrint = source === 'qr' && !printed;
  return (
    <View style={styles.sheet}>
      <Text style={styles.title} accessibilityRole="header">
        {SCAN_CODE_HEADLINE}
      </Text>
      <Split label="Which code">
        <SplitHalf
          icon={sym('qrcode', 'qr_code')}
          title="My own code"
          detail="Print it out"
          selected={source === 'qr'}
          onPress={() => setSource('qr')}
        />
        <SplitHalf
          icon={sym('barcode', 'barcode')}
          title="A barcode"
          detail="One you own"
          selected={source === 'barcode'}
          onPress={() => setSource('barcode')}
        />
      </Split>
      {/* Both lines in one cell, so the code under them doesn't move when the choice changes. */}
      <View style={styles.words}>
        {(['qr', 'barcode'] as const).map((kind, i) => (
          <Text
            key={kind}
            style={[styles.body, styles.layer, i > 0 && styles.over, kind !== source && styles.hidden]}
            accessibilityElementsHidden={kind !== source}
            importantForAccessibility={kind === source ? 'auto' : 'no-hide-descendants'}
          >
            {SCAN_CODE_WORDS[kind]}
          </Text>
        ))}
      </View>
      <View style={styles.code}>
        {source === 'qr' ? (
          <QrCode data={qr} size={CODE_SIZE} />
        ) : (
          <View style={styles.tile}>
            <SymbolView name={sym('barcode', 'barcode')} size={CODE_SIZE * 0.4} tintColor={Nocturne.text2} />
          </View>
        )}
      </View>
      <View style={styles.actions}>
        {toPrint ? (
          <SheetButton label="Print it" onPress={print} />
        ) : (
          <SheetButton label={source === 'qr' ? 'It’s up. Scan it' : 'Scan a barcode'} onPress={scan} />
        )}
        {/* Once it's printed, for a print that went wrong: always under the button. */}
        {source === 'qr' && printed ? (
          <View style={styles.again}>
            <TextButton label="Print again" onPress={print} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** The sheet's white button, as on the Push-ups and Sleep sheets. */
function SheetButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sized to its contents inside the card, padded like the Sleep sheet.
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.l },
  head: { gap: Space.xs, alignItems: 'center' },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 19, lineHeight: 24, textAlign: 'center', marginTop: Space.xs },
  body: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  // A row whose children each take the full width and the later ones slide back over the
  // first: as tall as the longer line, and they share one cell.
  words: { flexDirection: 'row' },
  layer: { width: '100%' },
  over: { marginLeft: '-100%' },
  hidden: { opacity: 0 },
  code: { alignSelf: 'center', width: CODE_SIZE, height: CODE_SIZE, borderRadius: Space.m, borderCurve: 'continuous', overflow: 'hidden' },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Space.m,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  actions: { gap: Space.xs },
  again: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: Nocturne.cta,
  },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
