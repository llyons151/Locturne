import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { SearchingOrb } from '@/components/thinking-orb';
import { noOrphan } from '@/lib/text';
import { APP_FONT, CTA_HEIGHT, Nocturne, Space, Type } from '@/theme';

import { useEntrance } from './entrance';
import { SWAP_IN, SWAP_OUT, useHeroSwap } from './hero-swap';
import { HomeTop } from './home-top';
import { actionWeight, topLevel, type HomeLook } from './home-look';

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
  /** Just back from the background (`useCatchingUp`): changes land in place, unanimated. */
  catchingUp?: boolean;
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
  /** Which of Home's looks the state wears (`HomeLook`). */
  look: HomeLook;
};

/** `opens`: it leads somewhere (a chevron), rather than doing the thing it names. */
export type HomeAction = { label: string; onPress: () => void; opens?: boolean };
/**
 * `progress` 0–1 draws the track; without it, just the number (a distance has no track).
 * `kicker` is the small capitals label over the number ("BEDTIME IN"), `unit` the small "am"
 * after it, and `caption` may be left out.
 */
export type HomeMeter = { value: string; caption?: string; progress?: number; kicker?: string; unit?: string };
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
export function HomeContent(props: HomeContentProps) {
  const { mornings, today, won, free, revision } = props;
  const { group, piece: enter } = useEntrance();
  // A change of state (Screen Time turned on, bedtime starting) fades the middle out and back in.
  const { content, visible } = useHeroSwap(props, props.catchingUp);
  const { hero, meter, icon, searching, action, alt, look } = content;
  const weight = actionWeight(look, action);
  const top = topLevel(look);
  const swap = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, visible ? { duration: SWAP_IN * 1000, easing: Easing.out(Easing.quad) } : { duration: SWAP_OUT * 1000, easing: Easing.in(Easing.quad) }),
  }));
  return (
    <View style={styles.flex}>
      {/* The top only fades in, where it sits; only the middle rises (`group`). */}
      {top ? (
        <View style={{ opacity: top }}>
          <HomeTop mornings={mornings} today={today} won={won} free={free} revision={revision} enter={enter} usage={look !== 'night'} />
        </View>
      ) : null}
      <Animated.View style={[styles.hero, group, swap]}>
        <Animated.View style={enter(2)}>
          {searching ? (
            <SearchingOrb />
          ) : look === 'problem' ? (
            <SymbolView name={sym('exclamationmark.circle', 'error')} size={30} tintColor={Nocturne.text} />
          ) : (
            <SymbolView name={icon ? sym(icon.ios, icon.android) : sym('moon.fill', 'bedtime')} size={18} tintColor={Nocturne.text2} />
          )}
        </Animated.View>
        {meter ? (
          <Animated.View style={[styles.meter, enter(3)]} accessible accessibilityRole="header" accessibilityLabel={hero.title}>
            {meter.kicker ? <Text style={styles.kicker}>{meter.kicker}</Text> : null}
            <Text style={[APP_FONT, styles.count]} maxFontSizeMultiplier={1.2}>
              {meter.value}
              {meter.unit ? <Text style={styles.unit}>{` ${meter.unit}`}</Text> : null}
            </Text>
            {meter.caption ? <Text style={styles.body}>{meter.caption}</Text> : null}
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
        <Animated.View style={[enter(5), weight === 'primary' && styles.primaryWrap]}>
          {weight === 'primary' ? (
            <Pressable onPress={action.onPress} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ) : weight === 'link' ? (
            <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
              <Text style={styles.altLabel}>{action.label}</Text>
              {action.opens ? <SymbolView name={sym('chevron.right', 'chevron_right')} size={10} weight="semibold" tintColor={Nocturne.text3} /> : null}
            </Pressable>
          ) : (
            <Pressable
              onPress={action.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
            >
              <Text style={styles.ghostLabel}>{action.label}</Text>
              {action.opens ? <SymbolView name={sym('chevron.right', 'chevron_right')} size={11} weight="semibold" tintColor={Nocturne.text2} /> : null}
            </Pressable>
          )}
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
  kicker: { ...Type.label, textAlign: 'center' },
  unit: { fontSize: 28, letterSpacing: 0, color: Nocturne.text2 },
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
  link: { marginTop: Space.s, paddingVertical: Space.xs, flexDirection: 'row', alignItems: 'center', gap: 4 },
  // The screen's one white button, as wide as the column (buttons.tsx's PrimaryButton).
  primaryWrap: { alignSelf: 'stretch' },
  primary: {
    marginTop: Space.s,
    minHeight: CTA_HEIGHT,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: Nocturne.cta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: 17, fontWeight: '600', color: Nocturne.onCta },
  altLabel: { ...Type.secondary, color: Nocturne.text2 },
});
