import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/text';
import { noOrphan } from '@/lib/text';
import { APP_FONT, Nocturne, Space, Type } from '@/theme';

import { useEntrance } from './entrance';
import { HomeTop } from './home-top';

export type HomeContentProps = {
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
  hero: { title: string; body: string };
  /** Changes when the headline's countdown does (minutes left), to roll its digits. */
  heroKey: number;
  action: { label: string; onPress: () => void };
};

type Symbol = SymbolViewProps['name'];
const sym = (ios: string, android: string): Symbol => ({ ios, android, web: android }) as Symbol;

/**
 * The web and Android stand-in for home-content.ios.tsx (SwiftUI): the same layout, with the
 * same entrance in Reanimated (entrance.ts).
 */
export function HomeContent({ mornings, today, won, free, revision, hero, action }: HomeContentProps) {
  const { group, piece: enter } = useEntrance();
  return (
    <View style={styles.flex}>
      {/* The top only fades in, where it sits; only the middle rises (`group`). */}
      <HomeTop mornings={mornings} today={today} won={won} free={free} revision={revision} enter={enter} />
      <Animated.View style={[styles.hero, group]}>
        <Animated.View style={enter(2)}>
          <SymbolView name={sym('moon.fill', 'bedtime')} size={18} tintColor={Nocturne.text2} />
        </Animated.View>
        <Animated.Text style={[APP_FONT, styles.headline, enter(3)]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {hero.title}
        </Animated.Text>
        <Animated.Text style={[APP_FONT, styles.body, enter(4)]} maxFontSizeMultiplier={1.4}>
          {noOrphan(hero.body)}
        </Animated.Text>
        <Animated.View style={enter(5)}>
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          >
            <Text style={styles.ghostLabel}>{action.label}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.m },
  headline: { fontSize: 38, lineHeight: 44, fontWeight: '300', letterSpacing: -0.6, color: Nocturne.text, textAlign: 'center' },
  body: { ...Type.body, color: Nocturne.text2, textAlign: 'center', maxWidth: 320 },
  ghost: {
    marginTop: Space.s,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  pressed: { opacity: 0.6 },
  ghostLabel: { ...Type.secondary, fontWeight: '600', color: Nocturne.text },
});
