import { Button, Host, HStack, Image, Text } from '@expo/ui/swift-ui';
import { background, buttonStyle, font, foregroundStyle, frame, padding, shapes } from '@expo/ui/swift-ui/modifiers';

import { Nocturne } from '@/theme';

import type { SelectAllButtonProps } from './select-all-types';

const PILL = 'rgba(255,255,255,0.12)';

/**
 * Onboarding's "Select all" under the day circles, as a SwiftUI button. Sized like Home's
 * mornings and screen time pills (user's ask, 2026-10-28: the glass button was too bulky):
 * a 36pt capsule, small symbol, subheadline label. Once every day is picked it says "Clear".
 */
export function SelectAllButton({ all, onPress }: SelectAllButtonProps) {
  return (
    <Host matchContents colorScheme="dark">
      <Button onPress={onPress} modifiers={[buttonStyle('plain')]}>
        <HStack
          spacing={6}
          modifiers={[padding({ horizontal: 14 }), frame({ minHeight: 36 }), background(PILL, shapes.capsule())]}
        >
          <Image systemName={all ? 'xmark' : 'checkmark'} size={12} color={Nocturne.text} />
          <Text modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), foregroundStyle(Nocturne.text)]}>
            {all ? 'Clear' : 'Select all'}
          </Text>
        </HStack>
      </Button>
    </Host>
  );
}
