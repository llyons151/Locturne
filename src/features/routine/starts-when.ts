import type { Night } from '../../lib/lock-state.ts';
import { formatPreset } from '../../lib/text.ts';

/** Bedtimes before 6 am belong to the evening before them; from 6 pm they're that evening. */
const SMALL_HOURS = 6;
const EVENING = 18;

/** Midnight at the start of `date`'s day, `offset` days on. */
const dayOf = (date: Date, offset = 0) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);

/** The evening a time belongs to: 1 am Saturday is Friday night. */
const evening = (date: Date) => dayOf(date, date.getHours() < SMALL_HOURS ? -1 : 0);

/** Calendar days from `a`'s date to `b`'s (rounded: a daylight-saving day isn't 24 hours). */
const daysBetween = (a: Date, b: Date) => Math.round((dayOf(b).getTime() - dayOf(a).getTime()) / 86_400_000);

/** The day a bedtime at `at` falls on, as a person says it, and whether it's a night (not a day sleeper's bedtime in the day). */
function dayOfBedtime(at: Date, now: Date, night: Night): { days: number; isNight: boolean; weekday: string } {
  const hour = at.getHours();
  const isNight = !(hour >= SMALL_HOURS && hour < EVENING);
  const inside = now >= night.start && now < night.end;
  // A bedtime in the day isn't a night to a person: count calendar days to it.
  const days = isNight ? daysBetween(inside ? evening(night.start) : now, evening(at)) : daysBetween(now, at);
  const weekday =
    daysBetween(now, at) < 7
      ? at.toLocaleDateString(undefined, { weekday: 'long' })
      : at.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return { days, isNight, weekday };
}

/**
 * When a waiting routine edit starts, for the Routine banner and VoiceOver: "from tonight's
 * bedtime, 11 pm", "from tomorrow night at 1 am", "from today at 8 am" (a day sleeper's
 * bedtime), "from Friday at 11 pm". Pure, so it's tested (`starts-when.test.ts`).
 *
 * `at` is the bedtime the edit's first night really starts at (`nightAt(from).start`, as Home
 * names it), not `from`, the old routine's bedtime. `night` is the latest night to have
 * started under the routine in force (`nightsAround`). Made inside it, "tonight" is the night
 * they're in, so the next one counts from its evening: at 2 am, a 1 am bedtime is tomorrow
 * night, not tonight's.
 */
export function startsWhen(at: Date, now: Date, night: Night): string {
  // A no-break space keeps "11 pm" on one line.
  const time = formatPreset(at.getHours() * 60 + at.getMinutes()).replace(' ', '\u00a0');
  const { days, isNight, weekday } = dayOfBedtime(at, now, night);
  if (!isNight) {
    if (days <= 0) return `from today at ${time}`;
    if (days === 1) return `from tomorrow at ${time}`;
    return `from ${weekday} at ${time}`;
  }
  if (days <= 0) return `from tonight’s bedtime, ${time}`;
  if (days === 1) return `from tomorrow night at ${time}`;
  return `from ${weekday} at ${time}`;
}

/**
 * The Routine banner (and its VoiceOver announcement) for an edit waiting for bedtime.
 * `first` is the edit's first night as Home sees it (`nightAt(from)`): when it starts, and
 * whether it's on. A first night that's off has no bedtime to name, so the banner says so.
 */
export function pendingNote(first: { start: Date; on: boolean }, now: Date, night: Night): string {
  const until = ' Until then, the old routine stays.';
  if (first.on) return `Your changes apply ${startsWhen(first.start, now, night)}.${until}`;
  const { days, isNight, weekday } = dayOfBedtime(first.start, now, night);
  const when =
    days <= 0 ? (isNight ? 'tonight' : 'today') : days === 1 ? (isNight ? 'tomorrow night' : 'tomorrow') : isNight ? `${weekday} night` : weekday;
  return `Your changes start ${when}: it’s off.${days <= 0 ? '' : until}`;
}
