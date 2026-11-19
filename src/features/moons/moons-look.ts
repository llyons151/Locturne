import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { sharedGet, sharedSet } from '@/lib/screen-time';

/**
 * Dev test (user, 2026-11-19): how the moons page lays out its moons, switchable from Developer →
 * Moons page. Sky cards is the default (user 2026-11-19). `gems`: the Sleep-button gems.
 * `picker`: small rounded squares in grouped boxes, like iOS's app-icon picker (draft 9 of
 * docs/moons-page-directions). `frosted`: tall tiles of each moon's sky, the name on top (draft 13).
 * `cards`: every moon as a tall card of its sky, swiped sideways one at a time (draft 5).
 * In the picker and frosted tiles the moon rises from the tile's bottom edge, cut off by it, as on Home.
 */
export type MoonsLook = 'gems' | 'picker' | 'frosted' | 'cards';
export const MOONS_LOOKS: { value: MoonsLook; label: string }[] = [
  { value: 'gems', label: 'Gems' },
  { value: 'picker', label: 'Picker' },
  { value: 'frosted', label: 'Frosted tiles' },
  { value: 'cards', label: 'Sky cards' },
];

const KEY = 'locturne.dev.moons-look';
const labsOn = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';
let look: MoonsLook | undefined;
const listeners = new Set<() => void>();

export function getMoonsLook(): MoonsLook {
  look ??= (labsOn && (webLook() ?? sharedGet<MoonsLook>(KEY))) || 'cards';
  return look;
}

/** On the web, `?moonsLook=frosted` starts on that look (for screenshots). */
function webLook(): MoonsLook | undefined {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return undefined;
  const v = new URLSearchParams(location.search).get('moonsLook') as MoonsLook | null;
  return v && MOONS_LOOKS.some((l) => l.value === v) ? v : undefined;
}

export function setMoonsLook(next: MoonsLook) {
  look = next;
  sharedSet(KEY, next);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export function useMoonsLook(): MoonsLook {
  return useSyncExternalStore(subscribe, getMoonsLook, getMoonsLook);
}
