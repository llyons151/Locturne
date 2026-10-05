import { nightsAround, type Night } from '../../lib/lock-state.ts';

/** Predict a new setup without changing storage; weekday nights follow the morning's prior evening. */
export function firstEnabledNight(bedtime: number, morningStart: number, activeNights: number[], now: Date): Night | null {
  const settings = { bedtime, morningStart, activeNights, stepGoal: 200, nightApps: [], alwaysApps: [] };
  const around = nightsAround(now, settings);
  let night = now < around.latest.end ? around.latest : around.next;
  for (let day = 0; day < 8; day++) {
    const evening = new Date(night.end);
    evening.setDate(evening.getDate() - 1);
    if (activeNights.includes(evening.getDay())) return night;
    night = nightsAround(new Date(night.end.getTime() + 1), settings).next;
  }
  return null;
}

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const clock = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const day = (date: Date, now: Date) => {
  if (dayKey(date) === dayKey(now)) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKey(date) === dayKey(tomorrow) ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' });
};

/** Factual promises shared by the offer, plan checklist, armed result and first wake-up page. */
export function scheduleCopy(night: Night | null, now: Date) {
  if (!night) return {
    when: 'Schedule', sleep: 'Every night is switched off in Routine.',
    armed: 'No nights scheduled.', morning: 'Turn on a night in Routine to set a wake-up.',
  };
  const started = night.start <= now && now < night.end;
  const when = started ? 'Now' : day(night.start, now);
  const label = day(night.start, now);
  const at = `${label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label} at ${clock(night.start)}`;
  return {
    when,
    sleep: started ? 'Your apps sleep as soon as you’re in.' : `Your apps sleep ${at}.`,
    armed: started ? 'Armed. Starting now. Put it down.' : `Armed. ${day(night.start, now)} at ${clock(night.start)}.`,
    morning: `${day(night.end, now)} ${clock(night.end)}. Your apps stay asleep until you’re up.`,
  };
}
