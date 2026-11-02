import { StyleSheet } from 'react-native';
import { Text } from '@/components/text';

import { noOrphan } from '@/lib/text';
import { DisplayFont, Nocturne, Space, VoiceSize } from '@/theme';

/**
 * His line in the display font, as on the Sleep sheet. `*word*` is set in italic for emphasis
 * ("Fine. *Fine.*"). Shared by the exits and scan screens. `sheet`: the title of a floating
 * sheet, small and centred like the Sleep sheet's own line (nap-screen.tsx).
 */
export function Voice({ text, sheet }: { text: string; sheet?: boolean }) {
  const parts = noOrphan(text).split('*');
  return (
    <Text style={[styles.voice, sheet && styles.sheet]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
      {parts.map((part, i) => (i % 2 ? <Text key={i} style={styles.emphasis}>{part}</Text> : part))}
    </Text>
  );
}

const styles = StyleSheet.create({
  voice: {
    ...DisplayFont,
    color: Nocturne.text,
    fontSize: VoiceSize.headline,
    lineHeight: VoiceSize.headline * 1.08,
  },
  sheet: { fontSize: 19, lineHeight: 24, textAlign: 'center', marginTop: Space.xs },
  emphasis: { fontStyle: 'italic' },
});
