import { printAsync } from 'expo-print';

import { printableHtml } from './qr';

/** The web preview's print: the browser's print dialog. Resolves once it closes, however it closed. */
export function printCode(data: string): Promise<void> {
  return printAsync({ html: printableHtml(data) }).catch(() => {});
}
