import { HStack, Host, Image, Rectangle, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  textCase,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { GlassCard } from '@/components/glass-card';
import { Nocturne, Space } from '@/theme';

import { compareIcon, compareLabel, compareRows, type CompareProps } from './night-compare-rows';

/**
 * The paywall's before/after in SwiftUI, so the times are set by iOS's own text (user
 * 2026-10-27). Same layout as night-compare.tsx: one smoked card (the Routine tab's) split down
 * the middle by a hairline, each half a glyph and label, the time with him big, their usual
 * small. User 2026-11-05: the grey boxes looked cheap. No Liquid Glass: it splits in dark cards.
 */
export function NightCompare(props: CompareProps) {
  const rows = compareRows(props);
  if (rows.length === 0) return null;
  return (
    <GlassCard dark>
      <Host matchContents={{ vertical: true }} colorScheme="dark" style={{ alignSelf: 'stretch' }}>
        <HStack spacing={0} modifiers={[accessibilityElement('ignore'), accessibilityLabel(compareLabel(rows))]}>
          {rows.flatMap((row, i) => [
            ...(i > 0
              ? [
                  <Rectangle
                    key={`${row.label}-divider`}
                    modifiers={[foregroundStyle(Nocturne.edge), frame({ width: StyleSheet.hairlineWidth }), padding({ vertical: Space.l })]}
                  />,
                ]
              : []),
            <VStack key={row.label} spacing={0} modifiers={[frame({ maxWidth: 10_000 }), padding({ vertical: Space.l, horizontal: Space.s })]}>
              <HStack spacing={6}>
                <Image systemName={compareIcon(row.label).ios} size={12} color={Nocturne.text2} />
                <Text modifiers={[font({ size: 12, weight: 'semibold' }), kerning(1.4), textCase('uppercase'), foregroundStyle(Nocturne.text2)]}>
                  {row.label}
                </Text>
              </HStack>
              <Text
                modifiers={[
                  font({ size: 26, weight: 'bold' }),
                  monospacedDigit(),
                  foregroundStyle(Nocturne.text),
                  lineLimit(1),
                  minimumScaleFactor(0.7),
                  padding({ top: Space.s }),
                ]}
              >
                {row.withMe}
              </Text>
              <Text modifiers={[font({ size: 13 }), monospacedDigit(), foregroundStyle(Nocturne.text2), padding({ top: 2 })]}>
                {`usually ${row.usual}`}
              </Text>
            </VStack>,
          ])}
        </HStack>
      </Host>
    </GlassCard>
  );
}
