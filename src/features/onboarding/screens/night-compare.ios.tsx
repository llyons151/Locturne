import { HStack, Host, RoundedRectangle, Text, VStack, ZStack } from '@expo/ui/swift-ui';
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
  strokeBorder,
  textCase,
} from '@expo/ui/swift-ui/modifiers';

import { Nocturne, Space } from '@/theme';

import { compareLabel, compareRows, type CompareProps } from './night-compare-rows';

const RADIUS = 16;

/**
 * The paywall's two before/after tiles in SwiftUI, so the times are set by iOS's own text
 * (user 2026-10-27). Same layout as night-compare.tsx: label, the time with him big, their
 * usual small under it. One VoiceOver element for the pair.
 */
export function NightCompare(props: CompareProps) {
  const rows = compareRows(props);
  if (rows.length === 0) return null;
  return (
    <Host matchContents={{ vertical: true }} colorScheme="dark" style={{ alignSelf: 'stretch' }}>
      <HStack spacing={Space.s} modifiers={[accessibilityElement('ignore'), accessibilityLabel(compareLabel(rows))]}>
        {rows.map((row) => (
          <ZStack key={row.label} modifiers={[frame({ maxWidth: 10_000 })]}>
            <RoundedRectangle
              cornerRadius={RADIUS}
              modifiers={[
                foregroundStyle(Nocturne.surface),
                strokeBorder({ content: Nocturne.edge, style: { lineWidth: 1 }, shape: 'roundedRectangle', cornerRadius: RADIUS }),
              ]}
            />
            <VStack spacing={0} modifiers={[padding({ vertical: Space.l, horizontal: Space.s })]}>
              <Text modifiers={[font({ size: 12, weight: 'semibold' }), kerning(1.4), textCase('uppercase'), foregroundStyle(Nocturne.text2)]}>
                {row.label}
              </Text>
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
            </VStack>
          </ZStack>
        ))}
      </HStack>
    </Host>
  );
}
