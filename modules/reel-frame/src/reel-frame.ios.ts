import { requireOptionalNativeModule } from 'expo';

const ReelFrame = requireOptionalNativeModule<{ set?(on: boolean): void; measure?(): Promise<string> }>('ReelFrame');

/** Squeezes the app's window into a 9:16 box at the foot of the screen, or back. An older build without the module does nothing. */
export function setReelFrame(on: boolean): void {
  ReelFrame?.set?.(on);
}

/** Dev readout: the window's, root's and Screen Time report's frames and safe areas, one per line. */
export async function measureReelFrame(): Promise<string | null> {
  return (await ReelFrame?.measure?.()) ?? null;
}
