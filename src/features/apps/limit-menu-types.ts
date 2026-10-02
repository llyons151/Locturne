/** Shared by `limit-menu.tsx` (web preview) and `limit-menu.ios.tsx` (iPhone). */

export type LimitMenuProps = {
  /** The minutes shown on the button: the limit iOS enforces now. */
  minutes: number;
  /** The minutes the next tap would mark as current, including a waiting looser edit. */
  chosen: number | null;
  choices: number[];
  onChange: (minutes: number) => void;
  onRemove: () => void;
};
