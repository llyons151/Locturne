import { printAsync } from 'expo-print';
import { Platform } from 'react-native';

import { printableHtml } from './qr';

/**
 * The print dialog with the code's own sheet. Resolves once it closes, however it closed: true
 * unless it was cancelled (a browser can't tell, so there it's always true).
 */
export function printCode(data: string): Promise<boolean> {
  if (Platform.OS === 'web') return printOnWeb(printableHtml(data)).then(() => true);
  return printAsync({ html: printableHtml(data) }).then(
    () => true,
    () => false,
  );
}

/**
 * The web preview's print. expo-print's web side ignores the HTML and prints the whole window,
 * which printed the onboarding page around the code, so the sheet goes in a hidden frame and
 * that frame prints.
 */
function printOnWeb(html: string): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    // Out of sight but laid out: a frame that's display: none or hidden prints blank in some browsers.
    frame.style.cssText = 'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0;';
    frame.setAttribute('aria-hidden', 'true');
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      frame.remove();
      resolve();
    };
    frame.onload = () => {
      const page = frame.contentWindow;
      if (!page) return done();
      page.addEventListener('afterprint', done, { once: true });
      // Where print() doesn't block, the window gets its focus back when the dialog closes.
      window.addEventListener('focus', () => setTimeout(done, 0), { once: true });
      page.focus();
      page.print();
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
