import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { getMorningPlace } from '@/lib/place';
import { type WakeMethod } from '@/lib/routine';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { getSetRoutine } from './apply-edit';
import { methodOptions, type MethodOption } from './method-options';
import { pickMethod } from './method-pick';

/**
 * How you get up, as a grid of cards in the Sleep sheet's floating card: the web preview's and
 * Android's version of the SwiftUI sheet (method-picker.ios.tsx; user 2026-11-03, a button and a
 * swipe-up grid in place of the long list). A tap picks one and saves it at once (method-pick.ts);
 * Done just closes. A way that needs setting up first hands over to its own screen.
 *
 * Every way is the same square, its icon and name and nothing else, three to a row, Walk last
 * (user 2026-11-03, after a mission-picker reference, then Mesh's app-icon grid for three across).
 * The picked one is filled moon-white, the app's one way of saying "picked" (as the day discs).
 */
export function MethodSheet() {
  // Reads the routine and the place while rendering, which change outside React.
  'use no memo';
  const [method, setMethod] = useState<WakeMethod>(() => getSetRoutine().method);
  const set = getSetRoutine();
  const place = getMorningPlace();
  const options = methodOptions({
    place: place?.name ?? null,
    steps: set.stepGoal,
    wake: set.morningStart,
  });

  const pick = (value: WakeMethod) => {
    haptic.tap();
    const result = pickMethod(value);
    if (!result) return;
    if (result.then) {
      router.replace(result.then);
      return;
    }
    setMethod(value);
  };

  const done = () => {
    haptic.done();
    closeSleepSheet();
  };

  // Walk, the default, last, just over Done (user 2026-11-03).
  const ordered = [...options.filter((o) => o.value !== 'steps'), ...options.filter((o) => o.value === 'steps')];
  const rows: MethodOption[][] = [];
  for (let i = 0; i < ordered.length; i += 3) rows.push(ordered.slice(i, i + 3));

  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          How you get up
        </Text>
        <Text style={styles.body}>What it takes to wake your apps.</Text>
      </View>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {rows.map((row) => (
          <View key={row[0].value} style={styles.row}>
            {row.map((o) => (
              <MethodCard key={o.value} option={o} selected={o.value === method} onPress={() => pick(o.value)} />
            ))}
            {/* A short last row keeps its squares' size. */}
            {Array.from({ length: 3 - row.length }, (_, i) => (
              <View key={i} style={[styles.square, styles.card, styles.ghost]} />
            ))}
          </View>
        ))}
      </View>
      <Pressable onPress={done} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonLabel}>Done</Text>
      </Pressable>
    </View>
  );
}

function MethodCard({ option, selected, onPress }: { option: MethodOption; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[option.title, option.recommended && 'Recommended', option.action].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.square, styles.card, selected && styles.cardOn, pressed && styles.pressed]}
    >
      <View style={[styles.tile, selected && styles.tileOn]}>
        <SymbolView name={option.icon} size={18} tintColor={selected ? Nocturne.onCta : Nocturne.text} />
      </View>
      <Text style={[styles.cardTitle, selected && styles.cardTitleOn]} numberOfLines={2}>
        {/* Never split "push-ups" at its hyphen on a narrow phone. */}
        {option.title.replace(/-/g, '\u2011')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sized to its contents inside the card, padded like the Sleep sheet.
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.l },
  head: { gap: Space.xs, alignItems: 'center' },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 19, lineHeight: 24, textAlign: 'center', marginTop: Space.xs },
  body: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  // A third of the row, as tall as it's wide.
  square: { flexBasis: 0, flexGrow: 1, aspectRatio: 1 },
  // Plain frosted panes (no Liquid Glass on dark cards); the picked one filled moon-white.
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  // The empty spot in a short row: a card's share of the row, unseen.
  ghost: { backgroundColor: 'transparent' },
  cardOn: { backgroundColor: Nocturne.cta },
  // Round and white on frost, the same for every way; dark on the picked one.
  tile: { width: 40, height: 40, borderRadius: 20, backgroundColor: Nocturne.frost, alignItems: 'center', justifyContent: 'center' },
  tileOn: { backgroundColor: 'rgba(11, 20, 40, 0.08)' },
  cardTitle: { color: Nocturne.text, fontSize: 13, lineHeight: 16, fontWeight: '600', textAlign: 'center' },
  cardTitleOn: { color: Nocturne.onCta },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: Nocturne.cta,
  },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
