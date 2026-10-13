import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';

/** Dev only: the amber marking on everything the wake preview made up, so a fake is never mistaken for the app. */
export const FAKE_COLOR = '#f5b942';

/** A small "FAKE · what" tag, for the corner of a fake view. Never ships: only fakes render it. */
export function FakeTag({ what, style }: { what: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tag, style]} pointerEvents="none">
      <Text style={styles.text}>FAKE · {what}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: FAKE_COLOR,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  text: { color: FAKE_COLOR, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8 },
});
