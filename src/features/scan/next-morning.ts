/**
 * The scan screen's words when the apps are already up: which morning wants the code next.
 * Pure, so it's tested (`next-morning.test.ts`).
 */

/** "this morning", "tomorrow morning", "Thursday morning", by `morning`'s date against `now`'s. */
export function morningName(morning: Date, now: Date): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(morning) - day(now)) / 86_400_000);
  if (days <= 0) return 'this morning';
  if (days === 1) return 'tomorrow morning';
  const weekday = morning.toLocaleDateString(undefined, { weekday: 'long' });
  return days < 7 ? `${weekday} morning` : `next ${weekday} morning`;
}

/** `morning`: the next one the lock holds, or null when every night is off. */
export function awakeBody(morning: Date | null, now: Date): string {
  if (!morning) return 'Every night is off, so there’s nothing to scan for.';
  return `Nothing to scan for until ${morningName(morning, now)}.`;
}

/** The setup's last words once a code is saved: the morning it's first wanted. */
export function savedBody(morning: Date | null, now: Date): string {
  if (!morning) return 'Every night is off. When one’s on, scan it to wake your apps.';
  const name = morningName(morning, now);
  return `${name[0].toUpperCase()}${name.slice(1)}, scan it and your apps wake up.`;
}
