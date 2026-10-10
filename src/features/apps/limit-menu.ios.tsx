import { Host } from '@expo/ui';
import {
  BottomSheet,
  Button,
  Group,
  HStack,
  NavigationStack,
  Picker,
  Text,
  Toolbar,
  ToolbarItem,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled,
  frame,
  labelsHidden,
  navigationTitle,
  pickerStyle,
  presentationDetents,
  presentationDragIndicator,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text as RNText } from '@/components/text';
import { LIMIT_MAX, limitLabel } from '@/lib/daily-limits';
import * as haptic from '@/lib/haptics';
import { Nocturne, Type } from '@/theme';

import type { LimitMenuProps } from './limit-menu-types';

const HOURS = Array.from({ length: Math.floor(LIMIT_MAX / 60) + 1 }, (_, h) => h);
const MINUTES = Array.from({ length: 60 }, (_, m) => m);

/**
 * A daily limit's time. A tap opens the hour and minute wheels straight away (user's ask,
 * 2026-10-09), as Screen Time sets an App Limit, in a system sheet with removing the limit
 * at the bottom. The time is only saved on Done, since a stricter one starts at once.
 * `choices` is the web preview's list (`limit-menu.tsx`); the wheels cover every time.
 */
export function LimitMenu({ minutes, chosen, onChange, onRemove }: LimitMenuProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ h: 0, m: 30 });
  const draftMinutes = Math.min(draft.h * 60 + draft.m, LIMIT_MAX);
  const show = () => {
    haptic.tap();
    const start = chosen ?? minutes;
    setDraft({ h: Math.floor(start / 60), m: start % 60 });
    setOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={show}
        accessibilityRole="button"
        accessibilityLabel={`Daily limit, ${limitLabel(minutes)}`}
        accessibilityHint="Opens an editor"
        hitSlop={8}
        style={({ pressed }) => [styles.value, pressed && styles.pressed]}
      >
        <RNText style={styles.valueText}>{limitLabel(minutes)}</RNText>
        <SymbolView name="chevron.up.chevron.down" size={12} weight="semibold" tintColor={Nocturne.text2} />
      </Pressable>
      <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme="dark">
        <BottomSheet isPresented={open} onIsPresentedChange={setOpen}>
          <Group modifiers={[presentationDetents(['medium']), presentationDragIndicator('visible')]}>
            <NavigationStack>
              <Toolbar>
                <VStack modifiers={[navigationTitle('Time per day')]}>
                  <HStack>
                    <Picker
                      selection={draft.h}
                      onSelectionChange={(h: number) => setDraft((d) => ({ ...d, h }))}
                      modifiers={[pickerStyle('wheel'), labelsHidden(), frame({ width: 140 }), accessibilityLabel('Hours')]}
                    >
                      {HOURS.map((h) => (
                        <Text key={h} modifiers={[tag(h)]}>
                          {h === 1 ? '1 hour' : `${h} hours`}
                        </Text>
                      ))}
                    </Picker>
                    <Picker
                      selection={draft.m}
                      onSelectionChange={(m: number) => setDraft((d) => ({ ...d, m }))}
                      modifiers={[pickerStyle('wheel'), labelsHidden(), frame({ width: 140 }), accessibilityLabel('Minutes')]}
                    >
                      {MINUTES.map((m) => (
                        <Text key={m} modifiers={[tag(m)]}>
                          {`${m} min`}
                        </Text>
                      ))}
                    </Picker>
                  </HStack>
                  <Button
                    role="destructive"
                    label="Remove limit"
                    systemImage="trash"
                    onPress={() => {
                      setOpen(false);
                      onRemove();
                    }}
                  />
                </VStack>
                <Toolbar.Content>
                  <ToolbarItem placement="cancellationAction">
                    <Button role="close" onPress={() => setOpen(false)} />
                  </ToolbarItem>
                  <ToolbarItem placement="confirmationAction">
                    <Button
                      label="Done"
                      modifiers={[disabled(draftMinutes === 0)]}
                      onPress={() => {
                        setOpen(false);
                        if (draftMinutes !== chosen) onChange(draftMinutes);
                      }}
                    />
                  </ToolbarItem>
                </Toolbar.Content>
              </Toolbar>
            </NavigationStack>
          </Group>
        </BottomSheet>
      </Host>
    </>
  );
}

const styles = StyleSheet.create({
  value: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueText: { ...Type.body, color: Nocturne.text2 },
  pressed: { opacity: 0.6 },
});
