import type { ViewProps } from 'react-native';

import type { PhoneTurn } from '../../../src/lib/wake/phone-hint';
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
  /**
   * Which way the phone stands. Vision reads the picture turned this way up, and the joints come
   * back in the points of the screen turned to match: a sideways phone's are in a box as wide as
   * the view is tall. Upright by default.
   */
  turn?: PhoneTurn;
  /** The accelerometer says upright right now: when the iPhone learns which way its front camera sits. */
  upright?: boolean;
  /** About fifteen times a second: the joints found, in this view's own points, y down. */
  onPose: (pose: PoseEvent) => void;
  onCameraError?: (reason: PoseCameraError) => void;
};
