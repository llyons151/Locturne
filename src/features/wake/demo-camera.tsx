import { useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scenePose, type DemoScene } from '@/lib/wake/pose-demo';

import type { PoseCameraError, PoseEvent } from '../../../modules/pose-camera';
import { FakeTag } from '../dev/wake-lab/fake-tag';

/** As often as the camera reads, about fifteen a second. */
const READ_MS = 66;

/**
 * The wake lab's stand-in for the camera (Push-up preview): a dark frame and a pretend body
 * playing `scene`, fed to `onPose` like the real camera. With `fail` it fails as it opens, as a
 * broken camera would. The same props as PoseCameraView, so the screen can't tell. Tagged FAKE
 * under the top bar, since this screen is a modal the app-wide FAKES badge can't sit over.
 */
export function DemoCamera({
  scene,
  fail,
  active,
  onPose,
  onCameraError,
  tagTop,
  style,
  ...props
}: ViewProps & {
  scene: DemoScene;
  fail?: PoseCameraError;
  active: boolean;
  onPose: (pose: PoseEvent) => void;
  onCameraError?: (reason: PoseCameraError) => void;
  /** Where the FAKE tag sits; under the top bar by default. */
  tagTop?: number;
}) {
  const insets = useSafeAreaInsets();
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
    >
      <FakeTag what={fail ? `camera · fails (${fail})` : `camera · drawn body (${scene})`} style={[styles.tag, { top: tagTop ?? insets.top + 48 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#0b0b0d' },
  tag: { position: 'absolute', alignSelf: 'center' },
});
