import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/** Corner radius for glass cards: rounder than plain cards, like iOS 26 platters. */
export const GLASS_RADIUS = 26;

/**
 * A pane of glass over the night sky (docs/design-references/glassmorphism-cards.png).
 * Real liquid glass on iOS 26; elsewhere a translucent pane that blurs its backdrop on web.
 * Either way it keeps a visible fill, a thin rim that catches the light at its top edge
 * and a faint diagonal sheen, so it still reads as a box over the black part of the sky.
 * The rim and sheen are neutral white; never a tinted glow.
 */
export function GlassCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const sheen = (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="glass-sheen" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.04} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.02} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#glass-sheen)" />
    </Svg>
  );
  // The rim goes over the content (pressed rows) so it never gets covered.
  const rim = <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.rim]} />;

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={[styles.shape, style]}
      >
        {sheen}
        {children}
        {rim}
      </GlassView>
    );
  }
  return (
    <View style={[styles.shape, styles.pane, style]}>
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
  rim: {
    borderRadius: GLASS_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderTopColor: 'rgba(255, 255, 255, 0.36)',
    borderLeftColor: 'rgba(255, 255, 255, 0.24)',
  },
});
