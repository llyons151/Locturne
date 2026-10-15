import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Corner radius for glass cards: rounder than plain cards, like iOS 26 platters. */
export const GLASS_RADIUS = 26;

/**
 * The smoked glass's tint. Mostly opaque (user, 2026-10-09: 0.55 was too see-through and
 * looked odd): the sky only just shows through, so it reads as a solid card.
 */
const DARK_TINT = 'rgba(6, 10, 20, 0.82)';

/**
 * A pane of glass over the night sky (docs/design-references/glassmorphism-cards.png).
 * Real liquid glass on iOS 26; elsewhere a translucent pane that blurs its backdrop on web.
 * Either way it keeps a visible fill, a thin rim that catches the light at its top edge
 * and a faint diagonal sheen, so it still reads as a box over the black part of the sky.
 * The rim and sheen are neutral white; never a tinted glow.
 */
export function GlassCard({
  children,
  style,
  dark,
  rim: rimColor,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Darkened glass (user's ask, 2026-10-08, for the app lists): smoked glass that reads as a
   * solid card. A tinted pane on every platform, never Liquid Glass (see below). The sheen
   * and rim are quieter to match.
   */
  dark?: boolean;
  /** One colour for the whole rim instead of the lit top edge: a card that needs fixing. */
  rim?: string;
}) {
  const sheenTop = dark ? 0.07 : 0.16;
  const sheen = (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={dark ? 'glass-sheen-dark' : 'glass-sheen'} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={sheenTop} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={dark ? 0.015 : 0.04} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={dark ? 0 : 0.02} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={dark ? 'url(#glass-sheen-dark)' : 'url(#glass-sheen)'} />
    </Svg>
  );
  // The rim goes over the content (pressed rows) so it never gets covered.
  const rim = (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.rim, dark && styles.rimDark, rimColor ? { borderColor: rimColor } : null]}
    />
  );

  // Smoked cards skip Liquid Glass: under the 0.82 tint the glass barely shows, and on iPhone it
  // split the card in two, frosted on top and a flat shade below (user, 2026-10-14). The pane
  // is the same smoked fill the web preview already draws.
  if (isLiquidGlassAvailable() && !dark) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={dark ? DARK_TINT : 'rgba(255, 255, 255, 0.08)'}
        style={[styles.shape, style]}
      >
        {sheen}
        {children}
        {rim}
      </GlassView>
    );
  }
  return (
    <View style={[styles.shape, dark ? styles.paneDark : styles.pane, style]}>
      {sheen}
      {children}
      {rim}
    </View>
  );
}

const styles = StyleSheet.create({
  shape: { borderRadius: GLASS_RADIUS, overflow: 'hidden' },
  pane: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    ...Platform.select({
      web: { backdropFilter: 'blur(28px) saturate(170%)' } as ViewStyle,
    }),
  },
  paneDark: {
    backgroundColor: DARK_TINT,
    ...Platform.select({
      web: { backdropFilter: 'blur(28px) saturate(140%)' } as ViewStyle,
    }),
  },
  rim: {
    borderRadius: GLASS_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderTopColor: 'rgba(255, 255, 255, 0.36)',
    borderLeftColor: 'rgba(255, 255, 255, 0.24)',
  },
  rimDark: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.20)',
    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
  },
});
