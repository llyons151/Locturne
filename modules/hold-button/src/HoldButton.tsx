import type { HoldButtonProps } from './HoldButton.types';
import { HoldButtonFallback } from './HoldButtonFallback';

export type { HoldButtonProps };

export const isHoldButtonAvailable = false;

/** The Swift button is iOS-only. */
export function HoldButton(props: HoldButtonProps) {
  return <HoldButtonFallback {...props} />;
}
