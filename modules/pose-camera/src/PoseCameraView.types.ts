import type { ViewProps } from 'react-native';

import type { PoseFrame } from '../../../src/lib/wake/pushups';

export type PoseEvent = PoseFrame;

/**
 * `denied`: camera access is off. `restricted`: Screen Time or a profile keeps the camera off, which
 * Settings can't change. `noCamera`: no front camera, or it wouldn't start. `model`: the web
 * preview's pose model didn't load.
 */
export type PoseCameraError = 'denied' | 'restricted' | 'noCamera' | 'model';

export type PoseCameraViewProps = ViewProps & {
  /** The camera runs only while true. */
  active: boolean;
  /** About fifteen times a second: the joints found, in this view's own points, y down. */
  onPose: (pose: PoseEvent) => void;
  onCameraError?: (reason: PoseCameraError) => void;
};
