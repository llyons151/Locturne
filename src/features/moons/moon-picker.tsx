import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceRow, Section } from '@/components/grouped-list';
import { Gap, Space } from '@/theme';

import { LADDER } from './moon-data';
import { DEFAULT_MOON, LADDER_MOONS, OTHER_MOONS, setMoon, useMoon } from './moon-theme';
import type { MoonDef } from './moon-types';

/** When each ladder moon unlocks (docs/reports/Moon count and unlock pacing.md). */
const UNLOCKS = ['Morning 1', 'Morning 3', 'Morning 7', 'Morning 14', 'Morning 30', 'Morning 50', 'Morning 100', 'Morning 150', 'Morning 200', 'Week 50', 'Secret'];

/**
 * Dev and preview builds: every moon, all unlocked, to wear and test on the phone (user,
 * 2026-10-29). Your ladder from the moon lab first, in unlock order, then everything else.
 */
export function MoonPicker() {
  const insets = useSafeAreaInsets();
  const worn = useMoon();
  const row = (m: MoonDef, detail: string, last: boolean) => (
    <ChoiceRow key={m.id} title={m.name} detail={detail} selected={worn.id === m.id} onPress={() => setMoon(m.id)} last={last} />
  );
  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Gap.gutter }]}>
      <Section footer="The moon everyone starts with.">{row(DEFAULT_MOON, DEFAULT_MOON.tag, true)}</Section>
      <Section label="Your ladder" footer="The ladder from the moon lab, in the order they unlock.">
        {LADDER_MOONS.map((m, i) => row(m, `${UNLOCKS[LADDER.indexOf(m.id)] ?? ''} · ${m.tag}`, i === LADDER_MOONS.length - 1))}
      </Section>
      <Section label="Every other moon" footer="Real, creative and twin moons from the moon lab.">
        {OTHER_MOONS.map((m, i) => row(m, `${m.kind} · ${m.tag}`, i === OTHER_MOONS.length - 1))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Space.l, paddingTop: Space.l },
});
