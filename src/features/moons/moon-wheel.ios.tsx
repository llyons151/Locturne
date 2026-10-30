import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import type { MoonWheelProps } from './moon-wheel-types';

/** Apple's own wheel picker (HIG: Pickers), as in the steps and push-ups sheets. */
export function MoonWheel({ rows, value, onChange }: MoonWheelProps) {
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }} colorScheme="dark">
      <Picker
        selection={value}
        onSelectionChange={(next: string) => onChange(next)}
        modifiers={[pickerStyle('wheel'), labelsHidden(), accessibilityLabel('Moon')]}
      >
        {rows.map((row) => (
          <Text key={row.id} modifiers={[tag(row.id)]}>
            {row.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
