import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/text';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import type { Entrance } from './entrance';
import { dayLabel, morningsLabel, weekDays } from './week';

export type HomeTopProps = {
  /** Mornings you got up, a wake-up method's proof only. */
  mornings: number;
  /** `LockState.morningKey`. */
  today: string;
  /** Morning keys you got up on. */
  won: Set<string>;
  /** Past morning keys no night locked (`WeekDay.free`). */
  free: Set<string>;
  /** Bumped to redraw the screen time report. */
  revision: number;
  /** Home's staggered entrance (entrance.ts): the pills are step 0, the week step 1. */
  enter: Entrance;
};

type Symbol = SymbolViewProps['name'];
const sym = (ios: string, android: string): Symbol => ({ ios, android, web: android }) as Symbol;

/**
 * The web and Android top section (iOS draws it in SwiftUI, home-content.ios.tsx). Screen time can only be
 * drawn by Apple's report extension, so the web preview shows a sample.
 */
export function HomeTop({ mornings, today, won, free, enter }: HomeTopProps) {
  const days = weekDays(today, won, free);
  return (
    <View style={styles.top}>
      <Animated.View style={[styles.row, enter(0)]}>
        <View style={styles.pill} accessible accessibilityLabel={`${mornings} ${morningsLabel(mornings)} you got up`}>
          <SymbolView name={sym('sunrise.fill', 'wb_twilight')} size={15} tintColor={Nocturne.text} />
          <Text style={styles.pillValue}>{mornings}</Text>
          <Text style={styles.pillLabel}>{morningsLabel(mornings)}</Text>
        </View>
        {Platform.OS === 'web' ? (
          <View style={styles.pill} accessible accessibilityLabel="Sample: 2h 18m of screen time today">
            <SymbolView name={sym('hourglass', 'hourglass_empty')} size={15} tintColor={Nocturne.text} />
            <Text style={styles.pillValue}>2h 18m</Text>
            <Text style={styles.pillLabel}>today</Text>
          </View>
        ) : null}
      </Animated.View>
      <Animated.View style={[styles.week, enter(1)]}>
        {days.map((day) => (
          <View key={day.key} style={styles.day} accessible accessibilityLabel={dayLabel(day)}>
            <Text style={[styles.dayLetter, day.today && styles.dayLetterToday]}>{day.letter}</Text>
            <View style={[styles.dot, day.done && styles.dotDone, day.today && styles.dotToday, day.future && styles.dotFuture]}>
              {day.done ? <SymbolView name={sym('checkmark', 'check')} size={12} weight="bold" tintColor={Nocturne.bg} /> : null}
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const DOT = 32;

const styles = StyleSheet.create({
  top: { gap: Space.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillValue: { ...NUMBER_FONT, fontSize: 16, color: Nocturne.text },
  pillLabel: { ...Type.secondary, color: Nocturne.text2 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
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
