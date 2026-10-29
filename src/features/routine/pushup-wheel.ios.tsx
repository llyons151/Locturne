import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { PUSHUP_MAX, PUSHUP_MIN } from '@/lib/routine';

import type { PushupWheelProps } from './pushup-wheel-types';

const PUSHUPS = { min: PUSHUP_MIN, max: PUSHUP_MAX, by: 1 };

/** Apple's own wheel picker (HIG: Pickers), as in the Apps tab's daily limit. */
export function PushupWheel({ value, onChange, range = PUSHUPS, label = 'Push-ups' }: PushupWheelProps) {
  const counts = Array.from({ length: Math.floor((range.max - range.min) / range.by) + 1 }, (_, i) => range.min + i * range.by);
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }} colorScheme="dark">
      <Picker
        selection={value}
        onSelectionChange={(next: number) => onChange(next)}
        modifiers={[pickerStyle('wheel'), labelsHidden(), accessibilityLabel(label)]}
      >
        {counts.map((n) => (
          <Text key={n} modifiers={[tag(n)]}>
            {`${n}`}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
