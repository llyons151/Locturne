import type { MoonOrbViewProps } from './MoonOrbView.types';

export type { MoonOrbViewProps };

export const isMoonOrbViewAvailable = false;

/** The Metal orb is iOS-only; elsewhere the caller draws its SVG fallback. */
export function MoonOrbView(_props: MoonOrbViewProps) {
  return null;
}
