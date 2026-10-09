import type { ViewProps } from 'react-native';

export type MistDotViewProps = ViewProps & {
  /** Let the mist rest at the bottom and stop reading motion. Reduce Motion does this too. */
  paused?: boolean;
};
