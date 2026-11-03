/** No Live Activities off iPhone. */
export function syncNapActivity(_nap: { start: number; end: number } | null, _moonFile: string | null): boolean {
  return false;
}
