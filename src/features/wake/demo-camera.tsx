import { useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { scenePose, type DemoScene } from '@/lib/wake/pose-demo';

import type { PoseCameraError, PoseEvent } from '../../../modules/pose-camera';

/** As often as the camera reads, about fifteen a second. */
const READ_MS = 66;

/**
 * The wake lab's stand-in for the camera (Push-up preview): a dark frame and a pretend body
 * playing `scene`, fed to `onPose` like the real camera. With `fail` it fails as it opens, as a
 * broken camera would. The same props as PoseCameraView, so the screen can't tell.
 */
export function DemoCamera({
  scene,
  fail,
  active,
  onPose,
  onCameraError,
  style,
  ...props
}: ViewProps & {
  scene: DemoScene;
  fail?: PoseCameraError;
  active: boolean;
  onPose: (pose: PoseEvent) => void;
  onCameraError?: (reason: PoseCameraError) => void;
}) {
  const size = useRef({ w: 0, h: 0 });
  const onPoseRef = useRef(onPose);
  const onErrorRef = useRef(onCameraError);
  useEffect(() => {
    onPoseRef.current = onPose;
    onErrorRef.current = onCameraError;
  }, [onPose, onCameraError]);

  useEffect(() => {
    if (!active) return;
    if (fail) {
      const t = setTimeout(() => onErrorRef.current?.(fail), 800);
      return () => clearTimeout(t);
    }
    const started = Date.now();
    const timer = setInterval(() => {
      const { w, h } = size.current;
      if (!w || !h) return;
      onPoseRef.current({ at: Date.now(), joints: scenePose(scene, Date.now() - started, w, h) });
    }, READ_MS);
    return () => clearInterval(timer);
  }, [active, scene, fail]);

  return (
    <View
      {...props}
      style={[styles.box, style]}
      onLayout={(e) => {
        size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
      }}
    />
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#0b0b0d' },
});
