import { useEffect, useRef, useState } from 'react';

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
  // A number goes with its unit (2h, 990 m, 1.2 km) and the word after it loses its plural ("1 more
  // second" and "2 more seconds" are one state), so crossing 1 km or a count ticking down doesn't swap.
  return words
    .replace(/\d[\d:.,]*(?:\s*(?:km|mi|ft|min|h|m)\b)?((?:\s+more)?\s+[a-z-]+?)?s?\b/g, (_, word: string | undefined) => word ?? '')
    .replace(/\s+/g, ' ');
}

/**
 * Home's middle across a change of state: the old one stays up while it fades out, then the
 * new one fades in (`visible`), rather than the words snapping into each other. Within a state
 * everything passes straight through.
 */
export function useHeroSwap<T extends Middle>(content: T, instant = false): { content: T; visible: boolean } {
  // Reads a ref during render (the held content), which the compiler can't memoise around.
  'use no memo';
  const key = sceneKey(content);
  // The state on screen, by key only. Home's props are a new object every render, so keeping
  // them in state set it during every render, and React threw each first pass of HomeContent
  // away and rendered it again.
  const [shownKey, setShownKey] = useState(key);
  // Catching up after the background (`useCatchingUp`, catch-up.ts): straight to the new state, no fade.
  const live = key === shownKey || instant;
  if (live && shownKey !== key) setShownKey(key);
  // The last content of the state on screen, as committed: held while it fades out.
  const last = useRef(content);
  useEffect(() => {
    if (live) last.current = content;
  });

  useEffect(() => {
    if (live) return;
    const swap = setTimeout(() => setShownKey(key), SWAP_OUT * 1000);
    return () => clearTimeout(swap);
  }, [live, key]);

  // eslint-disable-next-line react-hooks/refs -- the old state must keep its last props while it fades out
  return live ? { content, visible: true } : { content: last.current, visible: false };
}
