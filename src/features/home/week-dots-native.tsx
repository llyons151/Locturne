import { Circle, HStack, Image, RNHostView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityLabel,
  font,
  foregroundStyle,
  frame,
  opacity,
  strokeBorder,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';

import { Nocturne, Space } from '@/theme';

import { isMistDotViewAvailable, MistDotView } from '../../../modules/mist-dot';
import { dayLabel, type WeekDay } from './week';

const DOT = 32;

/**
 * The week's day dots in SwiftUI, for inside a `Host`: Home's top (home-content.ios.tsx) and,
 * through week-strip.ios.tsx, the morning payoff. iOS only; nothing on web imports this.
 */
export function WeekDots({ days, reduced, modifiers }: { days: WeekDay[]; reduced: boolean; modifiers?: ModifierConfig[] }) {
  return (
    <HStack modifiers={modifiers}>
      {days.flatMap((day, i) => [
        ...(i ? [<Spacer key={`gap-${day.key}`} />] : []),
        <VStack key={day.key} spacing={Space.s} modifiers={[accessibilityElement('ignore'), accessibilityLabel(dayLabel(day))]}>
          <Text
            modifiers={[
              font({ size: 13, weight: day.today ? 'semibold' : 'regular' }),
              foregroundStyle(day.today ? Nocturne.text : Nocturne.text3),
            ]}
          >
            {day.letter}
          </Text>
          <ZStack modifiers={[frame({ width: DOT, height: DOT }), opacity(day.future ? 0.4 : 1)]}>
            {day.done && isMistDotViewAvailable ? (
              // A won day holds a little of the moon's mist, which sloshes as the phone moves.
              <RNHostView matchContents>
                <MistDotView paused={reduced} style={{ width: DOT, height: DOT }} />
              </RNHostView>
            ) : null}
            {day.done && !isMistDotViewAvailable ? (
              <Circle modifiers={[foregroundStyle(Nocturne.text)]} />
            ) : (
              <Circle
                modifiers={[
                  foregroundStyle('clear'),
                  strokeBorder({
                    content: day.today ? Nocturne.text : Nocturne.edge,
                    style: { lineWidth: day.today ? 2 : 1.5 },
                    shape: 'circle',
                  }),
                ]}
              />
            )}
            {day.done && !isMistDotViewAvailable ? <Image systemName="checkmark" color={Nocturne.bg} modifiers={[font({ size: 12, weight: 'bold' })]} /> : null}
          </ZStack>
        </VStack>,
      ])}
    </HStack>
  );
}
