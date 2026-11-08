import type { ViewProps } from 'react-native';

export type DanceRingViewProps = ViewProps & {
  /** The share of the goal still to dance, 0–1: the ring's length. */
  left: number;
  /** The seconds left, in the middle. */
  seconds: number;
  lineWidth: number;
  fontSize: number;
  /** How long a broken run takes to fill the ring back up. */
  refillMs: number;
};
