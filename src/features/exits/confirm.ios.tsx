import { Host } from '@expo/ui';
import { Button, ConfirmationDialog, Text } from '@expo/ui/swift-ui';
import { accessibilityHidden, opacity } from '@expo/ui/swift-ui/modifiers';

import type { ConfirmProps } from './confirm-types';

/**
 * The system confirmation dialog (HIG: Action sheets): the destructive action in red and
 * the safe way back as Cancel, which iOS puts last and also gives to a tap outside.
 *
 * The dialog hangs off its `Trigger`: without one, @expo/ui attaches it to an EmptyView, which
 * SwiftUI never draws, so it never opened on iPhone and a pass couldn't be used (user,
 * 2026-10-16: "the unlock passes straight up do not work on mobile"). The trigger is an
 * invisible space, hidden from VoiceOver.
 */
export function Confirm({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, onDismiss }: ConfirmProps) {
  return (
    <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme="dark">
      <ConfirmationDialog
        title={title}
        titleVisibility="visible"
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}
      >
        <ConfirmationDialog.Trigger>
          <Text modifiers={[opacity(0), accessibilityHidden(true)]}>{' '}</Text>
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button role="destructive" label={confirmLabel} onPress={onConfirm} />
          <Button role="cancel" label={cancelLabel} onPress={onCancel} />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>{message}</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Host>
  );
}
