import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Reveal } from '@/components/motion';
import * as haptic from '@/lib/haptics';
import { Nocturne, Radius, Space } from '@/theme';

/** Monday first. The value stored is the day's index here. */
const DAYS = [
  { letter: 'M', name: 'Monday' },
  { letter: 'T', name: 'Tuesday' },
  { letter: 'W', name: 'Wednesday' },
  { letter: 'T', name: 'Thursday' },
  { letter: 'F', name: 'Friday' },
  { letter: 'S', name: 'Saturday' },
  { letter: 'S', name: 'Sunday' },
];

const ALL = DAYS.map((_, i) => i);

/**
 * Seven nights to tap on or off. The count of picked nights is the answer. Copied from
 * Health's "Days Active" card (docs/DAY_PICKER_REFERENCES.md): one grouped card, picked
 * days are solid circles, unpicked days are bare letters.
 */
export function DayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const everyNight = value.length === DAYS.length;
  const toggle = (day: number) => {
    haptic.tap();
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  };

  return (
    <Reveal style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.count} maxFontSizeMultiplier={1.4} accessibilityLiveRegion="polite">
          {value.length === 0 ? 'No nights picked' : `${value.length} ${value.length === 1 ? 'night' : 'nights'} a week`}
        </Text>
        <Pressable
          onPress={() => {
            haptic.tap();
            onChange(everyNight ? [] : ALL);
          }}
          accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.all} maxFontSizeMultiplier={1.4}>
            {everyNight ? 'Clear' : 'Every night'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {DAYS.map((day, i) => {
          const on = value.includes(i);
          return (
            <Pressable
              key={day.name}
              onPress={() => toggle(i)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${day.name} night`}
              accessibilityState={{ checked: on }}
              hitSlop={4}
              style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && styles.pressed]}
            >
              <Text style={[styles.letter, on && styles.letterOn]} maxFontSizeMultiplier={1.2}>
                {day.letter}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: Radius.card,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    paddingHorizontal: Space.l,
    paddingVertical: Space.l,
    gap: Space.l,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  count: { color: Nocturne.text, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  all: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  // Seven across the card's ~312pt inner width: 40pt circles, with hitSlop bringing each to 48.
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: Nocturne.cta },
  pressed: { opacity: 0.6 },
  letter: { color: Nocturne.text2, fontSize: 17, fontWeight: '600' },
  letterOn: { color: Nocturne.onCta },

  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Space.s,
    borderRadius: 999,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
  },
  stripDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Nocturne.raised,
  },
  stripLetter: { color: Nocturne.text2, fontSize: 15, fontWeight: '600' },
});

/**
 * The same seven nights as one pill-shaped strip (user's reference, 2026-10-08): every day a
 * circle, picked ones filled. Sits under the Routine tab's dial and saves on each tap.
 */
export function DayStrip({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const toggle = (day: number) => {
    haptic.tap();
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  };

  return (
    <View style={styles.strip} accessibilityLabel="Nights">
      {DAYS.map((day, i) => {
        const on = value.includes(i);
        return (
          <Pressable
            key={day.name}
            onPress={() => toggle(i)}
            accessibilityRole="checkbox"
            accessibilityLabel={`${day.name} night`}
            accessibilityState={{ checked: on }}
            hitSlop={4}
            style={({ pressed }) => [styles.stripDay, on && styles.dayOn, pressed && styles.pressed]}
          >
            <Text style={[styles.stripLetter, on && styles.letterOn]} maxFontSizeMultiplier={1.2}>
              {day.letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
