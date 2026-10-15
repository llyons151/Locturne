import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, controlSize, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import type { SegmentedProps } from './segmented-types';

/**
 * The system segmented control (HIG: a few mutually exclusive choices), at the large control
 * size: the regular one looked like a thin strip inside a card (user, 2026-10-14).
 */
export function Segmented<T extends string | number>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }} colorScheme="dark">
      <Picker selection={value} onSelectionChange={(next: T) => onChange(next)} modifiers={[pickerStyle('segmented'), controlSize('large'), accessibilityLabel(label)]}>
        {options.map((o) => (
          <Text key={o.value} modifiers={[tag(o.value)]}>
            {o.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
