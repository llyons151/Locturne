/** Shared by `limit-wheel.tsx` (web preview) and `limit-wheel.ios.tsx` (iPhone). */
export type LimitWheelProps = {
  /** Minutes. */
  value: number;
  onChange: (minutes: number) => void;
};
