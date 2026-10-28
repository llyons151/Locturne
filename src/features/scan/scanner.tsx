import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useIsFocused } from 'expo-router';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { PrimaryButton } from '@/components/buttons';
import { useWakePreview } from '@/features/dev/wake-lab/wake-preview';
import { Nocturne, Radius, Space, Type } from '@/theme';

import { FakeViewfinder } from '../dev/wake-lab/fake-viewfinder';

/**
 * The camera, looking for codes. QR plus the product barcodes found on groceries and
 * toiletries. Repeats of the same code are ignored for a moment, so a code held in frame
 * doesn't fire thirty times a second. Pass `active={false}` to stop looking.
 *
 * The wake preview (/wake-preview, dev only) swaps the camera for a FAKE viewfinder with
 * buttons that "scan" `expected` (the code the screen wants) or a wrong one, and can fake the
 * permission states. Everything around it is the real screen.
 */

const TYPES: BarcodeType[] = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'datamatrix'];
const REPEAT_MS = 2000;

export type Scan = { data: string; type: string };

export function Scanner({
  onScan,
  active = true,
  expected,
  fill,
  overlay,
  denied,
}: {
  onScan: (scan: Scan) => void;
  active?: boolean;
  /** The code the screen wants, for the fake viewfinder's "right code" button only. */
  expected?: string;
  /** The whole screen, edge to edge, instead of a rounded square (the scan screen). */
  fill?: boolean;
  /** Drawn over the camera once it's showing (not over the permission ask). */
  overlay?: ReactNode;
  /** Under the ask, while access isn't granted: another way on (the morning's walk). */
  denied?: ReactNode;
}) {
  const focused = useIsFocused();
  const scanning = active && focused;
  const [realPermission, requestRealPermission, getPermission] = useCameraPermissions();
  const fake = useWakePreview().scan;
  // The fake's "Continue" grants pretend access.
  const [fakeGranted, setFakeGranted] = useState(false);
  const permission =
    fake === 'real'
      ? realPermission
      : { granted: fake === 'fake' || (fake === 'ask' && fakeGranted), canAskAgain: fake === 'ask' };
  const requestPermission = async () => {
    if (fake === 'real') return requestRealPermission();
    setFakeGranted(true);
  };
  // Not asked yet: straight to Apple's prompt, then the camera (user 2026-10-28: a page of our
  // own before it was odd). Our page is only for access that's been turned off.
  const asked = useRef(false);
  const askNow = !!permission && !permission.granted && permission.canAskAgain;
  useEffect(() => {
    if (!askNow || asked.current) return;
    asked.current = true;
    requestPermission().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when there's something to ask
  }, [askNow]);
  // Expo reads once on mount. Settings can grant or revoke access without remounting us.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => {});
    });
    return () => subscription.remove();
  }, [getPermission]);
  const last = useRef<{ data: string; at: number } | null>(null);
  const frame = fill ? styles.fill : styles.frame;

  // Dark while Apple's prompt is up (and before the first read): the camera opens behind it.
  if (!permission || askNow) return <View style={frame} />;

  if (!permission.granted) {
    return (
      <View style={[frame, styles.ask]}>
        <Text style={styles.askText}>Camera access is off for Locturne. Turn it on in Settings to scan.</Text>
        <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} />
        {denied}
      </View>
    );
  }

  if (fake !== 'real') {
    return (
      <View style={frame}>
        <FakeViewfinder style={StyleSheet.absoluteFill} expected={expected} onScan={scanning ? onScan : undefined} />
        {overlay}
      </View>
    );
  }

  return (
    <View style={frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        active={scanning}
        barcodeScannerSettings={{ barcodeTypes: TYPES }}
        onBarcodeScanned={
          scanning
            ? ({ data, type }) => {
                const now = Date.now();
                if (last.current && last.current.data === data && now - last.current.at < REPEAT_MS) return;
                last.current = { data, at: now };
                onScan({ data, type });
              }
            : undefined
        }
      />
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1,
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Nocturne.surface,
  },
  fill: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
  ask: { justifyContent: 'center', padding: Space.xl, gap: Space.l },
  askText: { ...Type.body, color: Nocturne.text2, textAlign: 'center' },
});
