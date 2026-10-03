/** Shared by `confirm.tsx` (web preview) and `confirm.ios.tsx` (iPhone). */
export type ConfirmProps = {
  open: boolean;
  title: string;
  message: string;
  /** The destructive action, e.g. "Unlock". */
  confirmLabel: string;
  /** The way back, e.g. "Go back to sleep". */
  cancelLabel: string;
  onConfirm: () => void;
  /** The cancel button. */
  onCancel: () => void;
  /** The dialog closed, by any route (after either button, or a tap outside). */
  onDismiss: () => void;
};
