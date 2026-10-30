import type { ViewProps } from 'react-native';

export type MoonSkyViewProps = ViewProps & {
  /** The sky's four colours, dark to light, as hex: the worn moon's (features/moons). */
  colors: string[];
  /** The resting moon the light gathers round, in the view's points: [centre x, centre y, radius]. */
  anchor: number[];
  /** Hold the sky still (Reduce Motion). */
  paused?: boolean;
};
