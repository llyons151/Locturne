import type { ViewProps } from 'react-native';

export type MoonOrbViewProps = ViewProps & {
  /** While true the orb brightens a little and its water moves faster. */
  pressed?: boolean;
  /** Hold the water still (Reduce Motion). */
  paused?: boolean;
  /** Four hex colours, dark to light, for the moon being worn; today's Moonwell colours when left out. */
  colors?: string[];
};
