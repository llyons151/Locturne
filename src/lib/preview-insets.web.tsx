import type { PropsWithChildren } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * Dev, browser only: an iPhone's safe areas inside a phone-sized frame (the device studio,
 * /device-studio), where the browser reports none. `?insets=59,34` (top,bottom) on any page the
 * frame opens; kept for the tab (sessionStorage), so the app's own navigation keeps them.
 */
const KEY = 'locturne.previewInsets';

function read(): { top: number; bottom: number } | null {
  if (typeof window === 'undefined' || window.parent === window) return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('insets');
    if (fromUrl) sessionStorage.setItem(KEY, fromUrl);
    const raw = fromUrl ?? sessionStorage.getItem(KEY);
    if (!raw) return null;
    const [top, bottom] = raw.split(',').map(Number);
    return Number.isFinite(top) && Number.isFinite(bottom) ? { top, bottom } : null;
  } catch {
    return null;
  }
}

// Once, as the frame loads: a frame is one phone for its whole life.
const insets = read();

export function PreviewInsets({ children }: PropsWithChildren) {
  if (!insets) return <>{children}</>;
  return <SafeAreaInsetsContext.Provider value={{ ...insets, left: 0, right: 0 }}>{children}</SafeAreaInsetsContext.Provider>;
}

