import { StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { RollingCount } from '@/features/onboarding/rolling-count';
import { Nocturne, NUMBER_FONT } from '@/theme';

/**
 * The big count over a meter ("84"). On iPhone SwiftUI rolls the digits (count-text.ios.tsx);
 * here a whole number rolls the onboarding's way (RollingCount), so the web previews move the
 * same, and anything else (a dash) just changes.
 */
export function CountText({ value, size = 72 }: { value: string; size?: number }) {
  const style = [styles.number, { fontSize: size, lineHeight: Math.round(size * 1.1) }];
  if (/^\d+$/.test(value)) return <RollingCount value={Number(value)} size={size} style={style} />;
  return (
    <Text style={style} maxFontSizeMultiplier={1.2}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  number: { ...NUMBER_FONT, color: Nocturne.text, fontVariant: ['tabular-nums'] },
});
