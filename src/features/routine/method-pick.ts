import { type Href } from 'expo-router';

import { getBedEditRefusal, getBedPhoto } from '@/lib/bed-photo';
import { getMorningPlace, getPlaceEditRefusal } from '@/lib/place';
import { type WakeMethod } from '@/lib/routine';
import { getScanCode, getScanEditRefusal } from '@/lib/scan';

import { applyRoutineEdit, getSetRoutine, refuseWhileAsleep } from './apply-edit';
import { methodOffered } from './method-offered';

/**
 * Picks how you get up, from the grid of ways (method-picker, method-sheet). Saved at once, like
 * every awake routine edit, from the store rather than a render's copy, so an edit made just
 * before (the dial) is kept. Null when refused from bed (it says why). `then`: a screen to open
 * once the grid has closed: Scan with no code is picked and its code sheet opens; a place with
 * none saved opens the picker instead, which picks it once one is saved, so nobody ends up on a
 * place they don't have.
 */
export function pickMethod(value: WakeMethod): { then?: Href } | null {
  if (refuseWhileAsleep()) return null;
  const current = getSetRoutine();
  // A backstop for the grid's filter: a way this build's extensions don't know would wake on a walk.
  if (!methodOffered(value, current.method)) return {};
  if (value === 'place' && current.method !== 'place' && !getMorningPlace() && !getPlaceEditRefusal())
    return { then: { pathname: '/place-pick', params: { select: '1' } } };
  if (current.method !== value) applyRoutineEdit({ ...current, method: value });
  if (value === 'scan' && current.method !== 'scan' && !getScanCode() && !getScanEditRefusal()) return { then: '/code' };
  // Make your bed with no photo of it made yet: the setup camera, while it can be set (not from bed).
  if (value === 'bed' && current.method !== 'bed' && !getBedPhoto() && !getBedEditRefusal()) return { then: '/bed-setup' };
  return {};
}

/**
 * Where a tap on the way already picked goes (user 2026-11-03): its own settings, the same
 * screen as the row under the button on the Routine tab. Null for a way with nothing to set
 * , or one that can't be changed tonight; the grid then just closes.
 */
export function methodSettings(value: WakeMethod): Href | null {
  switch (value) {
    case 'steps':
      return '/steps';
    case 'pushups':
      return '/pushups';
    case 'dance':
      return '/dance';
    case 'pullups':
      return '/pullups';
    case 'bench':
      return '/bench';
    case 'downtime':
      return '/downtime';
    case 'scan':
      return getScanEditRefusal() ? null : '/code';
    case 'place':
      return getPlaceEditRefusal() ? null : '/place-pick';
    case 'bed':
      return getBedEditRefusal() ? null : '/bed-setup';
    default:
      return null;
  }
}
