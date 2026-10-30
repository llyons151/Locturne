import type { MoonRingViewProps } from './MoonRingView.types';

export type { MoonRingViewProps };

export const isMoonRingViewAvailable = false;

/** The native ring is iOS-only; elsewhere the caller draws its SVG and image fallback. */
export function MoonRingView(_props: MoonRingViewProps) {
  return null;
}
