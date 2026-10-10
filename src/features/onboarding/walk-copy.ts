/**
 * Which day the first locked morning falls on, and the `walk` step's words for it. Pure, so
 * the day logic and the copy are tested together (`walk-copy.test.ts`).
 */
import type { WakeMethod } from '../../lib/routine.ts';

export type WakeDay = 'This morning' | 'Later today' | 'Tomorrow';

/**
 * "This morning" when it's already the small hours; "Later today" for afternoon wake-ups.
 * Also today when the whole night is still ahead today (bedtime 01:00 finished at 00:30, or a
 * night shift's 08:00 bedtime finished at 07:00). Minutes since midnight throughout.
 */
export function wakeDayFor({
  bedtime,
  wake,
  now,
  lateNight,
}: {
  bedtime: number;
  wake: number;
  now: number;
  /** Onboarding finished inside the bedtime window (`isInsideBedtime`). */
  lateNight: boolean;
}): WakeDay {
  const today = wake > now && (lateNight || (bedtime < wake && now < bedtime));
  if (!today) return 'Tomorrow';
  return wake >= 12 * 60 ? 'Later today' : 'This morning';
}

/**
 * The `walk` step's words for the first morning's day (`WALK_GOAL` in content.ts). The step is
 * skipped late at night, so `day` is today only when the whole night is still ahead today
 * (00:30 before a 01:00 bedtime, 07:00 before a night shift's 08:00): "for now", not "tonight".
 */
export function walkCopy(method: WakeMethod, day: WakeDay): { intro: string; done: string } {
  const lead = day; // "Tomorrow", "This morning", "Later today"
  const now = day === 'Tomorrow' ? 'Tonight' : 'For now';
  const that = { Tomorrow: 'tomorrow morning', 'This morning': 'this morning', 'Later today': 'later today' }[day];
  const same = { Tomorrow: 'tomorrow', 'This morning': 'this morning', 'Later today': 'later today' }[day];
  switch (method) {
    case 'downstairs':
      return {
        intro: `${lead} it’s a trip downstairs. ${now}, 20 steps anywhere will do.`,
        done: `That’s ${that}, with real stairs instead of 20 steps. Then your apps wake up.`,
      };
    case 'steps':
      return {
        intro: `${lead} it’s 200 steps. ${now}, 20 will do. Walk around the room.`,
        done: `Same ${same}, just 200 instead of 20. Then your apps wake up.`,
      };
    case 'scan':
      return {
        intro: `${lead} you walk to your code. ${now}, 20 steps anywhere will do.`,
        done: `That’s ${that}: up, a short walk, then your apps wake up.`,
      };
    case 'place':
      return {
        intro: `${lead} you head out to your place. ${now}, 20 steps anywhere will do.`,
        done: `That’s ${that}: up, out the door, then your apps wake up.`,
      };
    case 'pushups':
      return {
        intro: `${lead} it’s ten push-ups on the floor. ${now}, 20 steps anywhere will do.`,
        done: `That’s ${that}: up, down on the floor, ten, then your apps wake up.`,
      };
  }
}
