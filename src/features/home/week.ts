import { dateKey } from '@/lib/lock-state';

export type WeekDay = {
  key: string;
  letter: string;
  /** "Monday", for VoiceOver. */
  name: string;
  done: boolean;
  today: boolean;
  future: boolean;
  /** A past morning with no lock to get up for (its night was off, or before the first save). */
  free: boolean;
};

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * This week, Sunday to Saturday (user's ask, October 8, 2026), around the morning `today` (`LockState.morningKey`):
 * which mornings were won, which is today, which are still to come. `free`: past mornings no
 * night locked, so not getting up on them isn't a miss.
 */
export function weekDays(today: string, won: Set<string>, free: Set<string> = new Set()): WeekDay[] {
  const [y, m, d] = today.split('-').map(Number);
  const back = new Date(y, m - 1, d).getDay();
  return LETTERS.map((letter, i) => {
    const day = new Date(y, m - 1, d - back + i);
    const key = dateKey(day);
    return {
      key,
      letter,
      name: day.toLocaleDateString(undefined, { weekday: 'long' }),
      done: won.has(key),
      today: key === today,
      future: key > today,
      free: key < today && !won.has(key) && free.has(key),
    };
  });
}

export const dayLabel = (day: WeekDay) =>
  `${day.name}: ${day.done ? 'got up' : day.future ? 'to come' : day.today ? 'today' : day.free ? 'no lock' : 'missed'}`;

export const morningsLabel = (n: number) => (n === 1 ? 'morning' : 'mornings');
