import type { ViewProps } from 'react-native';

import type { PoseFrame } from '../../../src/lib/wake/pushups';

export type PoseEvent = PoseFrame;

/** `denied`: camera access is off. `noCamera`: no front camera, or it wouldn't start. `model`: the web preview's pose model didn't load. */
export type PoseCameraError = 'denied' | 'noCamera' | 'model';

export type PoseCameraViewProps = ViewProps & {
  /** The camera runs only while true. */
  active: boolean;
  /** About fifteen times a second: the joints found, in this view's own points, y down. */
  onPose: (pose: PoseEvent) => void;
  onCameraError?: (reason: PoseCameraError) => void;
};
