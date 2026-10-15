import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/text';
import { SearchingOrb } from '@/components/thinking-orb';
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
  /** `aside`: Loc's line, set apart under the body, smaller and dimmer. */
  hero: { title: string; body: string; aside?: string };
  /** Changes when the headline's countdown does (minutes left), to roll its digits. */
  heroKey: number;
  /**
   * The morning's live count, shown in place of the headline (which then only labels it for
   * VoiceOver): "64" over "of 200 steps", and a thin white track, 0–1.
   */
  meter?: HomeMeter;
  /** The symbol over the headline; the moon unless the morning names its method's. */
  icon?: HomeIcon;
  /** Waiting on a location read: a searching orb takes the symbol's place. */
  searching?: boolean;
  action: HomeAction;
  /** A quiet second way, as plain text under the button ("Other ways to wake them"). */
  alt?: HomeAction;
};

/** `opens`: it leads somewhere (a chevron), rather than doing the thing it names. */
export type HomeAction = { label: string; onPress: () => void; opens?: boolean };
/** `progress` 0–1 draws the track; without it, just the number (a distance has no track). */
export type HomeMeter = { value: string; caption: string; progress?: number };
/** An SF Symbol, and the Material symbol for web and Android. */
export type HomeIcon = { ios: string; android: string };

/**
 * A wake-up method drawn as Home's morning (docs/HOME_INTERACTIVE.md): the use-morning-*
 * hooks each return one, and Home shows it in place of its usual hero. `keepAwake` while a
 * live session needs the screen on (a barometer session stops when the phone locks).
 */
export type HomeMorning = {
  icon: HomeIcon;
  searching?: boolean;
  hero: HomeContentProps['hero'];
  meter?: HomeMeter;
  action: HomeAction;
  alt?: HomeAction;
  keepAwake?: boolean;
};

type Symbol = SymbolViewProps['name'];
/** The walk's track, as wide as the body text it sits over. */
const TRACK = 240;

const sym = (ios: string, android: string): Symbol => ({ ios, android, web: android }) as Symbol;

/**
 * The web and Android stand-in for home-content.ios.tsx (SwiftUI): the same layout, with the
 * same entrance in Reanimated (entrance.ts).
 */
export function HomeContent({ mornings, today, won, free, revision, hero, meter, icon, searching, action, alt }: HomeContentProps) {
  const { group, piece: enter } = useEntrance();
  return (
    <View style={styles.flex}>
      {/* The top only fades in, where it sits; only the middle rises (`group`). */}
      <HomeTop mornings={mornings} today={today} won={won} free={free} revision={revision} enter={enter} />
      <Animated.View style={[styles.hero, group]}>
        <Animated.View style={enter(2)}>
          {searching ? (
            <SearchingOrb />
          ) : (
            <SymbolView name={icon ? sym(icon.ios, icon.android) : sym('moon.fill', 'bedtime')} size={18} tintColor={Nocturne.text2} />
          )}
        </Animated.View>
        {meter ? (
          <Animated.View style={[styles.meter, enter(3)]} accessible accessibilityRole="header" accessibilityLabel={hero.title}>
            <Text style={[APP_FONT, styles.count]} maxFontSizeMultiplier={1.2}>
              {meter.value}
            </Text>
            <Text style={styles.body}>{meter.caption}</Text>
            {meter.progress !== undefined ? (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, meter.progress)) * 100}%` }]} />
              </View>
            ) : null}
          </Animated.View>
        ) : (
          <Animated.Text style={[APP_FONT, styles.headline, enter(3)]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {hero.title}
          </Animated.Text>
        )}
        <Animated.Text style={[APP_FONT, styles.body, enter(4)]} maxFontSizeMultiplier={1.4}>
          {noOrphan(hero.body)}
        </Animated.Text>
        {hero.aside ? (
          <Animated.Text style={[APP_FONT, styles.aside, enter(4)]} accessibilityLabel={`Loc: ${hero.aside}`} maxFontSizeMultiplier={1.4}>
            {noOrphan(hero.aside)}
          </Animated.Text>
        ) : null}
        <Animated.View style={enter(5)}>
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          >
            <Text style={styles.ghostLabel}>{action.label}</Text>
            {action.opens ? <SymbolView name={sym('chevron.right', 'chevron_right')} size={11} weight="semibold" tintColor={Nocturne.text2} /> : null}
          </Pressable>
        </Animated.View>
        {alt ? (
          <Animated.View style={enter(5)}>
            <Pressable onPress={alt.onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.alt, pressed && styles.pressed]}>
              <Text style={styles.altLabel}>{alt.label}</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.m },
  headline: { fontSize: 38, lineHeight: 44, fontWeight: '300', letterSpacing: -0.6, color: Nocturne.text, textAlign: 'center' },
  meter: { alignItems: 'center', gap: Space.xs },
  count: { fontSize: 64, lineHeight: 70, fontWeight: '300', letterSpacing: -1, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  track: { width: TRACK, height: 6, marginTop: Space.s, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.text },
  body: { ...Type.body, color: Nocturne.text2, textAlign: 'center', maxWidth: 320 },
  ghost: {
    marginTop: Space.s,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aside: { ...Type.secondary, color: Nocturne.text3, textAlign: 'center', maxWidth: 300 },
  pressed: { opacity: 0.6 },
  ghostLabel: { ...Type.secondary, fontWeight: '600', color: Nocturne.text },
  alt: { paddingVertical: Space.xs },
  altLabel: { ...Type.secondary, color: Nocturne.text2 },
});
