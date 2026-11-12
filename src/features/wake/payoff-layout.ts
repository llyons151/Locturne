import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { getReelFrame } from '@/lib/reel-frame';

/**
 * Where the payoff's pieces rest, as nudges in points off the layout payoff-screen.tsx works out
 * (user, 2026-11-12: the Reel frame's 9:16 box threw the payoff's positions off; they're placed by
 * hand in the payoff studio, /payoff-studio, and the motion is built round where they land).
 * Two sets: `phone`, the whole screen, and `reel`, the Reel frame's box. Each piece moves on its
 * own: nudging the moon doesn't carry the time with it.
 */
export type PayoffLayout = {
  /** The risen moon's top, and its size (points added to its diameter). */
  moonY: number;
  moonSize: number;
  /** The time and "Morning N" under it. */
  timeY: number;
  /** The new moon's Apply pill. */
  applyY: number;
  /** "This week" and the dots. */
  weekY: number;
  /** Loc's speech bubble. */
  bubbleY: number;
  /** The panel's edge, Loc standing on it: up (negative) makes the black strip under it taller. */
  edgeY: number;
  /** Done and Share, inside the strip. */
  doneY: number;
};

export type PayoffBox = 'phone' | 'reel';

export const PAYOFF_LAYOUT_KEYS: (keyof PayoffLayout)[] = ['moonY', 'moonSize', 'timeY', 'applyY', 'weekY', 'bubbleY', 'edgeY', 'doneY'];

const ZERO: PayoffLayout = { moonY: 0, moonSize: 0, timeY: 0, applyY: 0, weekY: 0, bubbleY: 0, edgeY: 0, doneY: 0 };

/** Baked from the studio's export. */
export const PAYOFF_LAYOUT_DEFAULTS: Record<PayoffBox, PayoffLayout> = {
  phone: { ...ZERO },
  // Placed in the payoff studio (user, 2026-11-12): the moon up and bigger (187 points across on a
  // 430-wide phone), Apply a touch lower.
  reel: { ...ZERO, moonY: -13, moonSize: 15, applyY: 5 },
};

let layouts: Record<PayoffBox, PayoffLayout> = {
  phone: { ...PAYOFF_LAYOUT_DEFAULTS.phone },
  reel: { ...PAYOFF_LAYOUT_DEFAULTS.reel },
};
const listeners = new Set<() => void>();

/** The studio, live: the payoff redraws with it. */
export function setPayoffLayout(box: PayoffBox, next: PayoffLayout) {
  layouts = { ...layouts, [box]: { ...ZERO, ...next } };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Which set this screen is: on a phone the Reel frame's switch (an SE is 16:9 too, so not the
 * shape); in the browser the shape, the studio's box being 9:16.
 */
export function payoffBox(width: number, height: number): PayoffBox {
  if (Platform.OS === 'web') return height / width < 1.9 ? 'reel' : 'phone';
  return getReelFrame() ? 'reel' : 'phone';
}

export function usePayoffLayout(width: number, height: number): PayoffLayout {
  const all = useSyncExternalStore(subscribe, () => layouts);
  return all[payoffBox(width, height)];
}
