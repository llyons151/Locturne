import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { Nocturne, Space, Type } from '@/theme';

import { FAKE_COLOR, FakeTag } from './fake-tag';

/** A product barcode, for a fake "right code" when the screen wants any barcode (setup). */
const SAMPLE_BARCODE = '5000112637922';
/** A link: never the code, and refused as a barcode ("Links and scraps of codes change"). */
const WRONG_CODE = 'https://example.com/menu';

/**
 * FAKE stand-in for the barcode camera (scanner.tsx), from the wake preview. Same frame as the
 * real one; the two buttons "scan" what the screen wants (`expected`) or something else.
 * `onScan` undefined: the screen isn't looking, as when the real camera is paused.
 */
export function FakeViewfinder({
  style,
  expected,
  onScan,
}: {
  style: StyleProp<ViewStyle>;
  expected?: string;
  onScan?: (scan: { data: string; type: string }) => void;
}) {
  const right = expected ?? SAMPLE_BARCODE;
  return (
    <View style={[style, styles.box]}>
      <FakeTag what="camera" style={styles.tag} />
      <View style={styles.buttons}>
        <FakeButton
          label="Scan the right code"
          onPress={onScan && (() => onScan({ data: right, type: right.startsWith('LOCTURNE') ? 'qr' : 'ean13' }))}
        />
        <FakeButton label="Scan a wrong code" onPress={onScan && (() => onScan({ data: WRONG_CODE, type: 'qr' }))} />
      </View>
    </View>
  );
}

function FakeButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="button" style={[styles.button, !onPress && styles.off]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#0b0b0d', justifyContent: 'center', padding: Space.l },
  tag: { position: 'absolute', top: Space.m, left: Space.m },
  buttons: { gap: Space.m },
  button: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: FAKE_COLOR,
    borderRadius: 12,
    paddingVertical: Space.m,
    alignItems: 'center',
  },
  off: { opacity: 0.4 },
  label: { ...Type.secondary, color: Nocturne.text, fontWeight: '600' },
});
