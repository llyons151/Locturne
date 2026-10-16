/// <reference types="node" />

/**
 * "Add apps" on a running Block now (nap-add.ts), on the simulated phone. Adding only tightens,
 * so it's at once; nothing taken off may wake early, or stay asleep after the nap. Needs
 * `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import type { SelectionId } from '../../lib/screen-time.ts';
import { simDevice } from '../../lib/sim-device.ts';

const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });

const lc = await import('../../lib/lock-controller.ts');
const st = await import('../../lib/screen-time.ts');
const { closeNapAdd, openNapAdd } = await import('./nap-add.ts');

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
function clock(date: Date) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: date });
}
beforeEach(() => device.reset());
afterEach(() => mock.timers.reset());

/** Apple's picker, closed with `apps` picked in `list`. */
function pick(list: SelectionId, apps: string[]) {
  device.exports.setFamilyActivitySelectionId({ id: list, familyActivitySelection: apps.sort().join(',') });
}

async function napOf(list: 'block' | 'night', apps: string[]) {
  clock(at(5, 15));
  lc.settleSubscription(true, at(5, 15));
  pick(list, apps);
  await st.startNap(list, 30);
}

test('no nap running: nothing to add to', () => {
  clock(at(5, 15));
  assert.equal(openNapAdd(), null);
});

test('picked apps: an app added mid-nap sleeps at once, and wakes with the rest at the end', async () => {
  await napOf('block', ['insta']);
  const list = openNapAdd();
  assert.ok(list);
  assert.notEqual(list, 'block', 'the picker edits a copy, never the live list');
  pick(list, ['insta', 'tiktok']);
  assert.deepEqual(closeNapAdd(list), { added: 1, dropped: false });
  assert.ok(device.state.shielded.has('tiktok'));
  assert.ok(device.state.shielded.has('insta'));

  st.endNap();
  assert.equal(device.state.shielded.has('tiktok'), false);
  assert.equal(device.state.shielded.has('insta'), false);
});

test('picked apps: one taken off stays asleep until the nap ends, then wakes', async () => {
  await napOf('block', ['insta', 'youtube']);
  const list = openNapAdd()!;
  pick(list, ['insta', 'tiktok']);
  assert.deepEqual(closeNapAdd(list), { added: 1, dropped: true });
  assert.ok(device.state.shielded.has('youtube'), 'no way out by deselecting');
  assert.ok(device.state.shielded.has('tiktok'));

  st.endNap();
  for (const app of ['insta', 'youtube', 'tiktok']) assert.equal(device.state.shielded.has(app), false, app);
});

test('picked apps: everything deselected wakes nothing', async () => {
  await napOf('block', ['insta']);
  const list = openNapAdd()!;
  st.clearSelection(list);
  device.exports.setFamilyActivitySelectionId({ id: list, familyActivitySelection: '' });
  const result = closeNapAdd(list);
  assert.equal(result.added, 0);
  assert.ok(device.state.shielded.has('insta'));
});

test('picked apps: closed unchanged adds nothing and leaves no copy behind', async () => {
  await napOf('block', ['insta']);
  const list = openNapAdd()!;
  assert.deepEqual(closeNapAdd(list), { added: 0, dropped: false });
  assert.equal(st.hasSelection(list), false);
  assert.equal(st.selectionSize('block'), 1);
});

test('the nap ended while the picker was open: the picks are kept, nothing new sleeps', async () => {
  await napOf('block', ['insta']);
  const list = openNapAdd()!;
  st.endNap();
  pick(list, ['insta', 'tiktok']);
  closeNapAdd(list);
  assert.equal(device.state.shielded.has('tiktok'), false);
  assert.equal(st.selectionSize('block'), 2, 'the next nap of picked apps starts with them');
});

test('bedtime apps: an app added mid-nap sleeps at once; one taken off still wakes at the end', async () => {
  await napOf('night', ['insta', 'youtube']);
  const list = openNapAdd()!;
  assert.notEqual(list, 'night');
  pick(list, ['insta', 'tiktok']);
  const result = closeNapAdd(list);
  assert.equal(result.added, 1);
  assert.equal(result.dropped, true);
  assert.ok(device.state.shielded.has('tiktok'));
  assert.ok(device.state.shielded.has('youtube'), 'the removal waits');

  st.endNap();
  assert.equal(device.state.shielded.has('youtube'), false);
});
