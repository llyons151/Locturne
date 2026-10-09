import type { StyleProp, ViewStyle } from 'react-native';

export type HoldButtonProps = {
  label: string;
  /** An SF Symbol shown before the label. */
  symbol?: string;
  /** How long the hold takes, in milliseconds. */
  duration?: number;
  disabled?: boolean;
  /** The pill. */
  color?: string;
  /** What fills it while held. */
  fillColor?: string;
  textColor?: string;
  /** The label where the fill has passed. */
  filledTextColor?: string;
  onComplete: () => void;
  style?: StyleProp<ViewStyle>;
};
