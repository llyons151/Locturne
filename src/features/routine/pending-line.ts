import { inPendingFirstNight, routineAt } from '../../lib/lock-controller.ts';
import { nightsAround } from '../../lib/lock-state.ts';
import { nightAt, toLockSettings } from '../../lib/routine.ts';
import { formatPreset } from '../../lib/text.ts';
import { pendingNote } from './starts-when.ts';

/**
 * The banner for a waiting edit: `pendingNote` for its first night as Home sees it
 * (`nightAt(from)`, the bedtime the apps really sleep at, or a night off), judged against the
 * night under the routine in force now, so one made from bed waits a day.
 */
export const waitingNote = (from: Date, now: Date) =>
  pendingNote(nightAt(from, now), now, nightsAround(now, toLockSettings(routineAt(now))).latest);

/**
 * The words above the Routine tab for an edit waiting from `from`, with `bedtime` its bedtime.
 * An earlier bedtime saved in the day governs its own first night once that starts (#137): it
 * already began, so it doesn't say it waits for the old bedtime. That holds only once iOS has
 * the early windows, so read (or announce) it after arming settles, not right after the save.
 */
export function pendingLine(from: Date, bedtime: number, now: Date): string {
  return inPendingFirstNight(now)
    ? `Your changes started at tonight’s new bedtime, ${formatPreset(bedtime).replace(' ', ' ')}.`
    : waitingNote(from, now);
}
