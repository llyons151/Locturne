import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { ViewProps } from 'react-native';

import type { PoseCameraError, PoseCameraViewProps, PoseEvent } from './PoseCameraView.types';

/**
 * False on a build made before this module existed: its JS loads over Metro, but the Swift
 * isn't in the binary until the next `eas build`.
 */
export const isPoseCameraAvailable =
  globalThis.expo?.getViewConfig?.('PoseCamera') != null || requireOptionalNativeModule('PoseCamera') != null;

type NativeProps = ViewProps & {
  active: boolean;
  onPose: (event: { nativeEvent: PoseEvent }) => void;
  onCameraError: (event: { nativeEvent: { reason: PoseCameraError } }) => void;
};

const NativeView = isPoseCameraAvailable ? requireNativeView<NativeProps>('PoseCamera') : null;

/** The front camera, filling the view, with Apple Vision's body pose (ios/PoseCameraModule.swift). */
export function PoseCameraView({ onPose, onCameraError, ...props }: PoseCameraViewProps) {
  if (!NativeView) return null;
  return (
    <NativeView
      {...props}
      onPose={(e) => onPose(e.nativeEvent)}
      onCameraError={(e) => onCameraError?.(e.nativeEvent.reason)}
    />
  );
}
