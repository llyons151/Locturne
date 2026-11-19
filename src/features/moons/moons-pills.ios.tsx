import { Host, HStack, Image, RNHostView, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHint,
  accessibilityLabel,
  Animation,
  animation,
  background,
  contentShape,
  contentTransition,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  onTapGesture,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { Image as ExpoImage } from 'expo-image';

import { Nocturne } from '@/theme';

import { useStreakPill } from '../home/streak-pill';
import { MOON_ICONS, NIGHT_ICON } from './moon-icons';

/** Home's pill, exactly (home-content.ios.tsx): white 8%, 36 tall, the flip on one 0.45 s spring. */
const PILL = 'rgba(255,255,255,0.08)';
const FLIP_S = 0.45;
const PILL_H = 36;

/**
 * The moons page's two pills in SwiftUI, as Home draws its own: every morning got up, a tap rolls
 * the digits and morphs the words to the streak (the page opens on mornings, Home on the streak,
 * user 2026-11-16), and how many moons are yours with the worn one's icon. One host as wide as the
 * page, so the first pill's width animates in SwiftUI and the pair stays centred without a jump.
 */
export function MoonsPills({ mornings, streak, owned, total, moonId }: { mornings: number; streak: number; owned: number; total: number; moonId: string }) {
  const pill = useStreakPill(streak, mornings, 'total');
  return (
    // A fixed height, the pills' own: measured (matchContents) it came out short on the phone and the pills
    // spilled up over "Wearing …" (user 2026-11-19).
    <Host style={{ alignSelf: 'stretch', height: PILL_H }} colorScheme="dark">
      <HStack spacing={8}>
        <HStack
          spacing={6}
          modifiers={[
            padding({ horizontal: 14 }),
            frame({ height: PILL_H }),
            background(PILL, shapes.capsule()),
            contentShape(shapes.capsule()),
            onTapGesture(pill.flip),
            animation(Animation.spring({ duration: FLIP_S, bounce: 0 }), pill.total),
            accessibilityElement('ignore'),
            accessibilityLabel(pill.a11y),
            ...(pill.hint ? [accessibilityHint(pill.hint), accessibilityAddTraits(['isButton' as const])] : []),
          ]}
        >
          <Image systemName="sunrise.fill" size={14} color={Nocturne.text} />
          <Text
            modifiers={[
              font({ textStyle: 'callout', weight: 'heavy' }),
              monospacedDigit(),
              foregroundStyle(Nocturne.text),
              contentTransition('numericText', { countsDown: !pill.total }),
            ]}
          >
            {String(pill.value)}
          </Text>
          <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(Nocturne.text2), contentTransition('numericText')]}>{pill.label}</Text>
        </HStack>
        <HStack
          spacing={6}
          modifiers={[
            padding({ horizontal: 14 }),
            frame({ height: PILL_H }),
            background(PILL, shapes.capsule()),
            accessibilityElement('ignore'),
            accessibilityLabel(`${owned} of ${total} moons`),
          ]}
        >
          <RNHostView matchContents>
            <ExpoImage source={MOON_ICONS[moonId] ?? NIGHT_ICON} style={{ width: 20, height: 20 }} contentFit="contain" transition={200} accessible={false} />
          </RNHostView>
          <Text modifiers={[font({ textStyle: 'callout', weight: 'heavy' }), monospacedDigit(), foregroundStyle(Nocturne.text)]}>{String(owned)}</Text>
          <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(Nocturne.text2)]}>{`of ${total} moons`}</Text>
        </HStack>
      </HStack>
    </Host>
  );
}
