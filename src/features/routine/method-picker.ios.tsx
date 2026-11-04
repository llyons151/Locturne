import { Host } from '@expo/ui';
import { BottomSheet, Button, Grid, Group, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityElement,
  accessibilityHidden,
  accessibilityHint,
  aspectRatio,
  accessibilityLabel,
  background,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  onTapGesture,
  padding,
  presentationBackground,
  presentationDragIndicator,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import * as haptic from '@/lib/haptics';
import { Nocturne } from '@/theme';

import { type MethodOption } from './method-options';
import { pickMethod } from './method-pick';
import { type MethodPickerProps } from './method-picker-types';

const CARD = shapes.roundedRectangle({ cornerRadius: 18, roundedCornerStyle: 'continuous' });
const TILE = shapes.roundedRectangle({ cornerRadius: 12, roundedCornerStyle: 'continuous' });

/**
 * How you get up, in SwiftUI (user 2026-11-03: "rendered in native Swift… super clean", and the
 * swipes timed like the system's): the way picked as one row in the Routine card, and a tap opens
 * a real SwiftUI sheet, fitted to a grid of the ways as cards, with iOS's own drag and spring.
 * A tap on a card picks it and saves at once (method-pick.ts); Done closes. A way that needs
 * setting up first closes the sheet and opens its screen once the sheet is gone.
 *
 * Every way is the same square, its icon and name and nothing else, three to a row, Walk last
 * (user 2026-11-03, after a mission-picker reference, then Mesh's app-icon grid for three across).
 * The picked one is filled moon-white, the app's one way of saying "picked" (as the day discs).
 */
export function MethodPicker({ options, selected, detail, separator, onPicked }: MethodPickerProps) {
  const [open, setOpen] = useState(false);
  // Shown picked straight away, before the screen's reload comes back round.
  const [shown, setShown] = useState(selected);
  // A setup screen to open once the sheet is gone.
  const after = useRef<(() => void) | null>(null);
  const current = options.find((o) => o.value === selected) ?? options[0];

  const openSheet = () => {
    haptic.tap();
    setShown(selected);
    setOpen(true);
  };

  const pick = (value: MethodOption['value']) => {
    haptic.tap();
    const result = pickMethod(value);
    if (!result) return;
    if (!result.then) setShown(value);
    onPicked();
    if (result.then) {
      const to: Href = result.then;
      after.current = () => router.push(to);
      setOpen(false);
    }
  };

  // Walk, the default, last, just over Done (user 2026-11-03).
  const ordered = [...options.filter((o) => o.value !== 'steps'), ...options.filter((o) => o.value === 'steps')];
  const rows: MethodOption[][] = [];
  for (let i = 0; i < ordered.length; i += 3) rows.push(ordered.slice(i, i + 3));

  return (
    <View style={separator && styles.separator}>
      <Host matchContents={{ vertical: true }} style={styles.host} colorScheme="dark">
        <HStack
          spacing={14}
          modifiers={[
            padding({ vertical: 14, horizontal: 16 }),
            contentShape(shapes.rectangle()),
            onTapGesture(openSheet),
            accessibilityElement('combine'),
            accessibilityLabel(`How you get up: ${current.title}`),
            accessibilityHint('Opens the ways to get up.'),
            accessibilityAddTraits(['isButton']),
          ]}
        >
          <Image
            systemName={current.sf as SFSymbol}
            size={19}
            color={Nocturne.text}
            modifiers={[frame({ width: 40, height: 40 }), background(Nocturne.frost, TILE)]}
          />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(Nocturne.text)]}>{current.title}</Text>
            <Text modifiers={[font({ size: 15 }), foregroundStyle(Nocturne.text2)]}>{detail}</Text>
          </VStack>
          <Spacer />
          <Text modifiers={[font({ size: 15 }), foregroundStyle(Nocturne.text2)]}>Change</Text>
          <Image systemName="chevron.right" size={13} color={Nocturne.text3} />
        </HStack>
      </Host>

      <Host style={styles.anchor} colorScheme="dark">
        <BottomSheet
          isPresented={open}
          onIsPresentedChange={setOpen}
          fitToContents
          onDismiss={() => {
            const then = after.current;
            after.current = null;
            then?.();
          }}
        >
          <Group modifiers={[presentationDragIndicator('visible'), presentationBackground(Nocturne.bg)]}>
            <VStack spacing={20} modifiers={[padding({ top: 28, horizontal: 18, bottom: 12 })]}>
              <VStack spacing={4}>
                <Text modifiers={[font({ size: 19, weight: 'semibold' }), foregroundStyle(Nocturne.text)]}>How you get up</Text>
                <Text modifiers={[font({ size: 15 }), foregroundStyle(Nocturne.text2)]}>What it takes to wake your apps.</Text>
              </VStack>
              <Grid horizontalSpacing={10} verticalSpacing={10}>
                {rows.map((row) => (
                  <Grid.Row key={row[0].value}>
                    {row.map((o) => (
                      <MethodCard key={o.value} option={o} selected={o.value === shown} onPress={() => pick(o.value)} />
                    ))}
                    {/* A short last row keeps its squares' size. */}
                    {Array.from({ length: 3 - row.length }, (_, i) => (
                      <Spacer key={i} modifiers={[frame({ maxWidth: Infinity }), aspectRatio({ ratio: 1, contentMode: 'fit' }), accessibilityHidden(true)]} />
                    ))}
                  </Grid.Row>
                ))}
              </Grid>
              <Button
                onPress={() => {
                  haptic.done();
                  setOpen(false);
                }}
                modifiers={[buttonStyle('plain')]}
              >
                <Text
                  modifiers={[
                    font({ size: 17, weight: 'semibold' }),
                    foregroundStyle(Nocturne.onCta),
                    frame({ maxWidth: Infinity, minHeight: 56 }),
                    background(Nocturne.cta, shapes.capsule()),
                  ]}
                >
                  Done
                </Text>
              </Button>
            </VStack>
          </Group>
        </BottomSheet>
      </Host>
    </View>
  );
}

