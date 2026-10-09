import type { MistDotViewProps } from './MistDotView.types';

export type { MistDotViewProps };

export const isMistDotViewAvailable = false;

/** The mist is iOS-only; elsewhere the caller draws its plain filled circle. */
export function MistDotView(_props: MistDotViewProps) {
  return null;
}
