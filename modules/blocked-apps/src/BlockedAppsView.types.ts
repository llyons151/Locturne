import type { ColorValue, ViewProps } from 'react-native';

export type BlockedAppsViewProps = ViewProps & {
  /** The react-native-device-activity selection id to draw, e.g. "night". */
  selectionId: string;
  /** Change it to make the view re-read the selection (after the picker closes). */
  revision?: number;
  /** Compact Home preview: the first three picks as icons, without names. */
  iconsOnly?: boolean;
  rowHeight?: number;
  textColor?: ColorValue;
  separatorColor?: ColorValue;
  /** The Apps tab's rows: round icon and name (its kind under it unless a plain app), and any `trailing`. */
  detailed?: boolean;
  /** The grey kind line (shown for categories and websites) and trailing detail. */
  secondaryColor?: ColorValue;
  /** The round icon's diameter. */
  iconSize?: number;
  /** The right-hand column, the same on every row: the list's time ("11 pm", "30 min"). */
  trailing?: string;
  trailingDetail?: string;
  /** Swipe to delete (detailed rows only). Save it with `removePick` from `onRemove`. */
  removable?: boolean;
  /** iOS Edit mode: a red delete button on every row. */
  editing?: boolean;
  onRemove?: (event: { nativeEvent: RemovedPick }) => void;
};

/** A swiped-away pick: its kind and opaque token, for `removePick`. */
export type RemovedPick = { kind: 'app' | 'category' | 'site'; token: string };
