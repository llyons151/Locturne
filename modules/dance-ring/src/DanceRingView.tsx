import type { DanceRingViewProps } from './DanceRingView.types';

export type { DanceRingViewProps };

export const isDanceRingViewAvailable = false;

/** The SwiftUI ring is iOS-only; elsewhere the caller draws its SVG ring. */
export function DanceRingView(_props: DanceRingViewProps) {
  return null;
}
