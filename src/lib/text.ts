/**
 * Join the last two words so a line never ends on one lonely word, and keep "I" and "a"
 * with the word after them so they never dangle at the end of a line.
 */
export function noOrphan(text: string): string {
  const glued = text.replace(/(^|\s)(I|a|A) /g, '$1$2 ');
  const i = glued.trimEnd().lastIndexOf(' ');
  return i > 0 ? `${glued.slice(0, i)} ${glued.slice(i + 1)}` : glued;
}
