/** Shared by `length-picker.tsx` (web preview) and `length-picker.ios.tsx` (iPhone). */

export type LengthPickerProps = {
  value: number;
  options: number[];
  onChange: (minutes: number) => void;
};

/** 15 → "15 min", 60 → "1 hr". */
export const lengthLabel = (minutes: number) => (minutes % 60 === 0 ? `${minutes / 60} hr` : `${minutes} min`);
