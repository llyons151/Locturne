import { useEffect, useState } from 'react';

import type { HomeContentProps } from './home-content';

/** Seconds: the old state fading out, then the new one fading in. */
export const SWAP_OUT = 0.18;
export const SWAP_IN = 0.35;

type Middle = Pick<HomeContentProps, 'hero' | 'heroKey' | 'meter' | 'icon' | 'searching' | 'action' | 'alt' | 'look'>;

/**
 * Which state Home's middle shows: the headline's words and the button, without numbers, so a
 * countdown ticking or steps climbing stay the same state and only a real change (Screen Time
 * turned on, bedtime starting) swaps.
 */
export function sceneKey({ hero, meter, icon, action, look }: Middle) {
  const words = `${look}|${hero.title}|${action?.label ?? ''}|${meter ? 'meter' : ''}|${icon?.ios ?? ''}`;
  return words.replace(/\d[\d:.,]*\s*(h|m)?\b/g, '').replace(/\s+/g, ' ');
}

/**
 * Home's middle across a change of state: the old one stays up while it fades out, then the
 * new one fades in (`visible`), rather than the words snapping into each other. Within a state
 * everything passes straight through.
 */
export function useHeroSwap<T extends Middle>(content: T, instant = false): { content: T; visible: boolean } {
  const key = sceneKey(content);
  // The last content of the state on screen: kept up to date within it, held while it fades out.
  const [shown, setShown] = useState({ key, content });
  // Catching up after the background (`useCatchingUp`, catch-up.ts): straight to the new state, no fade.
  const live = key === shown.key || instant;
  if (live && (shown.content !== content || shown.key !== key)) setShown({ key, content });

  useEffect(() => {
    if (live) return;
    const swap = setTimeout(() => setShown((s) => ({ key, content: s.content })), SWAP_OUT * 1000);
    return () => clearTimeout(swap);
  }, [live, key]);

  return live ? { content, visible: true } : { content: shown.content, visible: false };
}
