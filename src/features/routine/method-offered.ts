import { type WakeMethod } from '@/lib/routine';

import { buildKnowsExercise } from '../../../modules/pose-camera';

/** The ways a JS update can't offer alone: their build has to know them. */
const NEEDS_BUILD: readonly WakeMethod[] = ['pullups', 'bench', 'grass', 'sun', 'pet', 'bed'];

/**
 * Is this way offered in the grid on this build? Pull-ups and the bench press (2026-11-21) need the build
 * whose shield and monitor extensions know them: on an older one, the extensions would take them
 * for a walk and let 200 steps wake the apps (`locturneMotionProof`). A JS update alone mustn't
 * offer them. Touch grass and Sunlight (2026-11-21) also need the PhotoCheck module that build brings.
 * The way already saved always shows, so it can be seen and changed.
 */
export const methodOffered = (method: WakeMethod, saved: WakeMethod) =>
  method === saved || !NEEDS_BUILD.includes(method) || buildKnowsExercise(method);
