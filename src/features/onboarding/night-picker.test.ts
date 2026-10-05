/// <reference types="node" />

/**
 * Onboarding's bedtime-apps picker on the simulated phone. Needs
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
const { closeNightPicker, openNightPicker } = await import('./night-picker.ts');

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

test('first run, nothing armed: picks go straight into the bedtime list, removals too', () => {
  clock(at(5, 15));
  lc.settleSubscription(true, at(5, 15));
  const list = openNightPicker();
  assert.equal(list, 'night');
  pick(list, ['insta', 'tiktok']);
  closeNightPicker(list);
  assert.equal(st.selectionSize('night'), 2);

  const again = openNightPicker();
  assert.equal(again, 'night');
  pick(again, ['insta']);
  closeNightPicker(again);
  assert.equal(st.selectionSize('night'), 1);
  assert.equal(st.listChangeStarts('night'), null);
});

test('Block now on the bedtime list, nothing armed: an app taken off still wakes when it ends', async () => {
  clock(at(5, 15));
  lc.settleSubscription(true, at(5, 15));
  pick('night', ['insta', 'tiktok']);
  await st.startNap('night', 30);
  assert.ok(device.state.shielded.has('tiktok'));
  assert.equal(st.getArmedNight(), null);

  const list = openNightPicker();
  assert.notEqual(list, 'night');
  pick(list, ['insta']);
  closeNightPicker(list);

  st.endNap();
  assert.equal(device.state.shielded.has('insta'), false);
  assert.equal(device.state.shielded.has('tiktok'), false);
});

test('Block now on the bedtime list: an app added there sleeps at once', async () => {
  clock(at(5, 15));
  lc.settleSubscription(true, at(5, 15));
  pick('night', ['insta']);
  await st.startNap('night', 30);

  const list = openNightPicker();
  pick(list, ['insta', 'youtube']);
  closeNightPicker(list);
  assert.ok(device.state.shielded.has('youtube'));
  assert.equal(st.listChangeStarts('night'), null);
});
