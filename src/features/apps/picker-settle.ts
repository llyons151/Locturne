/** Apple's picker writes about 100 ms after Done. Keep its draft reserved across screens. */
const settling = new Set<string>();
export const isPickerSettling = (list: string): boolean => settling.has(list);

export function settlePicker(list: string, save: () => void): void {
  if (settling.has(list)) return;
  settling.add(list);
  setTimeout(() => {
    try {
      save();
    } finally {
      settling.delete(list);
    }
  }, 500);
}
