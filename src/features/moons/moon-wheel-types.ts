export type MoonWheelProps = {
  /** Each row: the moon's id and the words on the wheel. */
  rows: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
};
