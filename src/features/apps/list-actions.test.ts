import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { editLimit, keepName, renameLimit, type DailyLimit, type LimitId } from '../../lib/daily-limits.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

/** Execute the actual screen's handlers, retaining a render's stale closure across native waits. */
function harness() {
  const original: DailyLimit[] = [{ id: 'limit-0', minutes: 60 }, { id: 'limit-1', minutes: 60 }];
  let disk = original;
  let rendered = original;
  let error: string | null = null;
  const pending: { resolve: () => void; reject: () => void }[] = [];
  const source = readFileSync(new URL('./list-actions.tsx', import.meta.url), 'utf8');
  const handlers = source.slice(source.indexOf('  const saveAndArm ='), source.indexOf('  /** Opens Apple'));
  const code = babel.transformSync(`${handlers}\nglobalThis.setMinutes = setMinutes; globalThis.setName = setName;`, {
    filename: 'handlers.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  const context = {
    limits: original,
    isPickerSettling: () => false,
    armingLimits: new Set(),
    haptic: { tap() {} },
    editLimit,
    keepName,
    renameLimit,
    looserEditsStartAt: () => new Date(Date.now() + 60_000),
    getLimits: () => disk,
    saveLimits: (next: DailyLimit[]) => { disk = next; },
    setLimits: (next: DailyLimit[]) => { rendered = next; },
    setLimitError: (next: string | null) => { error = next; },
    armLimit: () => new Promise<void>((resolve, reject) => pending.push({ resolve, reject: () => reject(new Error('native refusal')) })),
    setMinutes: undefined as unknown as (id: LimitId, minutes: number | null) => void,
    setName: undefined as unknown as (id: LimitId, name: string) => void,
  };
  runInNewContext(code, context);
  return { edit: context.setMinutes, rename: context.setName, pending, disk: () => disk, rendered: () => rendered, error: () => error };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('editing another limit during native registration preserves both changes and late completions', async () => {
  const h = harness();
  h.edit('limit-0', 30);
  h.edit('limit-1', 15);
  assert.deepEqual(h.disk().map((l) => l.minutes), [30, 15]);
  h.pending[1].resolve();
  await settle();
  h.pending[0].resolve();
  await settle();
  assert.deepEqual(h.rendered().map((l) => l.minutes), [30, 15]);
});

test('native refusal rolls back only its limit while retaining concurrent successful edits', async () => {
  const h = harness();
  h.edit('limit-0', 30);
  h.edit('limit-1', 15);
  h.pending[0].reject();
  h.pending[1].resolve();
  await settle();
  assert.deepEqual(h.disk().map((l) => l.minutes), [60, 15]);
  assert.deepEqual(h.rendered().map((l) => l.minutes), [60, 15]);
  assert.match(h.error()!, /wouldn't start/);
});

test('a rename while iOS registers the limit survives that registration’s refusal', async () => {
  const h = harness();
  h.edit('limit-0', 30);
  h.rename('limit-0', 'Social');
  h.pending[0].reject();
  await settle();
  assert.deepEqual(h.disk()[0], { id: 'limit-0', minutes: 60, name: 'Social' });
  assert.deepEqual(h.rendered()[0], h.disk()[0]);
});

test('same-limit taps cannot race two native registrations and can retry after completion', async () => {
  const h = harness();
  h.edit('limit-0', 30);
  h.edit('limit-0', 15);
  assert.equal(h.pending.length, 1);
  assert.match(h.error()!, /Still saving/);
  h.pending[0].resolve();
  await settle();
  h.edit('limit-0', 15);
  assert.equal(h.pending.length, 2);
  assert.equal(h.disk()[0].minutes, 15);
  h.pending[1].resolve();
  await settle();
});

test('denying the Apps permission repair settles safely and refreshes actual protection', async () => {
  const source = readFileSync(new URL('./list-actions.tsx', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  const askAccess ='), source.indexOf('  const allow ='));
  let refreshed = false;
  let error: string | null = null;
  const context = {
    haptic: { tap() {} },
    requestAccess: async () => { throw new Error('user cancelled authorization'); },
    reapplyStandingBlocks: () => assert.fail('denied access must not claim to restore shields'),
    refresh: () => { refreshed = true; },
    setLimitError: (next: string | null) => { error = next; },
    invoke: undefined as unknown as () => Promise<void>,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.invoke = askAccess;`, {
    filename: 'handlers.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code!, context);
  await context.invoke();
  assert.equal(refreshed, true);
  assert.match(error!, /wasn't turned on/);
});

test('reopening a picker while its native save settles cannot replace the draft before commit', () => {
  const source = readFileSync(new URL('./list-actions.tsx', import.meta.url), 'utf8');
  const edit = source.slice(source.indexOf('  const edit ='), source.indexOf('  const addLimit ='));
  const close = source.match(/onClose=\{\(\) => \{([\s\S]*?)\n\s*\}\}/)![1];
  let live = ['old'];
  let draft = [...live];
  const timers: (() => void)[] = [];
  const settling = new Set();
  const context = {
    editing: 'night', protection: 'on', haptic: { tap() {} }, isLimitId: () => false,
    armingLimits: new Set(), setLimitError() {}, setEditing() {}, refresh() {},
    beginListEdit: () => { draft = [...live]; },
    pickedList: () => { live = [...draft]; },
    isPickerSettling: (list: string) => settling.has(list),
    settlePicker: (list: string, save: () => void) => { settling.add(list); timers.push(() => { save(); settling.delete(list); }); },
    setTimeout: (run: () => void) => { timers.push(run); },
    edit: undefined as unknown as (list: string) => void,
    close: undefined as unknown as () => void,
  };
  const code = babel.transformSync(`${edit}\nglobalThis.edit = edit; globalThis.close = () => {${close}};`, {
    filename: 'handlers.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  context.edit('night');
  draft = ['old', 'new'];
  context.close();
  context.edit('night');
  timers.forEach((run) => run());
  assert.deepEqual(live, ['old', 'new']);
});

test('a bedtime list edit re-plans tonight’s bedtime warning and morning note; a limit edit does not', () => {
  const source = readFileSync(new URL('./list-actions.tsx', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  const pickedList ='), source.indexOf("  // A limit's list changed"));
  let replans = 0;
  const context = {
    finishListEdit() {}, looserEditsStartAt: () => new Date(), isLimitId: (l: string) => l.startsWith('limit-'),
    pickedLimit() {}, reapplyStandingBlocks() {}, getArmedNight: () => ({}), armIfPaid() {}, refresh() {},
    rescheduleNotifications: async () => { replans += 1; },
    picked: undefined as unknown as (list: string) => void,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.picked = pickedList;`, {
    filename: 'handlers.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code!, context);
  context.picked('night');
  assert.equal(replans, 1);
  context.picked('limit-0');
  assert.equal(replans, 1);
});
