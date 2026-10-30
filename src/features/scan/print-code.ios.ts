import { printToFileAsync } from 'expo-print';
import { Share } from 'react-native';

import { printableHtml } from './qr';

/**
 * The code as a one-page PDF in the system share sheet, opened from a button rather than
 * `ShareCode`'s link (HIG: Activity views; the sheet offers Print, Files, AirDrop). Resolves
 * once the sheet closes, however it closed (a cancelled print still lets them scan): true when
 * something was picked (printed, saved, sent), so only then does it count as the code (`notePrinted`).
 */
export async function printCode(data: string): Promise<boolean> {
  try {
    const { uri } = await printToFileAsync({ html: printableHtml(data) });
    const { action } = await Share.share({ url: uri });
    return action === Share.sharedAction;
  } catch {
    return false;
  }
}
