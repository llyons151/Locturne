import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { readDiagnostics, type DiagnosticsSection } from './report';

/** The report's sections, re-read on every visit and on `refresh`. Empty while loading. */
export function useDiagnostics(): [DiagnosticsSection[], () => void] {
  const [sections, setSections] = useState<DiagnosticsSection[]>([]);
  const refresh = useCallback(() => {
    readDiagnostics()
      .then(setSections)
      .catch((error: unknown) =>
        setSections([
          { title: 'Error', rows: [['Reading failed', error instanceof Error ? error.message : String(error)]] },
        ]),
      );
  }, []);
  useFocusEffect(refresh);
  return [sections, refresh];
}
