import { StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { PUSHUPS, type Joint, type PoseFrame } from '@/lib/wake/pushups';

/** The lines drawn between joints: arms, torso, legs, and across the shoulders and hips. */
const BONES: [Joint, Joint][] = [
  ['leftShoulder', 'rightShoulder'],
  ['leftHip', 'rightHip'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

/**
 * What the camera sees of you, traced over the picture: thin white lines and dots, the same
 * white as the rest of the app. Full strength in a plank, faint otherwise, so you can tell when
 * he's counting without reading anything. No glow.
 */
export function PoseOverlay({ pose, counting }: { pose: PoseFrame | null; counting: boolean }) {
  if (!pose) return null;
  const seen = (j: Joint) => {
    const p = pose.joints[j];
    return p && p.c >= PUSHUPS.minConfidence ? p : null;
  };
  const opacity = counting ? 0.95 : 0.5;
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      {BONES.map(([a, b]) => {
        const p = seen(a);
        const q = seen(b);
        if (!p || !q) return null;
        return (
          <Line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#FFFFFF" strokeOpacity={opacity} strokeWidth={3} strokeLinecap="round" />
        );
      })}
      {/* The head: a ring round the nose. */}
      {seen('nose') ? (
        <Circle cx={seen('nose')!.x} cy={seen('nose')!.y} r={11} stroke="#FFFFFF" strokeOpacity={opacity} strokeWidth={3} fill="none" />
      ) : null}
      {Object.keys(pose.joints).map((j) => {
        const p = seen(j as Joint);
        if (!p || j === 'nose') return null;
        return <Circle key={j} cx={p.x} cy={p.y} r={4.5} fill="#FFFFFF" fillOpacity={opacity} />;
      })}
    </Svg>
  );
}
