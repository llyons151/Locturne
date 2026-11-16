/**
 * The files iOS reads its translations from, made from the locale files so there's one place
 * to translate. Pure: tools/i18n/build-catalogs.mjs writes them, and i18n.test.ts fails if
 * they're out of date.
 *
 * - targets/<extension>/Localizable.xcstrings: each extension's words (`native`), looked up by
 *   LocturneText.swift. A synchronized folder, so Xcode compiles the catalog with no project edit.
 * - locales/ios/<code>.json: the permission prompts (`infoPlist`), which prebuild turns into each
 *   language's InfoPlist.strings (app.json `locales`). English stays in app.json's plugin config.
 */
import { LANGUAGES, TRANSLATIONS, type Language } from './core.ts';
import { en } from './locales/en.ts';

/** The extensions that draw words: each gets the whole catalog (it's small). */
export const CATALOG_TARGETS = ['ShieldAction', 'ActivityMonitorExtension', 'ShieldConfiguration', 'ScreenTimeReport'] as const;

type Unit = { stringUnit: { state: 'translated'; value: string } };

export function xcstrings(): string {
  const strings: Record<string, { extractionState: 'manual'; localizations: Record<string, Unit> }> = {};
  for (const key of Object.keys(en.native).sort()) {
    const localizations: Record<string, Unit> = {};
    for (const { code } of LANGUAGES) {
      const value = (TRANSLATIONS[code].native as Record<string, string> | undefined)?.[key];
      if (value !== undefined) localizations[code] = { stringUnit: { state: 'translated', value } };
    }
    strings[key] = { extractionState: 'manual', localizations };
  }
  return `${JSON.stringify({ sourceLanguage: 'en', strings, version: '1.0' }, null, 2)}\n`;
}

/** The permission prompts for one language, in the shape app.json's `locales` takes. */
export function infoPlistStrings(language: Exclude<Language, 'en'>): string {
  return `${JSON.stringify({ ios: { ...en.infoPlist, ...TRANSLATIONS[language].infoPlist } }, null, 2)}\n`;
}

/** Every file, by its path from the repo root. */
export function catalogFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  const catalog = xcstrings();
  for (const target of CATALOG_TARGETS) files[`targets/${target}/Localizable.xcstrings`] = catalog;
  for (const { code } of LANGUAGES) if (code !== 'en') files[`locales/ios/${code}.json`] = infoPlistStrings(code);
  return files;
}
