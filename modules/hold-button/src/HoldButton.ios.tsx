import { requireNativeView, requireOptionalNativeModule } from 'expo';

import type { HoldButtonProps } from './HoldButton.types';
import { HoldButtonFallback } from './HoldButtonFallback';

export type { HoldButtonProps };

/**
 * False on a development build made before this module existed: its JS loads over Metro,
 * but the Swift isn't in the binary until the next `eas build`.
 */
export const isHoldButtonAvailable =
  globalThis.expo?.getViewConfig?.('HoldButton') != null || requireOptionalNativeModule('HoldButton') != null;

type NativeProps = Omit<HoldButtonProps, 'onComplete'> & { onComplete: () => void };
const NativeView = isHoldButtonAvailable ? requireNativeView<NativeProps>('HoldButton') : null;

export function HoldButton(props: HoldButtonProps) {
  if (!NativeView) return <HoldButtonFallback {...props} />;
  const { onComplete, ...rest } = props;
  return <NativeView {...rest} onComplete={() => onComplete()} />;
}
