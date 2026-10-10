import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { PUSHUP_MAX, PUSHUP_MIN } from '@/lib/routine';

import type { PushupWheelProps } from './pushup-wheel-types';

const COUNTS = Array.from({ length: PUSHUP_MAX - PUSHUP_MIN + 1 }, (_, i) => PUSHUP_MIN + i);

/** Apple's own wheel picker (HIG: Pickers), as in the Apps tab's daily limit. */
export function PushupWheel({ value, onChange }: PushupWheelProps) {
  return (
    <Host matchContents colorScheme="dark" style={{ alignSelf: 'stretch' }}>
      <Picker
        selection={value}
        onSelectionChange={(next: number) => onChange(next)}
        modifiers={[pickerStyle('wheel'), labelsHidden(), accessibilityLabel('Push-ups')]}
      >
        {COUNTS.map((n) => (
          <Text key={n} modifiers={[tag(n)]}>
            {`${n}`}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
