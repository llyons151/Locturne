import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { noOrphan } from '@/lib/text';
import { DisplayFont, italicOverhang, Nocturne, Space, Type, VoiceSize } from '@/theme';

/**
 * The wake-up screens' shared pieces: his line, the body under it, the big number and the
 * thin white progress track the rest of the app uses (Home, Nap). Monochrome, no glow.
 */

/** His line in the italic serif. `*word*` is set in the upright cut for emphasis. */
export function Voice({ text }: { text: string }) {
  const parts = noOrphan(text).split('*');
  return (
    <Animated.Text
      key={text}
      entering={FadeIn.duration(350)}
      style={styles.voice}
      accessibilityRole="header"
      accessibilityLiveRegion="polite"
      maxFontSizeMultiplier={1.3}
    >
      {parts.map((part, i) => (i % 2 ? <Text key={i} style={styles.emphasis}>{part}</Text> : part))}
    </Animated.Text>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

/** The top bar: what this is, and the way out. */
export function TopBar({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <View style={styles.bar}>
      <Text style={Type.label}>{label}</Text>
      <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
        <SymbolView name={sym('xmark', 'close')} size={20} weight="semibold" tintColor={Nocturne.text2} />
      </Pressable>
    </View>
  );
}

/** Motion & Fitness is off: say so plainly and offer the fix (VOICE.md, "Clear when it matters"). */
export function MotionOff({ what }: { what: string }) {
  return (
    <View style={styles.serious}>
      <Body>
        Motion &amp; Fitness is off for Locturne, so I can&apos;t {what}. Turn it on in Settings, under
        Privacy &amp; Security.
      </Body>
      <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
    </View>
  );
}

const styles = StyleSheet.create({
  voice: {
    ...DisplayFont,
    ...italicOverhang(VoiceSize.headline),
    color: Nocturne.text,
    fontSize: VoiceSize.headline,
    lineHeight: VoiceSize.headline * 1.08,
  },
  emphasis: { fontStyle: 'normal' },
  body: { ...Type.body, color: Nocturne.text2 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  serious: { gap: Space.l },
});
