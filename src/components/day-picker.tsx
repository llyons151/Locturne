import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';

import { Reveal } from '@/components/motion';
import * as haptic from '@/lib/haptics';
import { Nocturne, Radius, Space } from '@/theme';

/** Monday first. The value stored is the day's index here. */
export const DAYS = [
  { letter: 'M', name: 'Monday' },
  { letter: 'T', name: 'Tuesday' },
  { letter: 'W', name: 'Wednesday' },
  { letter: 'T', name: 'Thursday' },
  { letter: 'F', name: 'Friday' },
  { letter: 'S', name: 'Saturday' },
  { letter: 'S', name: 'Sunday' },
];

const ALL = DAYS.map((_, i) => i);
/** Shown Sunday first, like Home's week (user's ask, October 9, 2026); stored Monday first. */
export const SHOWN = [6, 0, 1, 2, 3, 4, 5];

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
        {SHOWN.map((i) => {
          const day = DAYS[i];
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

  strip: { flexDirection: 'row', justifyContent: 'space-between', gap: Space.xs },
  // Each night takes an equal share, so the row fits a card on a 320pt phone.
  stripCol: { flex: 1, maxWidth: 40, alignItems: 'center', gap: 6 },
  // Garmin's sleep-schedule row: off nights are a hairline ring, on nights a solid disc in the
  // same near-white as the CTA and DayPicker, so a picked night reads at a glance.
  stripDay: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: Nocturne.edge,
  },
  stripDayOn: { backgroundColor: Nocturne.cta, borderColor: Nocturne.cta },
  stripLetterOn: { color: Nocturne.onCta },
  stripLetter: { color: Nocturne.text2, fontSize: 15, fontWeight: '600' },
});

/**
 * The same seven nights as a bare row of rings (user's reference, Garmin Connect's sleep
 * schedule, 2026-10-09): off nights outlined, on nights filled. No dot under tonight (removed
 * at the user's ask, October 9, 2026); VoiceOver still hears which one is tonight.
 * Sits under the Routine tab's dial and saves on each tap.
 */
export function DayStrip({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  // Reads the clock for tonight's label, so the React Compiler mustn't cache it from the first render.
  'use no memo';
  // Monday first, like DAYS: getDay() is Sunday first.
  const tonight = (new Date().getDay() + 6) % 7;
  const toggle = (day: number) => {
    haptic.tap();
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  };

  return (
    <View style={styles.strip} accessibilityLabel="Nights">
      {SHOWN.map((i) => {
        const day = DAYS[i];
        const on = value.includes(i);
        const isTonight = i === tonight;
        return (
          <View key={day.name} style={styles.stripCol}>
            <Pressable
              onPress={() => toggle(i)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${day.name} night${isTonight ? ', tonight' : ''}`}
              accessibilityState={{ checked: on }}
              hitSlop={4}
              style={({ pressed }) => [styles.stripDay, on && styles.stripDayOn, pressed && styles.pressed]}
            >
              <Text style={[styles.stripLetter, on && styles.stripLetterOn]} maxFontSizeMultiplier={1.2}>
                {day.letter}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
