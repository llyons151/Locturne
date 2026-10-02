import type { ColorValue, ViewProps } from 'react-native';

export type BlockedAppsViewProps = ViewProps & {
  /** The react-native-device-activity selection id to draw, e.g. "night". */
  selectionId: string;
  /** Change it to make the view re-read the selection (after the picker closes). */
  revision?: number;
  rowHeight?: number;
  textColor?: ColorValue;
  separatorColor?: ColorValue;
};
