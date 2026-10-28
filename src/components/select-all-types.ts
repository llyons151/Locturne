/** Shared by `select-all-button.tsx` (web preview) and `select-all-button.ios.tsx` (iPhone). */
export type SelectAllButtonProps = {
  /** Every day is picked: the button clears them instead. */
  all: boolean;
  onPress: () => void;
};
