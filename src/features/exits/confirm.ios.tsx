import { Host } from '@expo/ui';
import { Button, ConfirmationDialog, Text } from '@expo/ui/swift-ui';

import type { ConfirmProps } from './confirm-types';

/**
 * The system confirmation dialog (HIG: Action sheets): the destructive action in red and
 * the safe way back as Cancel, which iOS puts last and also gives to a tap outside.
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
