import { StyleSheet } from 'react-native';
import { Text } from '@/components/text';

import { noOrphan } from '@/lib/text';
import { DisplayFont, Nocturne, VoiceSize } from '@/theme';

/**
 * His line in the display font, as on the Sleep sheet. `*word*` is set in italic for emphasis
 * ("Fine. *Fine.*"). Shared by the exits and scan screens.
 */
export function Voice({ text }: { text: string }) {
  const parts = noOrphan(text).split('*');
  return (
    <Text style={styles.voice} maxFontSizeMultiplier={1.3} accessibilityRole="header">
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
  emphasis: { fontStyle: 'italic' },
});