function MethodCard({ option, selected, onPress }: { option: MethodOption; selected: boolean; onPress: () => void }) {
  const ink = selected ? Nocturne.onCta : Nocturne.text;
  return (
    <VStack
      spacing={8}
      modifiers={[
        padding({ horizontal: 6 }),
        // A third of the row, as tall as it's wide.
        frame({ maxWidth: Infinity, maxHeight: Infinity }),
        aspectRatio({ ratio: 1, contentMode: 'fit' }),
        // The picked one filled moon-white (plain panes, no Liquid Glass on dark cards).
        background(selected ? Nocturne.cta : 'rgba(255, 255, 255, 0.06)', CARD),
        contentShape(CARD),
        onTapGesture(onPress),
        accessibilityElement('combine'),
        accessibilityLabel([option.title, option.recommended && 'Recommended', option.action].filter(Boolean).join(', ')),
        accessibilityAddTraits(selected ? ['isButton', 'isSelected'] : ['isButton']),
      ]}
    >
      <Image
        systemName={option.sf as SFSymbol}
        size={18}
        color={ink}
        modifiers={[frame({ width: 40, height: 40 }), background(selected ? 'rgba(11, 20, 40, 0.08)' : Nocturne.frost, shapes.circle())]}
      />
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink), multilineTextAlignment('center'), lineLimit(2), minimumScaleFactor(0.9)]}>
        {/* Never split "push-ups" at its hyphen on a narrow phone. */}
        {option.title.replace(/-/g, '\u2011')}
      </Text>
    </VStack>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'stretch' },
  // The sheet hangs off an empty spot; it draws over the whole screen.
  anchor: { position: 'absolute', width: 0, height: 0 },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Nocturne.edge },
});
