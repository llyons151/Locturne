import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Nocturne } from '@/theme';

/** The preview is phone frames of the web build (onboarding-preview.web.tsx): browser only. */
export function OnboardingPreview() {
  return (
    <View style={styles.screen}>
      <Text style={styles.note}>The onboarding preview runs in a browser: npm run onboarding-preview, open localhost:8082/onboarding-preview.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Nocturne.bg },
  note: { textAlign: 'center' },
});
