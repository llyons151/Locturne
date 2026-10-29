export type PushupWheelProps = {
  value: number;
  onChange: (count: number) => void;
  /** The counts on offer, lowest first, evenly spaced: push-ups by default; the step target's for steps. */
  range?: { min: number; max: number; by: number };
  /** What it counts, for VoiceOver. */
  label?: string;
};
