import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Nocturne } from '@/theme';

/** The preview is phone frames of the web build (pushups-preview.web.tsx): browser only. */
export function PushupsPreviewWall() {
  return (
    <View style={styles.screen}>
      <Text style={styles.note}>The push-ups preview runs in a browser: npm run pushups-preview, open localhost:8083/pushups-preview.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Nocturne.bg },
  note: { textAlign: 'center' },
});
