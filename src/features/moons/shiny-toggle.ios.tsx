import { Host } from '@expo/ui';
import { Toggle } from '@expo/ui/swift-ui';
import { accessibilityLabel, frame, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Nocturne, Space } from '@/theme';

/** The shiny toggle under a moon's card (shiny.ts): the system switch, beside "Shiny". Not designed yet. */
export function ShinyToggle({ value, onChange }: { value: boolean; onChange: (on: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Shiny</Text>
      <Host matchContents colorScheme="dark">
        <Toggle isOn={value} onIsOnChange={onChange} modifiers={[labelsHidden(), accessibilityLabel('Shiny'), frame({ maxHeight: 10_000 })]} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.m },
  label: { fontSize: 15, fontWeight: '600', color: Nocturne.text },
});
