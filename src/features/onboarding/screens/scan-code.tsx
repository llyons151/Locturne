import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { sym } from '@/components/grouped-list';
import { TextButton } from '@/components/buttons';
import { Reveal } from '@/components/motion';
import { Split, SplitHalf } from '@/components/split-choice';
import type { ScanCode } from '@/lib/scan';
import { Nocturne, Space } from '@/theme';

import { QrCode } from '../../scan/qr';
import { Body } from '../ui';

type Source = ScanCode['kind'];

const CODE_SIZE = 220;
/** The smallest the code gets on a short phone, still easy to read off the screen. */
const CODE_MIN = 120;
/** Print again under the code, with the gap above it. */
const UNDER_CODE = 44 + Space.l;

/** One headline for both choices, so the page doesn't change above the switcher (user, 2026-10-26). */
export const SCAN_CODE_HEADLINE = 'Your wake-up code.';

/** The one line under the switcher for each choice. */
export const SCAN_CODE_WORDS: Record<Source, string> = {
  qr: 'Print it. Stick it in the kitchen or the bathroom, not your bedroom.',
  barcode: 'Something that stays in another room: the coffee, the toothpaste.',
};

const SOURCES: Source[] = ['qr', 'barcode'];

/**
 * `scan-code`'s choice, straight under the headline: pick first, then the line and the code
 * under it change (user, 2026-10-26). TIDE's split row, as on the nap sheet.
 */
export function ScanCodeSwitch({ source, onSource }: { source: Source; onSource: (source: Source) => void }) {
  return (
    <Split label="Which code">
      <SplitHalf
        icon={sym('qrcode', 'qr_code')}
        title="My own code"
        detail="Print it out"
        selected={source === 'qr'}
        onPress={() => onSource('qr')}
      />
      <SplitHalf
        icon={sym('barcode', 'barcode')}
        title="A barcode"
        detail="One you own"
        selected={source === 'barcode'}
        onPress={() => onSource('barcode')}
      />
    </Split>
  );
}

/**
 * Both choices' lines laid over each other in one cell, so the block is always as tall as the
 * longer one and the code under it doesn't move when the choice changes (user, 2026-10-26).
 * The other line fades out but keeps its space.
 */
export function ScanCodeWords({ source }: { source: Source }) {
  return (
    <View style={styles.words}>
      {SOURCES.map((kind, i) => (
        <WordsLayer key={kind} shown={kind === source} over={i > 0}>
          <Body>{SCAN_CODE_WORDS[kind]}</Body>
        </WordsLayer>
      ))}
    </View>
  );
}

function WordsLayer({ shown, over, children }: { shown: boolean; over: boolean; children: ReactNode }) {
  const fade = useAnimatedStyle(() => ({ opacity: withTiming(shown ? 1 : 0, { duration: 180 }) }), [shown]);
  return (
    <Animated.View
      style={[styles.layer, over && styles.over, fade]}
      pointerEvents={shown ? 'auto' : 'none'}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The code, centred in the space between the words and the button. Printing is the page's
 * button (user, 2026-10-26); once it's printed, Print again sits under the code for a print
 * that went wrong. A barcode shows a plain tile the code's size.
 */
export function ScanCodeShown({ source, qr, printed, onPrint }: { source: Source; qr: string; printed: boolean; onPrint: () => void }) {
  // As big as the space allows, up to full size: short phones shrink it rather than overlap the words.
  const [size, setSize] = useState(CODE_SIZE);
  const again = source === 'qr' && printed;
  return (
    <View
      style={styles.area}
      onLayout={(e) => setSize(Math.max(CODE_MIN, Math.min(CODE_SIZE, Math.floor(e.nativeEvent.layout.height - UNDER_CODE - Space.xl * 2))))}
    >
      {/* Out of the flow, so the space measured is what the page leaves, not what the code takes. */}
      <View style={styles.center}>
        <Reveal rise style={styles.stack}>
          <View style={[styles.code, { width: size, height: size }]}>
            {source === 'qr' ? (
              <QrCode data={qr} size={size} />
            ) : (
              <View style={styles.tile}>
                <SymbolView name={sym('barcode', 'barcode')} size={size * 0.4} tintColor={Nocturne.text2} />
              </View>
            )}
          </View>
          {/* Holds its height either way, so the code doesn't move when it appears. */}
          <View style={[styles.again, !again && styles.hidden]} pointerEvents={again ? 'auto' : 'none'}>
            <TextButton label="Print again" onPress={onPrint} />
          </View>
        </Reveal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A row whose children each take the full width and the later ones slide back over the
  // first: the row is as tall as the tallest, and they share one cell.
  words: { flexDirection: 'row' },
  layer: { width: '100%' },
  over: { marginLeft: '-100%' },
  area: { flex: 1, minHeight: 0 },
  center: { ...StyleSheet.absoluteFill, justifyContent: 'center' },
  stack: { alignItems: 'center', gap: Space.l },
  code: { borderRadius: Space.m, borderCurve: 'continuous', overflow: 'hidden' },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Space.m,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  again: { minHeight: 44, justifyContent: 'center' },
  hidden: { opacity: 0 },
});
