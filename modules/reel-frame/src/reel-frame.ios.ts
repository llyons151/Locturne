import { requireOptionalNativeModule } from 'expo';

const ReelFrame = requireOptionalNativeModule<{ set?(on: boolean): void }>('ReelFrame');

/** Squeezes the app's window into a 9:16 box at the foot of the screen, or back. An older build without the module does nothing. */
export function setReelFrame(on: boolean): void {
  ReelFrame?.set?.(on);
}
