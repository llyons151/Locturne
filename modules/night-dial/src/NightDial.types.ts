import type { StyleProp, ViewStyle } from 'react-native';

export type NativeNightDialProps = {
  /** Minutes after midnight. */
  bedtime: number;
  morningStart: number;
  /** "Every night", "Weeknights": under the length in the middle. */
  nightsLabel: string;
  /** Every night is off: the centre reads "Off". */
  off?: boolean;
  /** The shortest night a handle can make, in minutes. */
  minWindow?: number;
  bandColor?: string;
  trackColor?: string;
  /** The moon and sun inside the handles. */
  iconColor?: string;
  textColor?: string;
  text2Color?: string;
  text3Color?: string;
  /** Sent once a drag or VoiceOver step lands, never mid-drag. */
  onChange: (next: { bedtime: number; morningStart: number }) => void;
  style?: StyleProp<ViewStyle>;
};
