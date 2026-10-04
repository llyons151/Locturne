import { Host } from '@expo/ui';
import { Button, Divider, Menu } from '@expo/ui/swift-ui';
import { accessibilityLabel, tint } from '@expo/ui/swift-ui/modifiers';

import { limitLabel } from '@/lib/daily-limits';
import { Nocturne } from '@/theme';

import type { LimitMenuProps } from './limit-menu-types';

/**
 * A daily limit's time as a system pull-down menu (HIG: Menus), with removing it set apart
 * at the bottom as a destructive item, like Screen Time's own App Limits.
 */
export function LimitMenu({ minutes, chosen, choices, onChange, onRemove }: LimitMenuProps) {
  return (
    <Host matchContents colorScheme="dark">
      <Menu label={limitLabel(minutes)} systemImage="chevron.up.chevron.down" modifiers={[tint(Nocturne.text2), accessibilityLabel(`Daily limit, ${limitLabel(minutes)}`)]}>
        {choices.map((m) => (
          <Button
            key={m}
            label={`${limitLabel(m)} a day`}
            systemImage={m === chosen ? 'checkmark' : undefined}
            onPress={() => onChange(m)}
          />
        ))}
        <Divider />
        <Button role="destructive" label="Remove limit" systemImage="trash" onPress={onRemove} />
      </Menu>
    </Host>
  );
}
