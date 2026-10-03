import { useEffect } from 'react';

import type { ConfirmProps } from './confirm-types';

/**
 * The web preview's stand-in for the iPhone's confirmation dialog: the browser's own
 * confirm box, which can't render SwiftUI either.
 */
export function Confirm({ open, title, message, onConfirm, onCancel, onDismiss }: ConfirmProps) {
  useEffect(() => {
    if (!open) return;
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
    else onCancel();
    onDismiss();
  }, [open, title, message, onConfirm, onCancel, onDismiss]);
  return null;
}
