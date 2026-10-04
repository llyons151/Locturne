/** Shared by `segmented.tsx` (web preview) and `segmented.ios.tsx` (iPhone). */

export type SegmentedProps<T extends string | number> = {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** What the choice is, for VoiceOver ("Nap length"). */
  label: string;
};
