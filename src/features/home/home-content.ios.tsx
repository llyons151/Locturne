import {
  Button,
  Capsule,
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
  kerning,
  lineLimit,
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
import { useState, type ComponentProps } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { HOME_RISE_MS } from '@/components/night-sky';
import { SearchingOrb } from '@/components/thinking-orb';
import { getAccess } from '@/lib/screen-time';
import { CTA_HEIGHT, Nocturne, Space } from '@/theme';
import { isMistDotViewAvailable, MistDotView } from '../../../modules/mist-dot';
import { isScreenTimeReportAvailable, ScreenTimeReport } from '../../../modules/screen-time-report';

import type { HomeContentProps } from './home-content';
import { actionWeight, topLevel } from './home-look';
import { SWAP_IN, SWAP_OUT, useHeroSwap } from './hero-swap';
import { dayLabel, morningsLabel, weekDays } from './week';

type SymbolName = NonNullable<ComponentProps<typeof Image>['systemName']>;

const PILL = 'rgba(255,255,255,0.08)';
const BUTTON = 'rgba(255,255,255,0.10)';
const DOT = 32;
/** The morning meter's track, as wide as the body text it sits over. */
const TRACK = 240;

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
  const { mornings, today, won, free, revision } = props;
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);
  // A change of state (Screen Time turned on, bedtime starting) fades the middle out and back in.
  const { content, visible } = useHeroSwap(props, props.catchingUp);
  const { hero, heroKey, meter, icon, searching, action, alt, look } = content;
  const weight = actionWeight(look, action);
  // Dim at night, gone for a problem (`topLevel`).
  const top = topLevel(look);
  // Held still while catching up after the background, so the digits change without rolling
  // from hours-old numbers.
  const rollKey = props.catchingUp ? -1 : heroKey;
  const [usageIn, setUsageIn] = useState(false);

  /** Piece `step`: opacity and blur, ending with everything else. */
  const enter = (step: number, level = 1): ModifierConfig[] => {
    const d = step * STAGGER;
    return [
      opacity(shown ? level : 0),
      blur(shown || reduced ? 0 : BLUR),
      animation(Animation.spring({ duration: TOTAL - d, bounce: 0 }).delay(START + d), shown),
    ];
  };

  const days = weekDays(today, won, free);
  const showUsage = isScreenTimeReportAvailable && getAccess() === 'approved' && look !== 'night';
  // Ready to fade the pill in again if Screen Time goes off and comes back.
  if (!showUsage && usageIn) setUsageIn(false);

  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      <VStack
        spacing={0}
        modifiers={[
          // Starts when SwiftUI puts the view on screen, not when React mounts it.
          onAppear(() => setShown(true)),
        ]}
      >
        {top ? (
          <VStack spacing={0}>
            <HStack modifiers={enter(0, top)}>
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
                // Fades in when Screen Time is turned on, rather than popping in.
                <ZStack
                  modifiers={[
                    opacity(usageIn ? 1 : 0),
                    animation(Animation.easeInOut({ duration: SWAP_IN }), usageIn),
                    onAppear(() => setUsageIn(true)),
                  ]}
                >
                  <RNHostView matchContents>
                    {/* Drawn by Apple's report extension, the only place usage may be read. */}
                    <ScreenTimeReport pill days={1} revision={revision} style={{ width: 200, height: 36 }} />
                  </RNHostView>
                </ZStack>
              ) : null}
            </HStack>
    
            <HStack modifiers={[padding({ top: Space.xl }), ...enter(1, top)]}>
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
          </VStack>
        ) : null}

        <Spacer />

        <VStack
          spacing={Space.m}
          modifiers={[
            // Only the middle rises; the top above it stays put.
            offset({ y: shown || reduced ? 0 : RISE }),
            animation(Animation.spring({ duration: TOTAL, bounce: 0 }).delay(START), shown),
            opacity(visible ? 1 : 0),
            blur(visible || reduced ? 0 : BLUR / 2),
            animation(visible ? Animation.easeOut({ duration: SWAP_IN }) : Animation.easeIn({ duration: SWAP_OUT }), visible),
          ]}
        >
          {searching ? (
            <ZStack modifiers={[frame({ width: 20, height: 20 }), ...enter(2)]}>
              <RNHostView matchContents>
                <SearchingOrb />
              </RNHostView>
            </ZStack>
          ) : look === 'problem' ? (
            <Image systemName="exclamationmark.circle" size={30} color={Nocturne.text} modifiers={enter(2)} />
          ) : (
            <Image systemName={(icon?.ios ?? 'moon.fill') as SymbolName} size={18} color={Nocturne.text2} modifiers={enter(2)} />
          )}
          {meter ? (
            // The morning's live count in place of the headline, rolling as it climbs.
            <VStack
              spacing={Space.xs}
              modifiers={[accessibilityElement('ignore'), accessibilityLabel(hero.title), accessibilityAddTraits(['isHeader']), ...enter(3)]}
            >
              {meter.kicker ? (
                // Type.label: small capitals, grey.
                <Text modifiers={[font({ size: 12, weight: 'semibold' }), kerning(1.4), foregroundStyle(Nocturne.text2)]}>
                  {meter.kicker.toUpperCase()}
                </Text>
              ) : null}
              <HStack alignment="firstTextBaseline" spacing={6}>
                <Text
                  modifiers={[
                    font({ size: 64, weight: 'light' }),
                    monospacedDigit(),
                    foregroundStyle(Nocturne.text),
                    contentTransition('numericText', { countsDown: look === 'day' || look === 'evening' }),
                    animation(Animation.spring({ duration: 0.5, bounce: 0 }), rollKey),
                  ]}
                >
                  {meter.value}
                </Text>
                {meter.unit ? (
                  <Text modifiers={[font({ size: 28, weight: 'light' }), foregroundStyle(Nocturne.text2)]}>{meter.unit}</Text>
                ) : null}
              </HStack>
              {meter.caption ? (
                <Text modifiers={[font({ textStyle: 'body' }), foregroundStyle(Nocturne.text2)]}>{meter.caption}</Text>
              ) : null}
              {meter.progress !== undefined ? (
                <ZStack alignment="leading" modifiers={[frame({ width: TRACK, height: 6 }), padding({ top: Space.s })]}>
                  <Capsule modifiers={[foregroundStyle(Nocturne.progressTrack)]} />
                  <Capsule
                    modifiers={[
                      foregroundStyle(Nocturne.text),
                      frame({ width: TRACK * Math.min(1, Math.max(0, meter.progress)) }),
                      animation(Animation.spring({ duration: 0.5, bounce: 0 }), meter.progress),
                    ]}
                  />
                </ZStack>
              ) : null}
            </VStack>
          ) : (
            <Text
              modifiers={[
                font({ size: 38, weight: 'light' }),
                foregroundStyle(Nocturne.text),
                multilineTextAlignment('center'),
                accessibilityAddTraits(['isHeader']),
                // The countdown rolls its digits as the minutes change.
                contentTransition('numericText', { countsDown: true }),
                animation(Animation.spring({ duration: 0.5, bounce: 0 }), rollKey),
                ...enter(3),
              ]}
            >
              {hero.title}
            </Text>
          )}
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
          {hero.aside ? (
            // Loc's line, apart from the fact, smaller and dimmer.
            <Text
              modifiers={[
                font({ textStyle: 'subheadline' }),
                foregroundStyle(Nocturne.text3),
                multilineTextAlignment('center'),
                frame({ maxWidth: 300 }),
                accessibilityLabel(`Loc: ${hero.aside}`),
                ...enter(4),
              ]}
            >
              {hero.aside}
            </Text>
          ) : null}
          {!action ? null : weight === 'primary' ? (
            // The screen's one white button, as wide as the column (buttons.tsx's PrimaryButton).
            <Button onPress={action.onPress} modifiers={[buttonStyle('plain'), padding({ top: Space.s }), ...enter(5)]}>
              <Text
                modifiers={[
                  font({ size: 17, weight: 'semibold' }),
                  foregroundStyle(Nocturne.onCta),
                  lineLimit(1),
                  frame({ maxWidth: 10_000, minHeight: CTA_HEIGHT }),
                  background(Nocturne.cta, shapes.capsule()),
                ]}
              >
                {action.label}
              </Text>
            </Button>
          ) : weight === 'link' ? (
            <Button onPress={action.onPress} modifiers={[buttonStyle('plain'), padding({ top: Space.s }), ...enter(5)]}>
              <HStack spacing={4} modifiers={[padding({ vertical: Space.xs })]}>
                <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(Nocturne.text2)]}>{action.label}</Text>
                {action.opens ? (
                  <Image systemName="chevron.right" color={Nocturne.text3} modifiers={[font({ size: 10, weight: 'semibold' })]} />
                ) : null}
              </HStack>
            </Button>
          ) : (
            <Button
              onPress={action.onPress}
              modifiers={[buttonStyle('plain'), padding({ top: Space.s }), ...enter(5)]}
            >
              <HStack spacing={6} modifiers={[padding({ vertical: 10, horizontal: 20 }), background(BUTTON, shapes.capsule())]}>
                <Text modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), foregroundStyle(Nocturne.text)]}>
                  {action.label}
                </Text>
                {action.opens ? (
                  <Image systemName="chevron.right" color={Nocturne.text2} modifiers={[font({ size: 11, weight: 'semibold' })]} />
                ) : null}
              </HStack>
            </Button>
          )}
          {alt ? (
            <Button onPress={alt.onPress} modifiers={[buttonStyle('plain'), ...enter(5)]}>
              <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(Nocturne.text2), padding({ vertical: Space.xs })]}>
                {alt.label}
              </Text>
            </Button>
          ) : null}
        </VStack>

        <Spacer />
      </VStack>
    </Host>
  );
}
