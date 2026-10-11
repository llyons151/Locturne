import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { demoPose } from '../../../src/lib/wake/pose-demo';
import type { Joint, JointPoint } from '../../../src/lib/wake/pushups';

import type { PoseCameraViewProps } from './PoseCameraView.types';

/** On web there's always something to show: the webcam, or the demo body. */
export const isPoseCameraAvailable = true;

/**
 * MediaPipe's pose model, loaded from the CDN at runtime so it's never in the app's bundle:
 * this is the web preview's stand-in for Apple Vision, so the screen can be tried on a laptop
 * webcam before an iPhone build. Same joints, same view points, same rules.
 */
const TASKS = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** MediaPipe's 33 landmarks: the ones the rules read. */
const LANDMARKS: [number, Joint][] = [
  [0, 'nose'],
  [11, 'leftShoulder'],
  [12, 'rightShoulder'],
  [13, 'leftElbow'],
  [14, 'rightElbow'],
  [15, 'leftWrist'],
  [16, 'rightWrist'],
  [23, 'leftHip'],
  [24, 'rightHip'],
  [25, 'leftKnee'],
  [26, 'rightKnee'],
  [27, 'leftAnkle'],
  [28, 'rightAnkle'],
];

const READ_MS = 66;

type Landmark = { x: number; y: number; visibility?: number };
type Landmarker = {
  detectForVideo: (video: HTMLVideoElement, at: number) => { landmarks: Landmark[][] };
  close: () => void;
};

// Hidden from Metro, which would otherwise try to bundle the URL.
const importUrl = new Function('url', 'return import(url)') as (url: string) => Promise<any>;

let model: Promise<Landmarker> | null = null;
function loadModel(): Promise<Landmarker> {
  model ??= importUrl(`${TASKS}/vision_bundle.mjs`)
    .then(async ({ FilesetResolver, PoseLandmarker }) => {
      const files = await FilesetResolver.forVisionTasks(`${TASKS}/wasm`);
      const make = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        }) as Promise<Landmarker>;
      // The GPU is quicker, but some browsers (and headless ones) can't give it one.
      return make('GPU').catch(() => make('CPU'));
    })
    .catch((error) => {
      model = null;
      throw error;
    });
  return model;
}

/**
 * `?demo=1` in the address (or `window.__poseDemo = true`, which survives in-app navigation):
 * the pretend body instead of the webcam, with no camera or for screenshots.
 */
const wantsDemo = () =>
  typeof location !== 'undefined' &&
  (new URLSearchParams(location.search).has('demo') || (globalThis as { __poseDemo?: boolean }).__poseDemo === true);

/**
 * The web preview's camera: the laptop's webcam, mirrored and filling the view like the iPhone's
 * front camera, read by MediaPipe. With `?demo=1` it's a dark frame and the demo body instead.
 */
export function PoseCameraView({ active, onPose, onCameraError, style, ...props }: PoseCameraViewProps) {
  const box = useRef<View>(null);
  const video = useRef<HTMLVideoElement>(null);
  const onPoseRef = useRef(onPose);
  const onErrorRef = useRef(onCameraError);
  useEffect(() => {
    onPoseRef.current = onPose;
    onErrorRef.current = onCameraError;
  }, [onPose, onCameraError]);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const size = () => {
      const el = box.current as unknown as HTMLElement | null;
      return { w: el?.clientWidth ?? 0, h: el?.clientHeight ?? 0 };
    };

    if (wantsDemo()) {
      const started = performance.now();
      timer = setInterval(() => {
        const { w, h } = size();
        const ms = performance.now() - started;
        // A beat of nobody first, like stepping back from the phone.
        onPoseRef.current({ at: Date.now(), joints: ms < 1500 ? {} : demoPose(ms - 1500, w, h) });
      }, READ_MS);
      return () => clearInterval(timer);
    }

    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false });
      } catch (error) {
        if (!stopped) onErrorRef.current?.((error as DOMException)?.name === 'NotAllowedError' ? 'denied' : 'noCamera');
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const el = video.current;
      if (!el) return;
      el.srcObject = stream;
      await el.play().catch(() => {});
      let landmarker: Landmarker;
      try {
        landmarker = await loadModel();
      } catch {
        if (!stopped) onErrorRef.current?.('model');
        return;
      }
      if (stopped) return;
      timer = setInterval(() => {
        if (el.readyState < 2 || !el.videoWidth) return;
        const found = landmarker.detectForVideo(el, performance.now()).landmarks[0];
        const { w, h } = size();
        // Cover, then mirrored, as the video is drawn.
        const scale = Math.max(w / el.videoWidth, h / el.videoHeight);
        const dx = (w - el.videoWidth * scale) / 2;
        const dy = (h - el.videoHeight * scale) / 2;
        const joints: Partial<Record<Joint, JointPoint>> = {};
        if (found)
          for (const [i, name] of LANDMARKS) {
            const l = found[i];
            if (!l) continue;
            joints[name] = { x: w - (l.x * el.videoWidth * scale + dx), y: l.y * el.videoHeight * scale + dy, c: l.visibility ?? 0.5 };
          }
        onPoseRef.current({ at: Date.now(), joints });
      }, READ_MS);
    })();

    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  return (
    <View ref={box} style={[styles.box, style]} {...props}>
      {wantsDemo() ? null : (
        <video ref={video} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#000000', overflow: 'hidden' },
});
