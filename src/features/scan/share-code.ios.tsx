import { Host } from '@expo/ui';
import { ShareLink, Text } from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { printToFileAsync } from 'expo-print';
import { useEffect, useState } from 'react';

import { Nocturne } from '@/theme';

import { printableHtml } from './qr';
import type { ShareCodeProps } from './share-code-types';

/**
 * The system share sheet with the code as a one-page PDF (HIG: Activity views). The sheet
 * already offers Print, Save to Files, AirDrop and Messages, so one control covers printing
 * at home and sending it to a computer.
 */
export function ShareCode({ data }: ShareCodeProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    printToFileAsync({ html: printableHtml(data) })
      .then((file) => {
        if (live) setUri(file.uri);
      })
      .catch(() => {
        if (live) setUri(null);
      });
    return () => {
      live = false;
    };
  }, [data]);

  if (!uri) return null;
  return (
    <Host matchContents colorScheme="dark" style={{ alignSelf: 'center' }}>
      <ShareLink item={uri} subject="Locturne wake-up code">
        <Text modifiers={[foregroundStyle(Nocturne.text2)]}>Print or share it</Text>
      </ShareLink>
    </Host>
  );
}
