import { Host } from '@expo/ui';
import { HStack, Picker, Text } from '@expo/ui/swift-ui';
import { accessibilityLabel, frame, labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { LIMIT_MAX } from '@/lib/daily-limits';

import type { LimitWheelProps } from './limit-wheel-types';

const HOURS = Array.from({ length: Math.floor(LIMIT_MAX / 60) + 1 }, (_, h) => h);
const MINUTES = Array.from({ length: 60 }, (_, m) => m);

/** Apple's own hour and minute wheels (HIG: Pickers), as Screen Time sets an App Limit. */
export function LimitWheel({ value, onChange }: LimitWheelProps) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return (
    <Host matchContents colorScheme="dark" style={{ alignSelf: 'stretch' }}>
      <HStack>
        <Picker
          selection={h}
          onSelectionChange={(next: number) => onChange(next * 60 + m)}
          modifiers={[pickerStyle('wheel'), labelsHidden(), frame({ width: 140 }), accessibilityLabel('Hours')]}
        >
          {HOURS.map((n) => (
            <Text key={n} modifiers={[tag(n)]}>
              {n === 1 ? '1 hour' : `${n} hours`}
            </Text>
          ))}
        </Picker>
        <Picker
          selection={m}
          onSelectionChange={(next: number) => onChange(h * 60 + next)}
          modifiers={[pickerStyle('wheel'), labelsHidden(), frame({ width: 140 }), accessibilityLabel('Minutes')]}
        >
          {MINUTES.map((n) => (
            <Text key={n} modifiers={[tag(n)]}>
              {`${n} min`}
            </Text>
          ))}
        </Picker>
      </HStack>
    </Host>
  );
}
