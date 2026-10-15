import { StyleSheet } from 'react-native';
import { Text } from '@/components/text';

import { Nocturne, NUMBER_FONT } from '@/theme';

/**
 * The big count over a meter ("84"). On iPhone the digits roll as it changes
 * (count-text.ios.tsx); here it just changes.
 */
export function CountText({ value }: { value: string }) {
  return (
    <Text style={styles.number} maxFontSizeMultiplier={1.2}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  number: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 72, lineHeight: 80, fontVariant: ['tabular-nums'] },
});
