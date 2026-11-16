/**
 * Locturne's words in every language it speaks. Pure, so tests and the extensions' catalog
 * build (tools/i18n/build-catalogs.mjs) run it in Node.
 *
 * - English (locales/en.ts) is the source: every key lives there, with its English words.
 * - Another language (locales/es.ts…) holds only what's been translated. A missing key falls
 *   back to English, so a half-translated language still works, in English where it's missing.
 * - `{name}` in a text is filled from the params: t('settings.passesLeft', { count: 2 }).
 * - A plural is `{ one, other }` and needs `count`; each language's own rule picks the form.
 *
 * The language in use is set once at launch and on every change in Settings (store.ts, which
 * also tells the extensions). Hermes has no Intl.PluralRules, so the plural rules are here.
 */
import { en, type Messages } from './locales/en.ts';
import { es } from './locales/es.ts';
import { de } from './locales/de.ts';
import { fr } from './locales/fr.ts';
import { ptBR } from './locales/pt-BR.ts';
import { ja } from './locales/ja.ts';

export type Plural = { one: string; other: string };

/** Each language Locturne speaks: its code (also the iOS .lproj name), its own name, and its BCP 47 tag for dates and times. */
export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English', tag: 'en-US' },
  { code: 'es', name: 'Español', english: 'Spanish', tag: 'es' },
  { code: 'de', name: 'Deutsch', english: 'German', tag: 'de-DE' },
  { code: 'fr', name: 'Français', english: 'French', tag: 'fr-FR' },
  { code: 'pt-BR', name: 'Português (Brasil)', english: 'Portuguese (Brazil)', tag: 'pt-BR' },
  { code: 'ja', name: '日本語', english: 'Japanese', tag: 'ja-JP' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];
/** What the person picked in Settings: a language, or whatever the iPhone is set to. */
export type LanguageChoice = Language | 'system';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : T[K] extends readonly (infer U)[] ? readonly U[] : DeepPartial<T[K]> };
/** A translation: any part of the English, in the same shape. */
export type Translation = DeepPartial<Messages>;

export const TRANSLATIONS: Record<Language, Translation> = { en, es, de, fr, 'pt-BR': ptBR, ja };

/** Every key of a text or a plural, as 'settings.title'. */
type TextPaths<T> = {
  [K in keyof T & string]: T[K] extends string | Plural ? K : T[K] extends readonly unknown[] ? never : `${K}.${TextPaths<T[K]>}`;
}[keyof T & string];
/** Every key of a list, as 'fireLoc.refusals'. */
type ListPaths<T> = {
  [K in keyof T & string]: T[K] extends string | Plural ? never : T[K] extends readonly unknown[] ? K : `${K}.${ListPaths<T[K]>}`;
}[keyof T & string];
type At<T, P extends string> = P extends `${infer K}.${infer Rest}` ? (K extends keyof T ? At<T[K], Rest> : never) : P extends keyof T ? T[P] : never;

export type TextKey = TextPaths<Messages>;
export type ListKey = ListPaths<Messages>;
export type Params = Record<string, string | number>;

let active: Language = 'en';
const listeners = new Set<(language: Language) => void>();

export const activeLanguage = (): Language => active;
export const activeTag = (): string => LANGUAGES.find((l) => l.code === active)!.tag;
export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((l) => l.code === value);

/** Switches every later `t` to `language`, and tells whoever's listening (`useT`). */
export function setActiveLanguage(language: Language): void {
  if (language === active) return;
  active = language;
  for (const listener of listeners) listener(language);
}

export function onLanguageChange(listener: (language: Language) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The language for a choice: the one picked, or for 'system' the first of the iPhone's
 * languages Locturne speaks (any Portuguese reads Brazilian), else English.
 * `deviceTags` is the iPhone's list, most preferred first ('de-AT', 'pt-PT', 'en-GB').
 */
export function resolveLanguage(choice: LanguageChoice, deviceTags: readonly string[]): Language {
  if (choice !== 'system') return choice;
  for (const tag of deviceTags) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (base === 'pt') return 'pt-BR';
    const match = LANGUAGES.find((l) => l.code === base);
    if (match) return match.code;
  }
  return 'en';
}

/**
 * CLDR's cardinal rule, for the languages here: English, German and Spanish say "1 morning"
 * and "0 mornings"; French and Brazilian Portuguese say the singular for 0 and 1 too;
 * Japanese has one form.
 */
export function pluralForm(language: Language, count: number): keyof Plural {
  if (language === 'ja') return 'other';
  if (language === 'fr' || language === 'pt-BR') return Math.abs(count) < 2 ? 'one' : 'other';
  return count === 1 ? 'one' : 'other';
}

function lookup(source: unknown, key: string): unknown {
  let node = source;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** `{name}` → its param. A name with no param stays as written, so a missing one shows. */
export function fill(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

function pick(entry: unknown, language: Language, params?: Params): string | undefined {
  if (typeof entry === 'string') return fill(entry, params);
  if (entry && typeof entry === 'object' && 'other' in entry) {
    const plural = entry as Partial<Plural>;
    const count = Number(params?.count ?? 0);
    const text = plural[pluralForm(language, count)] ?? plural.other;
    return text === undefined ? undefined : fill(text, params);
  }
  return undefined;
}

/** The words for `key` in the active language (or `language`), English where it's missing. */
export function t(key: TextKey, params?: Params, language: Language = active): string {
  return pick(lookup(TRANSLATIONS[language], key), language, params) ?? pick(lookup(en, key), 'en', params) ?? key;
}

/** A list (Loc's refusals): the whole translated list, or English's. */
export function tList<K extends ListKey>(key: K, language: Language = active): At<Messages, K> {
  const list = lookup(TRANSLATIONS[language], key);
  return (Array.isArray(list) && list.length ? list : lookup(en, key)) as At<Messages, K>;
}
