import { requireOptionalNativeModule } from 'expo';

export type TrackingEngine = 'mediapipe' | 'vision';

type Tracking = {
  trackingEngine?: () => string;
  setTrackingEngine?: (engine: TrackingEngine) => boolean;
};
const Native = requireOptionalNativeModule<Tracking>('PoseCamera');

/** Older builds cannot switch engines; don't show a working switch on those builds. */
export const canChooseTrackingEngine =
  typeof Native?.trackingEngine === 'function' && typeof Native?.setTrackingEngine === 'function';

export function getTrackingEngine(): TrackingEngine {
  try {
    return Native?.trackingEngine?.() === 'vision' ? 'vision' : 'mediapipe';
  } catch {
    return 'mediapipe';
  }
}

/** Saved natively, read once when the next camera view starts. */
export function setTrackingEngine(engine: TrackingEngine): boolean {
  try {
    return Native?.setTrackingEngine?.(engine) === true;
  } catch {
    return false;
  }
}
