import { printAsync } from 'expo-print';

import { TextButton } from '@/components/buttons';

import { printableHtml } from './qr';
import type { ShareCodeProps } from './share-code-types';

/** The web preview's stand-in for the iPhone share sheet: the browser's print dialog. */
export function ShareCode({ data }: ShareCodeProps) {
  return <TextButton label="Print it" onPress={() => printAsync({ html: printableHtml(data) }).catch(() => {})} />;
}
