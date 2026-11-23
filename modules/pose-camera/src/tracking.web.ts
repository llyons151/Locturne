export type TrackingEngine = 'mediapipe' | 'vision';

/** Browser tracking uses MediaPipe; Apple Vision is available only on iPhone. */
export const canChooseTrackingEngine = false;
export const getTrackingEngine = (): TrackingEngine => 'mediapipe';
export const setTrackingEngine = (_engine: TrackingEngine): boolean => false;
