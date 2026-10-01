import { usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Nocturne } from '@/constants/nocturne';
import { NightSky } from '@/features/onboarding/night-sky';

/**
 * The app sits under the same sky and moon as onboarding, with the moon settled. On the
 * home screen the moon rises into full view, and sinks back when another tab opens.
 */
export function AppBackground({ children }: PropsWithChildren) {
  const pathname = usePathname();
  return (
    <View style={styles.container}>
      <NightSky home={pathname === '/'} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Nocturne.bg },
});
