import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ChoiceRow, EditSheet, Section } from '@/components/grouped-list';
import { limitLabel } from '@/lib/daily-limits';
import * as haptic from '@/lib/haptics';
import { Nocturne, Type } from '@/theme';

import type { LimitMenuProps } from './limit-menu-types';

/**
 * A daily limit's time. On iPhone (`limit-menu.ios.tsx`) it's a system pull-down menu; this
 * is the web preview's stand-in.
 */
export function LimitMenu({ minutes, chosen, choices, onChange, onRemove }: LimitMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Pressable
        onPress={() => {
          haptic.tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Daily limit, ${limitLabel(minutes)}`}
        hitSlop={8}
      >
        <Text style={styles.value}>{limitLabel(minutes)}</Text>
      </Pressable>
      <EditSheet open={open} title="Daily limit" onCancel={close} onDone={close}>
        <Section>
          {choices.map((m) => (
            <ChoiceRow
              key={m}
              title={`${limitLabel(m)} a day`}
              selected={m === chosen}
              onPress={() => {
                onChange(m);
                close();
              }}
            />
          ))}
          <Pressable
            onPress={() => {
              haptic.tap();
              onRemove();
              close();
            }}
            accessibilityRole="button"
            style={styles.remove}
          >
            <Text style={styles.removeText}>Remove limit</Text>
          </Pressable>
        </Section>
      </EditSheet>
    </>
  );
}

const styles = StyleSheet.create({
  value: { ...Type.body, color: Nocturne.text2 },
  remove: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
  // iOS's dark-mode system red, as on a destructive menu item.
  removeText: { ...Type.body, color: '#FF453A' },
});
