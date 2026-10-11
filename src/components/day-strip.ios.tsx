import { GlassEffectContainer, Host, HStack, Spacer, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  glassEffect,
  onTapGesture,
} from '@expo/ui/swift-ui/modifiers';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

import { DAYS, DayStrip as RingStrip, SHOWN } from '@/components/day-picker';
import * as haptic from '@/lib/haptics';
import { Nocturne } from '@/theme';

const DAY = 40;

/**
 * The Routine tab's seven nights as iOS 26 liquid glass (user's pick, October 10, 2026):
 * off nights clear glass, on nights glass tinted the dial's pale band rather than the CTA's
 * near-white, so a full week reads calm. Picked neighbours melt together in the container.
 * Before iOS 26 it's the ring row from day-picker.
 */
export function DayStrip({
  value,
  tonight,
  onChange,
}: {
  value: number[];
  /** The night VoiceOver calls tonight, Monday first: the one in progress after midnight too. */
  tonight: number;
  onChange: (days: number[]) => void;
}) {
  if (!isLiquidGlassAvailable()) return <RingStrip value={value} tonight={tonight} onChange={onChange} />;

  const toggle = (day: number) => {
    haptic.tap();
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  };
  const band = Nocturne.accent ?? Nocturne.text;

  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: 'stretch' }} colorScheme="dark">
      <GlassEffectContainer spacing={8}>
        <HStack spacing={0}>
          {SHOWN.flatMap((i, n) => {
            const day = DAYS[i];
            const on = value.includes(i);
            return [
              ...(n ? [<Spacer key={`gap-${day.name}`} />] : []),
              <Text
                key={day.name}
                modifiers={[
                  font({ size: 15, weight: 'semibold' }),
                  foregroundStyle(on ? Nocturne.onCta : Nocturne.text2),
                  frame({ width: DAY, height: DAY }),
                  glassEffect({
                    glass: { variant: 'regular', interactive: true, ...(on ? { tint: band } : null) },
                    shape: 'circle',
                  }),
                  onTapGesture(() => toggle(i)),
                  accessibilityLabel(`${day.name} night${i === tonight ? ', tonight' : ''}`),
                  accessibilityAddTraits(on ? ['isButton', 'isSelected'] : ['isButton']),
                ]}
              >
                {day.letter}
              </Text>,
            ];
          })}
        </HStack>
      </GlassEffectContainer>
    </Host>
  );
}
