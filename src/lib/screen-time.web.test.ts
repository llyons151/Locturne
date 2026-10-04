/// <reference types="node" />

/**
 * Off iOS (the web preview), react-native-device-activity's stubs return a Promise from
 * every call, `userDefaultsGet` included. screen-time.ts must read its memory store instead,
 * or `getLimits().map` throws and Home, You, Wake, Scan and Exits crash on web.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', {
  namedExports: { ...fake.exports, userDefaultsGet: () => Promise.resolve() },
});

const st = await import('./screen-time.ts');

test('every App Group read works when Screen Time is unavailable', () => {
  assert.deepEqual(st.getLimits(), []);
  assert.equal(st.getArmedNight(), null);
  assert.equal(st.isNightHeld(), false);
  assert.equal(st.peekNap(), null);
  assert.equal(st.limitUsedUpToday('limit-0'), false);
  assert.doesNotThrow(() => st.clearSelection('night'));
});
