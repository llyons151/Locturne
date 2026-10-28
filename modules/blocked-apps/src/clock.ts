/** No time since boot to read off iPhone: the clock guard stays off. */
export function readDeviceClock(): { wall: number; monotonic: number } | null {
  return null;
}
