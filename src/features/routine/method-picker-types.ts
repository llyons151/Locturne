import { type WakeMethod } from '@/lib/routine';

import { type MethodOption } from './method-options';

export type MethodPickerProps = {
  /** Every way to get up, in order. */
  options: MethodOption[];
  /** The way picked. */
  selected: WakeMethod;
  /** The line under its name ("Not set up yet…" when it walks for now). */
  detail: string;
  /** A hairline under the button, when a setup row follows it in the card. */
  separator: boolean;
  /** After a pick is saved: the screen reloads the routine. */
  onPicked: () => void;
};
