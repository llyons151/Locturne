import { Host, Text } from '@expo/ui/swift-ui';
import { animation, Animation, contentTransition, font, foregroundStyle, monospacedDigit } from '@expo/ui/swift-ui/modifiers';

import { Nocturne } from '@/theme';

/**
 * The big count over a meter ("84"), rolling its digits as it changes: SwiftUI's numeric text
 * transition, as Home's countdown and step count do (home-content.ios.tsx).
 */
export function CountText({ value, size = 72 }: { value: string; size?: number }) {
  return (
    <Host matchContents colorScheme="dark">
      <Text
        modifiers={[
          font({ size, weight: 'bold' }),
          monospacedDigit(),
          foregroundStyle(Nocturne.text),
          contentTransition('numericText'),
          // Keyed on the number itself: the transition needs a number, and a dash is 0.
          animation(Animation.spring({ duration: 0.5, bounce: 0 }), Number.parseFloat(value) || 0),
        ]}
      >
        {value}
      </Text>
    </Host>
  );
}
