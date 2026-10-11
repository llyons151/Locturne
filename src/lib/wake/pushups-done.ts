import { sharedGet, sharedSet } from '@/lib/screen-time';

import { repsDoneFor, type RepsDone } from './pushups';

const KEY = 'locturne.pushupsDone';

/** Push-ups done this morning so far, kept across closing the camera and relaunching. */
export const getRepsDone = (morning: string | undefined) => repsDoneFor(sharedGet<RepsDone>(KEY), morning);

export function saveRepsDone(morning: string, reps: number) {
  sharedSet(KEY, { morning, reps } satisfies RepsDone);
}
