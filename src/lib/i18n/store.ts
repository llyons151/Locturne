/**
 * The language picked in Settings, kept in the App Group so the extensions speak it too
 * (LocturneText.swift reads `locturne.language`). 'system' follows the iPhone's languages,
 * including a per-app language set in iOS Settings, which relaunches the app.
 *
 * Changing it re-syncs the lock, so the shield's words (shield-copy.ts) change tonight, and
 * re-plans the notifications, which carry their words from the moment they were scheduled.
 */
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import { syncLock } from '../lock-controller.ts';
import { rescheduleNotifications } from '../notifications.ts';
import { sharedGet, sharedSet } from '../screen-time.ts';
import {
  activeLanguage,
  isLanguage,
  onLanguageChange,
  resolveLanguage,
  setActiveLanguage,
  t,
  type Language,
  type LanguageChoice,
  type Params,
  type TextKey,
} from './core.ts';

export const LANGUAGE_KEY = 'locturne.language';

const deviceTags = () => {
  try {
    return getLocales().map((l) => l.languageTag);
  } catch {
    return [];
  }
};

export function getLanguageChoice(): LanguageChoice {
  const saved = sharedGet<string>(LANGUAGE_KEY);
  return saved === 'system' || isLanguage(saved) ? saved : 'system';
}

/** At launch, before the first screen draws. */
export function startLanguage(): void {
  setActiveLanguage(resolveLanguage(getLanguageChoice(), deviceTags()));
}

/** The iPhone's own language, as Locturne would speak it, for the "iPhone language" row. */
export const systemLanguage = () => resolveLanguage('system', deviceTags());

/** Settings' Language page: save, switch, and bring the shield and notifications along. */
export function chooseLanguage(choice: LanguageChoice): void {
  sharedSet(LANGUAGE_KEY, choice);
  const before = activeLanguage();
  setActiveLanguage(resolveLanguage(choice, deviceTags()));
  if (activeLanguage() === before) return;
  try {
    syncLock();
  } catch {
    // The next sync (any open, any edit) writes the new words.
  }
  rescheduleNotifications().catch(() => {});
}

const bound = new Map<Language, Translate>();
type Translate = (key: TextKey, params?: Params) => string;

/**
 * `t` for a component: re-renders it when the language changes. A new function per language,
 * so the React Compiler's memoised JSX sees the change instead of keeping the old words.
 */
export function useT(): Translate {
  const language = useSyncExternalStore(onLanguageChange, activeLanguage, activeLanguage);
  let translate = bound.get(language);
  if (!translate) {
    translate = (key, params) => t(key, params, language);
    bound.set(language, translate);
  }
  return translate;
}

/** The language in use, re-rendering the component when it changes. */
export const useLanguage = (): Language => useSyncExternalStore(onLanguageChange, activeLanguage, activeLanguage);
