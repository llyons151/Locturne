import { syncLock } from '@/lib/lock-controller';
import { asSet, editSchedule, freeScheduleId, isBlocking, nextBlock, scheduleRemovalsAt, type Schedule, type ScheduleId } from '@/lib/schedules';
import { getSchedules, saveSchedules, setScheduleShieldText, type ShieldText } from '@/lib/screen-time';
import { formatPreset } from '@/lib/text';

/** A schedule as the sheet edits it: everything but its id and any waiting edit. */
export type ScheduleDraft = Omit<Schedule, 'id' | 'pending'>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Weekdays", "Every day", "Sat and Sun", "Mon, Wed, Fri". */
export function daysLabel(days: number[]): string {
  const set = [...days].sort((a, b) => a - b);
  if (set.length === 7) return 'Every day';
  if (set.length === 0) return 'No days';
  if (set.join() === '1,2,3,4,5') return 'Weekdays';
  if (set.join() === '0,6') return 'Weekends';
  if (set.length === 1) return `${DAY_NAMES[set[0]]}s`;
  // A run of three or more days in a row: "Sun to Thu".
  if (set.length >= 3 && set.every((d, i) => i === 0 || d === set[i - 1] + 1)) return `${SHORT_DAYS[set[0]]} to ${SHORT_DAYS[set.at(-1)!]}`;
  const names = set.map((d) => SHORT_DAYS[d]);
  return names.length === 2 ? names.join(' and ') : names.join(', ');
}

/** "9 am to 5 pm" or "All day". */
export function timesLabel(s: Pick<Schedule, 'start' | 'end' | 'allDay'>): string {
  return s.allDay ? 'All day' : `${formatPreset(s.start)} to ${formatPreset(s.end)}`;
}

/** What a schedule's tile and page say about it: its times and days. */
export function scheduleSummary(s: Pick<Schedule, 'start' | 'end' | 'allDay' | 'days'>): string {
  const days = daysLabel(s.days);
  // "every day" and "weekdays" read as words in the line; day names keep their capitals.
  return `${timesLabel(s)}, ${/^(Every day|Weekdays|Weekends|No days)$/.test(days) ? days.toLowerCase() : days}`;
}

/** "at 5 pm", "tomorrow at 9 am", "Monday at 9 am". */
export function whenLabel(at: Date, now: Date): string {
  const days = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
  const time = formatPreset(at.getHours() * 60 + at.getMinutes());
  if (days <= 0) return `at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  return `${DAY_NAMES[at.getDay()]} at ${time}`;
}

/** How a schedule stands right now, for its tile and page: asleep until when, or when it's next. */
export function scheduleStatus(s: Schedule, now = new Date()): { asleep: boolean; text: string } | null {
  if (isBlocking(s, now)) {
    const ends = scheduleRemovalsAt(s, now);
    return { asleep: true, text: `Asleep now. Awake ${whenLabel(ends, now)}.` };
  }
  const next = nextBlock(s, now);
  return next ? { asleep: false, text: `Awake now. Asleep ${whenLabel(next, now)}.` } : null;
}

/** A waiting edit, spelled out: it lands when the block under way ends. */
export function schedulePendingNote(s: Schedule, now = new Date()): string | null {
  if (!s.pending) return null;
  const when = whenLabel(new Date(s.pending.from), now);
  return s.pending.schedule === null
    ? `Deleted. It ends ${when}, when this block is over.`
    : `Your changes start ${when}, when this block is over.`;
}

/** The words on a schedule's apps while it blocks them. */
export function scheduleShieldText(s: Pick<Schedule, 'name' | 'end' | 'allDay'>): ShieldText {
  const until = s.allDay ? 'midnight' : formatPreset(s.end);
  return { title: `Asleep until ${until}.`, subtitle: s.name ? `Your ${s.name} schedule.` : 'One of your schedules.', button: 'Okay' };
}

/**
 * Saves a schedule (new, edited, or `null` to delete it): at once, unless it's blocking and the
 * edit would lift some of the block under way, which waits for the block's end (`editSchedule`).
 * Then the shields and iOS's activities follow (`syncLock`).
 */
export function saveSchedule(id: ScheduleId, next: ScheduleDraft | null, now = new Date()): void {
  const saved = editSchedule(getSchedules(now), id, next ? { ...next, id } : null, now);
  saveSchedules(saved);
  const inForce = saved.find((s) => s.id === id);
  if (inForce) setScheduleShieldText(id, scheduleShieldText(inForce));
  syncLock(now);
}

/** The schedule as last set, for the sheet to open on: a waiting edit, or the one in force. */
export function scheduleAsSet(id: ScheduleId, now = new Date()): ScheduleDraft | null {
  const s = getSchedules(now).find((x) => x.id === id);
  if (!s) return null;
  const set = asSet(s);
  if (!set) return null;
  const { id: _id, ...draft } = set;
  return draft;
}

/** The slot a new schedule takes, or null when every one is used. */
export const newScheduleId = (now = new Date()) => freeScheduleId(getSchedules(now));
