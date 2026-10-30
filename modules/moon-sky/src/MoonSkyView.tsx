import type { MoonSkyViewProps } from './MoonSkyView.types';

export type { MoonSkyViewProps };

export const isMoonSkyViewAvailable = false;

/** The live sky is iOS-only; elsewhere the caller shows the baked sky image. */
export function MoonSkyView(_props: MoonSkyViewProps) {
  return null;
}
