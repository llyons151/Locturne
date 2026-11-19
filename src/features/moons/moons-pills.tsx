import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition } from 'react-native-reanimated';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import { Nocturne, NUMBER_FONT, Type } from '@/theme';

import { useStreakPill } from '../home/streak-pill';

/**
 * The moons page's two pills, as Home draws its own (home-top.tsx), on every platform: the SwiftUI
 * version overlapped "Wearing …" and cut "mornings" short on iPhone (user 2026-11-19), so it's gone: every morning got up, which a tap flips to the streak (the page opens on mornings, Home
 * on the streak, user 2026-11-16), and how many moons are yours (no icon, user 2026-11-19).
 */
export function MoonsPills({ mornings, streak, owned, total, moonId }: { mornings: number; streak: number; owned: number; total: number; moonId: string }) {
  const pill = useStreakPill(streak, mornings, 'total');
  return (
    <View style={styles.row}>
      <Pressable onPress={pill.flip} accessibilityRole="button" accessibilityLabel={pill.a11y} accessibilityHint={pill.hint}>
        <Animated.View layout={FLIP_LAYOUT} style={styles.pill}>
          <SymbolView name={sym('sunrise.fill', 'wb_twilight')} size={15} tintColor={Nocturne.text} />
          <Animated.View key={pill.total ? 'total' : 'streak'} entering={FLIP_IN} style={styles.words}>
            <Text style={styles.value}>{pill.value}</Text>
            <Text style={styles.label}>{pill.label}</Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
      <View style={styles.pill} accessible accessibilityLabel={`${owned} of ${total} moons`}>
        <Text style={styles.value}>{owned}</Text>
        <Text style={styles.label}>of {total} moons</Text>
      </View>
    </View>
  );
}

const FLIP_LAYOUT = LinearTransition.duration(300).easing(Easing.out(Easing.cubic));
const FLIP_IN = FadeIn.duration(260);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  words: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { ...NUMBER_FONT, fontSize: 16, color: Nocturne.text },
  label: { ...Type.secondary, color: Nocturne.text2 },
});
