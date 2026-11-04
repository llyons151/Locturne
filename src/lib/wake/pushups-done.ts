import { sharedGet, sharedSet } from '@/lib/screen-time';

import { repsDoneFor, type Exercise, type RepsDone } from './pushups';

/** Each exercise keeps its own count: switching from push-ups to squats mid-morning starts squats at 0. */
const KEY: Record<Exercise, string> = { pushups: 'locturne.pushupsDone', squats: 'locturne.squatsDone' };

/** Push-ups (or squats) done this morning so far, kept across closing the camera and relaunching. */
export const getRepsDone = (morning: string | undefined, exercise: Exercise = 'pushups') =>
  repsDoneFor(sharedGet<RepsDone>(KEY[exercise]), morning);

export function saveRepsDone(morning: string, reps: number, exercise: Exercise = 'pushups') {
  sharedSet(KEY[exercise], { morning, reps } satisfies RepsDone);
}
