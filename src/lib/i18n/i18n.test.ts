import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, test } from 'node:test';

import { catalogFiles } from './catalogs.ts';
import { LANGUAGES, pluralForm, resolveLanguage, setActiveLanguage, t, tList, TRANSLATIONS } from './core.ts';
import { clockLabel, durationLabel, shortDate } from './format.ts';
import { en } from './locales/en.ts';

const root = join(import.meta.dirname, '..', '..', '..');

/** Every leaf as [path, value]: strings, plurals ({one, other}) and lists, by their dotted path. */
function leaves(node: unknown, path = ''): [string, unknown][] {
  if (typeof node === 'string' || Array.isArray(node)) return [[path, node]];
  if (node && typeof node === 'object') {
    if ('other' in node && Object.keys(node).every((k) => k === 'one' || k === 'other')) return [[path, node]];
    // `native` keys have dots of their own: keep them whole.
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}${path === 'native' ? '/' : '.'}${k}` : k));
  }
  return [[path, node]];
}

const placeholders = (value: unknown): string[] =>
  [...new Set(JSON.stringify(value).match(/\{\w+\}/g) ?? [])].filter((p) => p !== '{count}').sort();

const SAME_EVERYWHERE = new Set(['settings.version']);

afterEach(() => setActiveLanguage('en'));

describe('translations', () => {
  const english = new Map(leaves(en));

  for (const { code } of LANGUAGES) {
    test(`${code}: every key is one English has, the same kind, with the same {placeholders}`, () => {
      for (const [path, value] of leaves(TRANSLATIONS[code])) {
        assert.ok(english.has(path), `${code} has ${path}, which English doesn't`);
        const source = english.get(path);
        assert.equal(Array.isArray(value), Array.isArray(source), `${code} ${path}: list or not`);
        assert.equal(typeof value, typeof source, `${code} ${path}: text or plural`);
        if (Array.isArray(value)) assert.equal(value.length, (source as unknown[]).length, `${code} ${path}: as many entries`);
        assert.deepEqual(placeholders(value), placeholders(source), `${code} ${path}: placeholders`);
      }
    });
  }

  test('the five languages translate everything the app reads so far', () => {
    for (const { code } of LANGUAGES) {
      const have = new Set(leaves(TRANSLATIONS[code]).map(([p]) => p));
      // Words that read the same everywhere fall through to English on purpose.
      const missing = [...english.keys()].filter((p) => !have.has(p) && !SAME_EVERYWHERE.has(p));
      assert.deepEqual(missing, [], `${code} is missing`);
    }
  });
});

describe('t', () => {
  test('English reads exactly as it did before', () => {
    assert.equal(t('settings.moons', { count: 1 }), '1 moon');
    assert.equal(t('settings.moons', { count: 3 }), '3 moons');
    assert.equal(t('settings.passesLeft', { count: 2 }), '2 left');
    assert.equal(t('subscription.planTrial', { plan: 'Annual' }), 'Annual trial');
    assert.equal(t('shield.proofSteps', { steps: 200 }), 'Walk 200 steps, then tap I’m up.');
  });

  test('another language', () => {
    setActiveLanguage('de');
    assert.equal(t('settings.title'), 'Einstellungen');
    assert.equal(t('settings.moons', { count: 1 }), '1 Mond');
    assert.equal(t('settings.moons', { count: 4 }), '4 Monde');
    // Asked for in English while German is in use.
    assert.equal(t('settings.title', undefined, 'en'), 'Settings');
  });

  test('plurals follow each language’s rule', () => {
    assert.equal(pluralForm('en', 0), 'other');
    assert.equal(pluralForm('fr', 0), 'one');
    assert.equal(pluralForm('pt-BR', 1), 'one');
    assert.equal(pluralForm('ja', 1), 'other');
    setActiveLanguage('fr');
    assert.equal(t('settings.moons', { count: 0 }), '0 lune');
  });

  test('a list comes whole, translated', () => {
    setActiveLanguage('es');
    assert.equal(tList('fireLoc.refusals')[0].title, 'Denegado.');
    setActiveLanguage('en');
    assert.equal(tList('fireLoc.refusals')[0].title, 'Denied.');
  });
});

describe('resolveLanguage', () => {
  test('a pick wins; "system" takes the iPhone’s first language Locturne speaks', () => {
    assert.equal(resolveLanguage('ja', ['de-DE']), 'ja');
    assert.equal(resolveLanguage('system', ['it-IT', 'de-AT', 'en-US']), 'de');
    assert.equal(resolveLanguage('system', ['pt-PT']), 'pt-BR');
    assert.equal(resolveLanguage('system', ['zh-Hans-CN']), 'en');
    assert.equal(resolveLanguage('system', []), 'en');
  });
});

describe('format', () => {
  test('English keeps Locturne’s own clock and dates', () => {
    assert.equal(clockLabel(1410), '11:30 pm');
    assert.equal(clockLabel(540), '9 am');
    assert.equal(clockLabel(0), '12 am');
    assert.equal(shortDate(new Date(2026, 10, 16)), 'Nov 16, 2026');
    assert.equal(durationLabel(372), '6h 12m');
    assert.equal(durationLabel(120), '2h');
  });

  test('another language uses its own clock', () => {
    setActiveLanguage('de');
    assert.match(clockLabel(1410), /^23:30/);
    assert.equal(durationLabel(372), '6 Std. 12 Min.');
  });
});

describe('iOS files', () => {
  test('the catalogs and permission prompts are up to date (npm run i18n:catalogs)', () => {
    for (const [path, content] of Object.entries(catalogFiles())) {
      assert.equal(readFileSync(join(root, path), 'utf8'), content, `${path} is stale: run npm run i18n:catalogs`);
    }
  });

  test('the English written in the Swift matches en.native', () => {
    const swift = ['ShieldAction/Locturne.swift', 'ShieldConfiguration/LocturneShieldRing.swift', 'ScreenTimeReport/ScreenTimeReport.swift', 'ShieldAction/LocturneText.swift']
      .map((f) => readFileSync(join(root, 'targets', f), 'utf8'))
      .join('\n');
    const native = en.native as Record<string, string>;
    let seen = 0;
    for (const [, key, english] of swift.matchAll(/locturneText\(\s*"([^"]+)",\s*"([^"]*)"/g)) {
      assert.equal(english, native[key], `Swift's English for ${key}`);
      seen++;
    }
    for (const [, key, one, other] of swift.matchAll(/locturnePlural\(\s*"([^"]+)",\s*count:[^,]+,\s*one:\s*"([^"]*)",\s*other:\s*"([^"]*)"/g)) {
      assert.equal(one, native[`${key}.one`], `Swift's English for ${key}.one`);
      assert.equal(other, native[`${key}.other`], `Swift's English for ${key}.other`);
      seen++;
    }
    assert.ok(seen >= 25, `found only ${seen} lookups`);
  });
});
