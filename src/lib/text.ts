/**
 * Join the last two words so a line never ends on one lonely word, and keep "I" and "a"
 * with the word after them so they never dangle at the end of a line.
 */
export function noOrphan(text: string): string {
  const glued = text.replace(/(^|\s)(I|a|A) /g, '$1$2 ');
  const i = glued.trimEnd().lastIndexOf(' ');
  return i > 0 ? `${glued.slice(0, i)} ${glued.slice(i + 1)}` : glued;
}

const DAY = 24 * 60;

/** Minutes after midnight as a short clock time: 1410 → "11:30 pm", 540 → "9 am". */
export function formatPreset(minutes: number): string {
  const m = ((minutes % DAY) + DAY) % DAY;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  const hour = String(h % 12 || 12);
  return `${mins ? `${hour}:${mins.toString().padStart(2, '0')}` : hour} ${h < 12 ? 'am' : 'pm'}`;
}
