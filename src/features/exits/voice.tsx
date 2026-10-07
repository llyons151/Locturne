import { StyleSheet, Text } from 'react-native';

import { noOrphan } from '@/lib/text';
import { DisplayFont, italicOverhang, Nocturne, VoiceSize } from '@/theme';

/**
 * His line in the italic serif, as on the Sleep sheet. `*word*` is set in the upright cut for
 * emphasis ("Fine. *Fine.*"). Shared by the exits and scan screens.
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
    ...italicOverhang(VoiceSize.headline),
    color: Nocturne.text,
    fontSize: VoiceSize.headline,
    lineHeight: VoiceSize.headline * 1.08,
  },
  emphasis: { fontStyle: 'normal' },
});
