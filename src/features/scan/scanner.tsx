import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { useIsFocused } from 'expo-router';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { PrimaryButton } from '@/components/buttons';
import { Nocturne, Radius, Space, Type } from '@/theme';

/**
 * The camera, looking for codes. QR plus the product barcodes found on groceries and
 * toiletries. Repeats of the same code are ignored for a moment, so a code held in frame
 * doesn't fire thirty times a second. Pass `active={false}` to stop looking.
 */

const TYPES: BarcodeType[] = ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'datamatrix'];
const REPEAT_MS = 2000;

export type Scan = { data: string; type: string };

export function Scanner({ onScan, active = true }: { onScan: (scan: Scan) => void; active?: boolean }) {
  const focused = useIsFocused();
  const scanning = active && focused;
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  // Expo reads once on mount. Settings can grant or revoke access without remounting us.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => {});
    });
    return () => subscription.remove();
  }, [getPermission]);
  const last = useRef<{ data: string; at: number } | null>(null);

  if (!permission) return <View style={styles.frame} />;

  if (!permission.granted) {
    return (
      <View style={[styles.frame, styles.ask]}>
        <Text style={styles.askText}>
          {permission.canAskAgain
            ? 'The camera only looks for your code. Nothing is recorded.'
            : 'Camera access is off for Locturne. Turn it on in Settings to scan.'}
        </Text>
        <PrimaryButton
          // HIG: the button before Apple's prompt says Continue, never "Allow" (App Review 5.1.1(iv)).
          label={permission.canAskAgain ? 'Continue' : 'Open Settings'}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings()).catch(() => {})}
        />
      </View>
    );
  }

  return (
    <View style={styles.frame}>
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
  ask: { justifyContent: 'center', padding: Space.xl, gap: Space.l },
  askText: { ...Type.body, color: Nocturne.text2, textAlign: 'center' },
});
