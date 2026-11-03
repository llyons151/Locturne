/** No Live Activities off iPhone. */
export function syncNapActivity(_nap: { start: number; end: number } | null): boolean {
  return false;
}
