import { useSyncExternalStore } from 'react';

import { NAV_KNOCK, type NavKnockTune } from '@/features/home/nav-knock-tune';

/**
 * The knock lab (/knock-lab): a panel over the real Home for tuning live how the nav buttons
 * bounce as Loc burrows (nav-knock-tune.ts). Changes apply to the next burrow, are remembered in
 * this browser, and turn back into code to paste into nav-knock-tune.ts.
 */
const SHIPPED: NavKnockTune = { ...NAV_KNOCK };
// Versioned: bumped when the shipped tuning changes, so an old saved spin can't bring back the whirl.
const SAVED = 'locturne.knock-lab.tune.v3';
const labsOn = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';

export const KNOCK_PRESETS: Record<'Gentle' | 'Shipped' | 'Lively', NavKnockTune> = {
  Gentle: { ...SHIPPED, scurry: 1.4, bounce: 1, jiggle: 0.4, tempo: 2.4, sway: 0.6, squash: 0.5, blast: 0.7 },
  Shipped: SHIPPED,
  Lively: { ...SHIPPED, scurry: 2.6, width: 62, bounce: 2.6, jiggle: 0.75, tempo: 3.4, sway: 1.4, squash: 1.4, blast: 1.5 },
};

type Lab = { open: boolean; nonce: number; zoomNonce: number; tune: NavKnockTune };
let lab: Lab = { open: false, nonce: 0, zoomNonce: 0, tune: { ...NAV_KNOCK } };
const listeners = new Set<() => void>();
const set = (patch: Partial<Lab>) => {
  lab = { ...lab, ...patch };
  listeners.forEach((l) => l());
};

// Local storage is the browser's; the app has none, and a lab never needs it to work.
const storage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

if (labsOn) {
  try {
    const raw = storage()?.getItem(SAVED);
    if (raw) {
      // Saved before the zoomies were last retuned (slowed down: they looked like teleporting;
      // then cut short: he stayed under too long): keep the bounce settings, drop the old zoom ones.
      const saved = JSON.parse(raw) as Partial<NavKnockTune> & { zoomed?: number };
      if (saved.zoomed !== 3) for (const key of ['zoomAfter', 'zoomWindow', 'zoomSpeed', 'zoomLaps'] as const) delete saved[key];
      delete saved.zoomed;
      Object.assign(NAV_KNOCK, saved);
      lab = { ...lab, tune: { ...NAV_KNOCK } };
    }
  } catch {}
}

export function setKnockTune(patch: Partial<NavKnockTune>) {
  Object.assign(NAV_KNOCK, patch);
  set({ tune: { ...NAV_KNOCK } });
  try {
    storage()?.setItem(SAVED, JSON.stringify({ ...NAV_KNOCK, zoomed: 3 }));
  } catch {}
}

export function resetKnockTune(to: NavKnockTune = SHIPPED) {
  setKnockTune(to);
  if (to === SHIPPED) {
    try {
      storage()?.removeItem(SAVED);
    } catch {}
  }
}

export const openKnockLab = (open: boolean) => set({ open });
/** Sends Loc under the covers, as a double tap would. */
export const fireBurrow = () => set({ nonce: lab.nonce + 1 });
/** Sends him under with the zoomies, without the taps it takes. */
export const fireZoomies = () => set({ zoomNonce: lab.zoomNonce + 1 });

/** The tuning as code, for nav-knock-tune.ts. */
export function knockCode(t: NavKnockTune = lab.tune) {
  const n = (v: number) => Math.round(v * 1000) / 1000;
  return (
    'export const NAV_KNOCK = {\n' +
    `  scurry: ${n(t.scurry)}, reach: ${n(t.reach)}, width: ${n(t.width)}, bounce: ${n(t.bounce)}, jiggle: ${n(t.jiggle)}, tempo: ${n(t.tempo)}, sway: ${n(t.sway)}, spin: ${n(t.spin)},\n` +
    `  squash: ${n(t.squash)}, blast: ${n(t.blast)}, haptics: ${t.haptics}, zoomAfter: ${n(t.zoomAfter)}, zoomWindow: ${n(t.zoomWindow)}, zoomSpeed: ${n(t.zoomSpeed)}, zoomLaps: ${n(t.zoomLaps)},\n` +
    '};'
  );
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useKnockLab = () => useSyncExternalStore(subscribe, () => lab);
