import type { PropsWithChildren } from 'react';

/** On a phone the real safe areas stand (preview-insets.web.tsx is the browser's). */
export function PreviewInsets({ children }: PropsWithChildren) {
  return <>{children}</>;
}

