/**
 * Times and dates in the active language. English keeps Locturne's own style ("7 am",
 * "11:30 pm", "Nov 16, 2026"); every other language gets its own conventions from Intl
 * ("19 Uhr", "7:30", "16 nov 2026"), which Hermes on iOS draws from the system.
 */
import { activeLanguage, activeTag, t } from './core.ts';

const DAY = 24 * 60;

/** Minutes after midnight as a short clock time: 1410 → "11:30 pm", 540 → "9 am"; "21:30", "9 Uhr" elsewhere. */
export function clockLabel(minutes: number): string {
  const m = ((minutes % DAY) + DAY) % DAY;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (activeLanguage() === 'en') {
    const hour = String(h % 12 || 12);
    return `${mins ? `${hour}:${mins.toString().padStart(2, '0')}` : hour} ${h < 12 ? 'am' : 'pm'}`;
  }
  const date = new Date(2000, 0, 1, h, mins);
  return date.toLocaleTimeString(activeTag(), mins ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' });
}

/** "Nov 16, 2026" / "16 nov 2026" / "2026年11月16日". */
export const shortDate = (date: Date) => date.toLocaleDateString(activeTag(), { month: 'short', day: 'numeric', year: 'numeric' });

/** "Saturday" / "Samstag". */
export const weekdayName = (date: Date) => date.toLocaleDateString(activeTag(), { weekday: 'long' });

/** "November 16" / "16. November". */
export const monthDay = (date: Date) => date.toLocaleDateString(activeTag(), { month: 'long', day: 'numeric' });

/** A span of minutes, short: "6h 12m", "2h", "48m". */
export function durationLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  if (!h) return t('time.m', { m });
  return m % 60 ? t('time.hm', { h, m: m % 60 }) : t('time.h', { h });
}
