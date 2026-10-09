/// <reference types="node" />

/**
 * Bedtime list edits around an emergency pause, and the app and the monitor extension
 * settling the same edit at once. Against the shared fake library.
 * Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const st = await import('./screen-time.ts');
const lc = await import('./lock-controller.ts');
const em = await import('./emergency.ts');

beforeEach(() => {
  fake.reset();
  fake.arm();
  fake.ids().night = 'night-picks';
});

test('opening and closing the bedtime picker in a paused night keeps the apps awake', () => {
  const night = new Date(2026, 9, 7, 2, 0); // 02:00, inside 23:00–07:00
  st.sleepApps('night');
  assert.ok(em.emergencyUnlock(night)?.pauseNight);
  fake.state.calls.length = 0;

  st.beginListEdit('night');
  assert.equal(st.finishListEdit('night', new Date(2026, 9, 7, 23, 0)), 'bedtime');
  lc.syncLock(night);
  assert.ok(!fake.shielded('blockSelection').includes('night'));
  assert.equal(st.isNightHeld(), false);
  // The picks are still the bedtime apps, from the next bedtime.
  assert.equal(st.shownSelection('night').size, 2);
});

test('a settle that finds its draft already gone leaves the list alone', () => {
  // A removal edit waiting for bedtime...
  fake.ids()['night-next'] = 'fewer-picks';
  fake.state.store['locturne.pendingLists'] = { night: { from: Date.now() - 1000 } };
  // ...that the extension settled a moment ago from its own read, removing the draft.
  fake.ids().night = 'fewer-picks';
  delete fake.ids()['night-next'];

  assert.deepEqual(st.settleListChanges(), ['night']);
  assert.equal(fake.ids().night, 'fewer-picks', 'not emptied');
});

test('an edit that removes every app does empty the list at bedtime', () => {
  st.beginListEdit('night');
  delete fake.ids()['night-next']; // Apple's picker left with nothing picked
  assert.equal(st.finishListEdit('night', new Date(Date.now() + 1000)), 'bedtime');
  st.settleListChanges(new Date(Date.now() + 2000));
  assert.equal(fake.ids().night, undefined);
});

test('a waiting removal that settles while the picker is open is not read as an emptied list', () => {
  // A removal saved earlier waits for bedtime in the draft...
  const bedtime = Date.now() + 60_000;
  fake.ids()['night-next'] = 'fewer-picks';
  fake.state.store['locturne.pendingLists'] = { night: { from: bedtime } };
  // ...the picker opens on it, bedtime starts and swaps it in, then the picker closes unchanged.
  st.beginListEdit('night');
  assert.deepEqual(st.settleListChanges(new Date(bedtime)), ['night']);
  assert.equal(fake.ids()['night-next'], undefined);
  assert.equal(st.finishListEdit('night', new Date(bedtime + 24 * 3600_000)), 'now');
  assert.equal(st.listChangeStarts('night'), null, 'nothing waits to empty the list');
  assert.equal(fake.ids().night, 'fewer-picks');
});

for (const list of ['night', 'always'] as const) {
  test(`emptying the ${list} list in a picker opened on a waiting change that settled meanwhile still empties it`, () => {
    // 22:58: the picker opens on a removal waiting for 23:00, which settles with it open...
    const bedtime = Date.now() + 60_000;
    fake.ids()[list] = `${list}-picks`;
    fake.ids()[`${list}-next`] = 'fewer-picks';
    fake.state.store['locturne.pendingLists'] = { [list]: { from: bedtime } };
    st.beginListEdit(list);
    assert.deepEqual(st.settleListChanges(new Date(bedtime), { limits: false }), [list]);
    // ...then every app is deselected: the library removes the draft and reports no picks.
    st.notePickerSelection(`${list}-next`, 0);
    const next = new Date(bedtime + 24 * 3600_000);
    assert.equal(st.finishListEdit(list, next), 'bedtime');
    assert.equal(st.listChangeStarts(list)?.getTime(), next.getTime(), 'the removal of everything waits');
    assert.equal(fake.ids()[list], 'fewer-picks', 'still asleep until then');
    st.settleListChanges(next, { limits: false });
    assert.equal(fake.ids()[list], undefined, 'emptied at bedtime');
  });
}
