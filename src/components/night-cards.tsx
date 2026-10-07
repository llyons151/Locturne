import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import * as haptic from '@/lib/haptics';
import { Nocturne, Radius, Space, Type } from '@/theme';

/**
 * The status card at the top of the Apps and Routine tabs (docs/UI_REDESIGN.md), after Sky
 * Guide's Calendar and Tonight cards: a small caps line, a bold title and one plain line.
 * (It had the moon photo in its right edge; the user didn't like it, so it's gone.)
 *
 * Neutral: a navy-to-charcoal fill and a hairline edge, never a glow.
 */

/** The card's fill, the sky's navy at the top left fading into the cards' charcoal. */
function Fill({ id, dim }: { id: string; dim?: boolean }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={Nocturne.bgTop ?? Nocturne.raised} stopOpacity={dim ? 0.45 : 1} />
          <Stop offset="1" stopColor={Nocturne.surface} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Tonight at a glance: "EVERY NIGHT" / "11 pm – 7 am" / one line. A night that's off fades its fill. */
export function NightCard({
  eyebrow,
  title,
  detail,
  off,
  onPress,
  accessibilityLabel,
  children,
  style,
}: {
  style?: StyleProp<ViewStyle>;
  eyebrow: string;
  title: string;
  detail?: string;
  off?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Extra rows under the summary (a waiting change, say). */
  children?: ReactNode;
}) {
  const body = (
    <>
      <Fill id="night-card" dim={off} />
      <View style={styles.nightText}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.nightTitle} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        {detail ? <Text style={styles.nightDetail}>{detail}</Text> : null}
      </View>
      {children}
    </>
  );
  if (!onPress) {
    return (
      <View style={[styles.night, style]} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.night, style, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },

  night: {
    minHeight: 112,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Nocturne.edge,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  nightText: { gap: 2, padding: Space.l },
  eyebrow: { ...Type.label, fontSize: 11, color: Nocturne.text2 },
  nightTitle: { color: Nocturne.text, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  nightDetail: { ...Type.secondary, color: Nocturne.text2 },
});
