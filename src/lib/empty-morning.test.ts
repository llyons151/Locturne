import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });
const st = await import('./screen-time.ts');
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const passes = await import('./passes.ts');

const now = new Date(2026, 9, 6, 8);
beforeEach(() => {
  fake.reset();
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now });
  fake.arm(new Date(2026, 9, 1));
  fake.state.activities = ['night-0'];
  rt.saveRoutine(rt.DEFAULT_ROUTINE, new Date(2026, 9, 1, 12));
  fake.ids().always = 'always-picks';
});

test('an emptied bedtime list requires no morning proof and spends no pass', () => {
  assert.equal(st.selectionSize('night'), 0);
  assert.equal(lc.readLock(now).phase, 'day');
  assert.equal(passes.spendPass(now), 'notMorning');
  assert.deepEqual(passes.getPassLedger().spent, []);
  assert.equal(lc.proveMorning('steps', now), null);
  lc.syncLock(now);
  assert.ok(fake.shielded('blockSelection').includes('always'), 'always blocking remains independent');
});

test('a removal waiting for bedtime does not free the current morning', () => {
  fake.ids().night = 'night-picks';
  st.beginListEdit('night');
  st.clearSelection('night-next');
  st.finishListEdit('night', new Date(2026, 9, 6, 23));
  assert.ok(st.selectionSize('night') > 0);
  assert.equal(lc.readLock(now).phase, 'morning');
});
