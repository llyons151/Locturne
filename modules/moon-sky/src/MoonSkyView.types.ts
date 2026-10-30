import type { ViewProps } from 'react-native';

export type MoonSkyViewProps = ViewProps & {
  /** The sky's four colours, dark to light, as hex: the worn moon's (features/moons). */
  colors: string[];
  /** Where the sky's 16-bit brightness map (assets/moons/sky-luma.png) is: `Image.resolveAssetSource(...).uri`. */
  texture: string;
  /** Hold the sky still (Reduce Motion). */
  paused?: boolean;
};
