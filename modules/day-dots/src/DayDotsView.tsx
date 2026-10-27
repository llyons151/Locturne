import type { DayDotsViewProps } from './DayDotsView.types';

export type { DayDotsViewProps };

export const isDayDotsViewAvailable = false;

/** The Metal dots are iOS-only; elsewhere the caller draws its SVG dots. */
export function DayDotsView(_props: DayDotsViewProps) {
  return null;
}
