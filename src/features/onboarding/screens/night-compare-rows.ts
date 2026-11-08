import type { WakeMethod } from '@/lib/routine';

import { formatWhen } from '../estimate';

/** Minutes from the alarm to proof, by how they prove it. A walk is about three. */
const UP_AFTER: Record<WakeMethod, number> = { dance: 2, steps: 3, scan: 2, place: 15, pushups: 2, downtime: 2 };

export type CompareRow = { label: string; usual: string; withMe: string };

export type CompareProps = {
  bedtime: number;
  wake: number;
  nightMinutes: number;
  morningMinutes: number;
  method: WakeMethod;
  /** The morning branch: their end of the night goes on top. */
  morningFirst?: boolean;
};

/**
 * The paywall's before/after times (`NightCompare`), shared by the SwiftUI tiles and the web
 * ones. In its own file: night-compare.ios.tsx importing './night-compare' would get itself.
 * A row only shows when the two times differ.
 */
export function compareRows({ bedtime, wake, nightMinutes, morningMinutes, method, morningFirst = false }: CompareProps): CompareRow[] {
  const upWithMe = wake + UP_AFTER[method];
  const rows: CompareRow[] = [
    nightMinutes > 5 ? { label: 'Phone down', usual: formatWhen(bedtime + nightMinutes), withMe: formatWhen(bedtime) } : null,
    wake + morningMinutes > upWithMe
      ? { label: 'Out of bed', usual: formatWhen(wake + morningMinutes), withMe: formatWhen(upWithMe) }
      : null,
  ].filter((row): row is CompareRow => row !== null);
  if (morningFirst) rows.reverse();
  return rows;
}

/** Each half's glyph, the same pair the schedule card uses for its two times. */
export function compareIcon(label: string) {
  return label === 'Phone down'
    ? ({ ios: 'moon.fill', android: 'bedtime', web: 'bedtime' } as const)
    : ({ ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' } as const);
}

/** What VoiceOver reads for the tiles, as one element. */
export function compareLabel(rows: CompareRow[]): string {
  return rows.map((row) => `${row.label}: ${row.withMe} with me, usually ${row.usual}`).join('. ');
}
