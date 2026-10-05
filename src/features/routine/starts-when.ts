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

/**
 * When a waiting routine edit starts, for the Routine banner and VoiceOver: "from tonight's
 * bedtime, 11 pm", "from tomorrow night at 1 am", "from today at 8 am" (a day sleeper's
 * bedtime), "from Friday at 11 pm". Pure, so it's tested (`starts-when.test.ts`).
 *
 * `night` is the latest night to have started under the routine in force (`nightsAround`).
 * Made inside it, "tonight" is the night they're in, so the next one counts from its evening:
 * at 2 am, a 1 am bedtime is tomorrow night, not tonight's.
 */
export function startsWhen(at: Date, now: Date, night: Night): string {
  // A no-break space keeps "11 pm" on one line.
  const time = formatPreset(at.getHours() * 60 + at.getMinutes()).replace(' ', ' ');
  const days = daysBetween(now, at);
  const weekday = () =>
    days < 7
      ? at.toLocaleDateString(undefined, { weekday: 'long' })
      : at.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = at.getHours();
  // A bedtime in the day isn't a night to a person: name its day.
  if (hour >= SMALL_HOURS && hour < EVENING) {
    if (days <= 0) return `from today at ${time}`;
    if (days === 1) return `from tomorrow at ${time}`;
    return `from ${weekday()} at ${time}`;
  }
  const inside = now >= night.start && now < night.end;
  const nights = daysBetween(inside ? evening(night.start) : now, evening(at));
  if (nights <= 0) return `from tonight’s bedtime, ${time}`;
  if (nights === 1) return `from tomorrow night at ${time}`;
  return `from ${weekday()} at ${time}`;
}
