import { printToFileAsync } from 'expo-print';
import { Share } from 'react-native';

import { printableHtml } from './qr';

/**
 * The code as a one-page PDF in the system share sheet, opened from a button rather than
 * `ShareCode`'s link (HIG: Activity views; the sheet offers Print, Files, AirDrop). Resolves
 * once the sheet closes, however it closed: a cancelled print still lets them scan.
 */
export async function printCode(data: string): Promise<void> {
  try {
    const { uri } = await printToFileAsync({ html: printableHtml(data) });
    await Share.share({ url: uri });
  } catch {}
}
