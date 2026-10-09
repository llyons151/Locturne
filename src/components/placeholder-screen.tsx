import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '@/components/text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Nocturne, Space, Type } from '@/theme';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

/** Stand-in for a tab that isn't built yet. */
export function PlaceholderScreen({ title, description, children }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.s,
    paddingHorizontal: Space.xl,
  },
  title: { color: Nocturne.text, ...Type.title },
  description: { color: Nocturne.text2, ...Type.body, textAlign: 'center' },
});
