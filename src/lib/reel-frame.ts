import { setReelFrame } from 'reel-frame';

import { sharedGet, sharedSet } from '@/lib/screen-time';

/**
 * Reel frame (You → Developer, dev and preview builds only, user 2026-11-12): the app's window
 * squeezed into a 9:16 box at the foot of the screen (modules/reel-frame), so a screen recording
 * cropped to the box fills a Reel with nothing cut off. Kept across launches until switched off.
 */
const KEY = 'dev.reelFrame';
const labsOn = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';

export function getReelFrame(): boolean {
  return labsOn && sharedGet<boolean>(KEY) === true;
}

export function setReelFrameOn(on: boolean) {
  sharedSet(KEY, on);
  setReelFrame(labsOn && on);
}

/** At launch: puts the window back in the box if it was left on. */
export function applyReelFrame() {
  if (getReelFrame()) setReelFrame(true);
}
