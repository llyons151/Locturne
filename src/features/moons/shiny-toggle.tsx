import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/text';
import { Nocturne, Space } from '@/theme';

/** The shiny toggle under a moon's card (shiny.ts); the iPhone build uses the system switch. Not designed yet. */
export function ShinyToggle({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Shiny</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel="Shiny"
        trackColor={{ false: Nocturne.raised, true: Nocturne.text2 }}
        thumbColor={Nocturne.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.m },
  label: { fontSize: 15, fontWeight: '600', color: Nocturne.text },
});
