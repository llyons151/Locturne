import { Host } from '@expo/ui';
import { Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { lengthLabel, type LengthPickerProps } from './length-label';

/** Nap length as the system segmented control (HIG: a few mutually exclusive choices). */
export function LengthPicker({ value, options, onChange }: LengthPickerProps) {
  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }} colorScheme="dark">
      <Picker selection={value} onSelectionChange={(next: number) => onChange(next)} modifiers={[pickerStyle('segmented')]}>
        {options.map((minutes) => (
          <Text key={minutes} modifiers={[tag(minutes)]}>
            {lengthLabel(minutes)}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}
