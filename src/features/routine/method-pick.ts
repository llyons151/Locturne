import { type Href } from 'expo-router';

import { getMorningPlace, getPlaceEditRefusal } from '@/lib/place';
import { type WakeMethod } from '@/lib/routine';
import { getScanCode, getScanEditRefusal } from '@/lib/scan';

import { applyRoutineEdit, getSetRoutine, refuseWhileAsleep } from './apply-edit';

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
  if (value === 'place' && current.method !== 'place' && !getMorningPlace() && !getPlaceEditRefusal())
    return { then: { pathname: '/place-pick', params: { select: '1' } } };
  if (current.method !== value) applyRoutineEdit({ ...current, method: value });
  if (value === 'scan' && current.method !== 'scan' && !getScanCode() && !getScanEditRefusal()) return { then: '/code' };
  return {};
}
