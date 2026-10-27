import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import { Nocturne, Space, Type } from '@/theme';

import { dayLabel, type WeekDay } from './week';

/**
 * The week's day dots outside a SwiftUI page (the morning payoff). On iPhone (week-strip.ios.tsx)
 * they're Home's SwiftUI dots with the mist inside; this is the web preview's look-alike.
 */
export function WeekStrip({ days }: { days: WeekDay[]; reduced: boolean }) {
  return (
    <View style={styles.week}>
      {days.map((day) => (
        <View key={day.key} style={styles.day} accessible accessibilityLabel={dayLabel(day)}>
          <Text style={[styles.dayLetter, day.today && styles.dayLetterToday]}>{day.letter}</Text>
          <View style={[styles.dot, day.done && styles.dotDone, day.today && styles.dotToday, day.future && styles.dotFuture]}>
            {day.done ? <SymbolView name={sym('checkmark', 'check')} size={12} weight="bold" tintColor={Nocturne.bg} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const DOT = 32;

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  day: { alignItems: 'center', gap: Space.s },
  dayLetter: { ...Type.caption, color: Nocturne.text3 },
  dayLetterToday: { color: Nocturne.text, fontWeight: '600' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
    borderColor: Nocturne.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: Nocturne.text, borderColor: Nocturne.text },
  dotToday: { borderColor: Nocturne.text, borderWidth: 2 },
  dotFuture: { opacity: 0.4 },
});
