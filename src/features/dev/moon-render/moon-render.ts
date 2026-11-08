import { useSyncExternalStore } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';

import { sharedGet, sharedSet } from '@/lib/screen-time';

import type { MoonDef } from '@/features/moons/moon-types';

/**
 * Dev test (user, 2026-11-07): the Blender moon renders (tools/moon-render) in place of today's moon
 * image, switchable from Developer → Moon, to judge them on a real phone. Only the Eclipse, Crescent
 * and Harvest Moon have renders; every other moon is unchanged. `frost` shows the render through the
 * sky's frosted glass (blurred like today's moons) instead of sharp. Images: tools/moon-render/app.py.
 */
export type MoonRenderStyle = 'current' | 'real' | 'soft' | 'porcelain';
export const MOON_RENDER_STYLES: { value: MoonRenderStyle; label: string }[] = [
  { value: 'current', label: 'Current' },
  { value: 'real', label: 'Realistic' },
  { value: 'soft', label: 'Soft' },
  { value: 'porcelain', label: 'Porcelain' },
];

type StyleSet = Record<Exclude<MoonRenderStyle, 'current'>, { sharp: ImageSourcePropType; frost: ImageSourcePropType }>;
const RENDERS: Record<string, StyleSet> = {
  eclipse: {
    real: { sharp: require('@/assets/moons/render-test/eclipse-real.webp'), frost: require('@/assets/moons/render-test/eclipse-real-frost.webp') },
    soft: { sharp: require('@/assets/moons/render-test/eclipse-soft.webp'), frost: require('@/assets/moons/render-test/eclipse-soft-frost.webp') },
    porcelain: { sharp: require('@/assets/moons/render-test/eclipse-porcelain.webp'), frost: require('@/assets/moons/render-test/eclipse-porcelain-frost.webp') },
  },
  crescent: {
    real: { sharp: require('@/assets/moons/render-test/crescent-real.webp'), frost: require('@/assets/moons/render-test/crescent-real-frost.webp') },
    soft: { sharp: require('@/assets/moons/render-test/crescent-soft.webp'), frost: require('@/assets/moons/render-test/crescent-soft-frost.webp') },
    porcelain: { sharp: require('@/assets/moons/render-test/crescent-porcelain.webp'), frost: require('@/assets/moons/render-test/crescent-porcelain-frost.webp') },
  },
  harvest: {
    real: { sharp: require('@/assets/moons/render-test/harvest-real.webp'), frost: require('@/assets/moons/render-test/harvest-real-frost.webp') },
    soft: { sharp: require('@/assets/moons/render-test/harvest-soft.webp'), frost: require('@/assets/moons/render-test/harvest-soft-frost.webp') },
    porcelain: { sharp: require('@/assets/moons/render-test/harvest-porcelain.webp'), frost: require('@/assets/moons/render-test/harvest-porcelain-frost.webp') },
  },
};
export const MOON_RENDER_IDS = Object.keys(RENDERS);

const KEY = 'locturne.dev.moon-render';
const labsOn = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';
type State = { style: MoonRenderStyle; frost: boolean };
let state: State | undefined;
const listeners = new Set<() => void>();

export function getMoonRender(): State {
  state ??= (labsOn && (webState() ?? sharedGet<State>(KEY))) || { style: 'current', frost: false };
  return state;
}

/** On the web, `?moonRender=soft&frost=1` starts with that render (for screenshots), like `?moon=`. */
function webState(): State | undefined {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return undefined;
  const q = new URLSearchParams(location.search);
  const style = q.get('moonRender') as MoonRenderStyle | null;
  return style && MOON_RENDER_STYLES.some((s) => s.value === style) ? { style, frost: q.get('frost') === '1' } : undefined;
}

export function setMoonRender(patch: Partial<State>) {
  state = { ...getMoonRender(), ...patch };
  sharedSet(KEY, state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

export function useMoonRender(): State {
  return useSyncExternalStore(subscribe, getMoonRender, getMoonRender);
}

const swapped = new Map<string, MoonDef>();
/** `moon` with the render test's image in place of its own (and no drawn eclipse ring: the render has its own lit rim). */
export function useMoonRenderFace(moon: MoonDef): MoonDef {
  const { style, frost } = useMoonRender();
  const set = RENDERS[moon.id];
  if (!labsOn || style === 'current' || !set) return moon;
  const key = `${moon.id}:${style}:${frost}`;
  let m = swapped.get(key);
  if (!m || m.sky !== moon.sky) {
    m = { ...moon, moon: frost ? set[style].frost : set[style].sharp, ring: undefined, ringLine: undefined };
    swapped.set(key, m);
  }
  return m;
}
