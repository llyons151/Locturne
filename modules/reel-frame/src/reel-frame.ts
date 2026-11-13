/** Only iPhone's window can be squeezed into the 9:16 recording box: nothing happens elsewhere. */
export function setReelFrame(_on: boolean): void {}

/** Only iPhone has a window to measure. */
export async function measureReelFrame(): Promise<string | null> {
  return null;
}
