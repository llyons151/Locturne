import {
  Button,
  Circle,
  Host,
  HStack,
  Image,
  RNHostView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityLabel,
  Animation,
  animation,
  background,
  blur,
  buttonStyle,
  contentTransition,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  monospacedDigit,
  offset,
  onAppear,
  opacity,
  padding,
  shapes,
  strokeBorder,
  type ModifierConfig,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { HOME_RISE_MS } from '@/components/night-sky';
import { getAccess } from '@/lib/screen-time';
import { Nocturne, Space } from '@/theme';
import { isMistDotViewAvailable, MistDotView } from '../../../modules/mist-dot';
import { isScreenTimeReportAvailable, ScreenTimeReport } from '../../../modules/screen-time-report';

import type { HomeContentProps } from './home-content';
import { dayLabel, morningsLabel, weekDays } from './week';

const PILL = 'rgba(255,255,255,0.08)';
const BUTTON = 'rgba(255,255,255,0.10)';
const DOT = 32;

/** Seconds. Everything starts once the moon is about a third of the way up. */
const START = (HOME_RISE_MS * 0.35) / 1000;
/** The one movement, and the moment every piece is fully in. */
const TOTAL = 0.9;
/** Each piece starts clearing this much after the one above it, and all finish together. */
const STAGGER = 0.06;
/** How far the column rises, and how blurred each piece starts, in points. */
const RISE = 18;
const BLUR = 8;

/**
 * Home's content in SwiftUI (@expo/ui), so iOS draws and animates all of it: the type,
 * symbols and circles at full resolution, and the entrance on SwiftUI's own springs.
 *
 * The entrance, once when Home mounts: the middle (moon, headline, line and button) rises as
 * one block on a single critically damped spring. The top (mornings, screen time and the week)
 * only fades in where it sits, never moving (user's ask, October 8, 2026). Each piece comes
 * into focus, top to bottom (opacity and a small blur clearing), on the same spring, and every
 * one finishes on the frame the movement stops. Reduce Motion keeps a plain fade.
 */
export function HomeContent(props: HomeContentProps) {
  'use no memo';
  const { mornings, today, won, free, revision, hero, heroKey, action } = props;
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  /** Piece `step`: opacity and blur, ending with everything else. */
  const enter = (step: number): ModifierConfig[] => {
    const d = step * STAGGER;
    return [
      opacity(shown ? 1 : 0),
      blur(shown || reduced ? 0 : BLUR),
      animation(Animation.spring({ duration: TOTAL - d, bounce: 0 }).delay(START + d), shown),
    ];
  };

  const days = weekDays(today, won, free);
  const showUsage = isScreenTimeReportAvailable && getAccess() === 'approved';

  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      <VStack
        spacing={0}
        modifiers={[
          // Starts when SwiftUI puts the view on screen, not when React mounts it.
          onAppear(() => setShown(true)),
        ]}
      >
        <HStack modifiers={enter(0)}>
          <HStack
            spacing={6}
            modifiers={[
              padding({ horizontal: 14 }),
              frame({ minHeight: 36 }),
              background(PILL, shapes.capsule()),
              accessibilityElement('ignore'),
              accessibilityLabel(`${mornings} ${morningsLabel(mornings)} you got up`),
            ]}
          >
            <Image systemName="sunrise.fill" size={14} color={Nocturne.text} />
            <Text modifiers={[font({ textStyle: 'callout', weight: 'heavy' }), monospacedDigit(), foregroundStyle(Nocturne.text)]}>
              {String(mornings)}
            </Text>
            <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(Nocturne.text2)]}>{morningsLabel(mornings)}</Text>
          </HStack>
          <Spacer />
          {showUsage ? (
            <RNHostView matchContents>
              {/* Drawn by Apple's report extension, the only place usage may be read. */}
              <ScreenTimeReport pill days={1} revision={revision} style={{ width: 170, height: 36 }} />
            </RNHostView>
          ) : null}
        </HStack>

        <HStack modifiers={[padding({ top: Space.xl }), ...enter(1)]}>
          {days.flatMap((day, i) => [
            ...(i ? [<Spacer key={`gap-${day.key}`} />] : []),
            <VStack
              key={day.key}
              spacing={Space.s}
              modifiers={[accessibilityElement('ignore'), accessibilityLabel(dayLabel(day))]}
            >
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

        <Spacer />

        <VStack
          spacing={Space.m}
          modifiers={[
            // Only the middle rises; the top above it stays put.
            offset({ y: shown || reduced ? 0 : RISE }),
            animation(Animation.spring({ duration: TOTAL, bounce: 0 }).delay(START), shown),
          ]}
        >
          <Image systemName="moon.fill" size={18} color={Nocturne.text2} modifiers={enter(2)} />
          <Text
            modifiers={[
              font({ size: 38, weight: 'light' }),
              foregroundStyle(Nocturne.text),
              multilineTextAlignment('center'),
              accessibilityAddTraits(['isHeader']),
              // The countdown rolls its digits as the minutes change.
              contentTransition('numericText', { countsDown: true }),
              animation(Animation.spring({ duration: 0.5, bounce: 0 }), heroKey),
              ...enter(3),
            ]}
          >
            {hero.title}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: 'body' }),
              foregroundStyle(Nocturne.text2),
              multilineTextAlignment('center'),
              frame({ maxWidth: 320 }),
              ...enter(4),
            ]}
          >
            {hero.body}
          </Text>
          <Button
            onPress={action.onPress}
            modifiers={[buttonStyle('plain'), padding({ top: Space.s }), ...enter(5)]}
          >
            <Text
              modifiers={[
                font({ textStyle: 'subheadline', weight: 'semibold' }),
                foregroundStyle(Nocturne.text),
                padding({ vertical: 10, horizontal: 20 }),
                background(BUTTON, shapes.capsule()),
              ]}
            >
              {action.label}
            </Text>
          </Button>
        </VStack>

        <Spacer />
      </VStack>
    </Host>
  );
}
