import type { Symbol } from '@/components/grouped-list';

/** Shared by `controls.tsx` (web preview) and `controls.ios.tsx` (iPhone). */

export type TimeRowProps = {
  /** Left out inside a `Card`, whose header carries the icon. */
  icon?: Symbol;
  title: string;
  value: number;
  onChange: (minutes: number) => void;
  presets: number[];
  /** Why a time can't be used, or null when it's fine. */
  invalid?: (minutes: number) => string | null;
  last?: boolean;
};

export type MenuOption<T extends string | number> = { value: T; label: string };

export type MenuRowProps<T extends string | number> = {
  /** Left out inside a `Card`, whose header carries the icon. */
  icon?: Symbol;
  title: string;
  value: T;
  options: MenuOption<T>[];
  onChange: (value: T) => void;
  last?: boolean;
};

export type NightsRowProps = {
  /** Left out inside a `Card`, whose header carries the icon. */
  icon?: Symbol;
  value: number[];
  onChange: (nights: number[]) => void;
  last?: boolean;
};

export function nightsLabel(nights: number[]) {
  if (nights.length === 7) return 'Every night';
  if (nights.length === 0) return 'Off';
  return `${nights.length} ${nights.length === 1 ? 'night' : 'nights'}`;
}

export type SwitchRowProps = {
  /** Left out inside a `Card`, whose header carries the icon. */
  icon?: Symbol;
  title: string;
  value: boolean;
  onChange: (on: boolean) => void;
  last?: boolean;
};
