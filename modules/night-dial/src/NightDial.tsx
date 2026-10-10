import type { NativeNightDialProps } from './NightDial.types';

export type { NativeNightDialProps };

export const NIGHT_DIAL_ROW = 72;

/** The Swift dial is iOS-only; `NightDial` in the Routine feature draws its own elsewhere. */
export const isNightDialAvailable = false;

export function NativeNightDial(_: NativeNightDialProps) {
  return null;
}
