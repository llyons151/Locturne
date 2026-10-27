import { Divider, HStack, Host, RoundedRectangle, Text, VStack, ZStack } from '@expo/ui/swift-ui';
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

import { AVERAGE_COMPARE, averageCompareLabel } from './average-compare-rows';

const RADIUS = 16;

/**
 * The average-week box in SwiftUI, like night-compare.ios.tsx's tiles: two columns, without
 * Locturne dim and with it white, a hairline between, the caption under both. One VoiceOver element.
 */
export function AverageCompare() {
  return (
    <Host matchContents={{ vertical: true }} colorScheme="dark" style={{ alignSelf: 'stretch' }}>
      <ZStack modifiers={[accessibilityElement('ignore'), accessibilityLabel(averageCompareLabel)]}>
        <RoundedRectangle
          cornerRadius={RADIUS}
          modifiers={[
            foregroundStyle(Nocturne.surface),
            strokeBorder({ content: Nocturne.edge, style: { lineWidth: 1 }, shape: 'roundedRectangle', cornerRadius: RADIUS }),
          ]}
        />
        <VStack spacing={Space.m} modifiers={[padding({ vertical: Space.l, horizontal: Space.s })]}>
          <HStack spacing={0}>
            {AVERAGE_COMPARE.columns.flatMap((column, i) => [
              i > 0 ? <Divider key={`divider${i}`} /> : null,
              <VStack key={column.label} spacing={0} modifiers={[frame({ maxWidth: 10_000 })]}>
                <Text modifiers={[font({ size: 12, weight: 'semibold' }), kerning(1.4), textCase('uppercase'), foregroundStyle(Nocturne.text2)]}>
                  {column.label}
                </Text>
                <Text
                  modifiers={[
                    font({ size: 26, weight: 'bold' }),
                    monospacedDigit(),
                    foregroundStyle(i === 0 ? Nocturne.text2 : Nocturne.text),
                    lineLimit(1),
                    minimumScaleFactor(0.7),
                    padding({ top: Space.s }),
                  ]}
                >
                  {column.amount}
                </Text>
              </VStack>,
            ])}
          </HStack>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(Nocturne.text2)]}>{AVERAGE_COMPARE.caption}</Text>
        </VStack>
      </ZStack>
    </Host>
  );
}
