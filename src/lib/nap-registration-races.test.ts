import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
let release: (() => void) | null = null;
let delayed = false;
let refuse = false;
let refuseOnce = false;
let napAtShield: unknown;
mock.module('react-native-device-activity', {
  namedExports: {
    ...fake.exports,
    blockSelection: (...args: unknown[]) => {
      napAtShield = fake.state.store['locturne.nap'];
      fake.exports.blockSelection(...args);
    },
    startMonitoring: async (name: string) => {
      if (delayed) await new Promise<void>((resolve) => { release = resolve; });
      if (refuse) throw new Error('registration refused');
      if (refuseOnce) { refuseOnce = false; throw new Error('registration refused'); }
      return fake.exports.startMonitoring(name);
    },
  },
});
const st = await import('./screen-time.ts');

beforeEach(() => {
  fake.reset();
  fake.ids().block = 'nap-apps';
  fake.ids().night = 'night-apps';
  delayed = true;
  release = null;
  refuse = false;
  refuseOnce = false;
  napAtShield = undefined;
});

test('a replacement nap is published before its final shield operation', async () => {
  delayed = false;
  const nap = await st.startNap('block', 15);
  assert.deepEqual(napAtShield, nap);
});

test('app rollback replaces native generation metadata with the names it actually restored', async () => {
  delayed = false;
  const prior = { ...fake.armedNight(), nativeWindowPrefix: 'night-native-old-' };
  st.sharedSet('locturne.armedNight', prior);
  fake.state.activities = ['night-native-old-0'];
  refuseOnce = true;
  await assert.rejects(st.armNight([{ name: 'night-0', start: 1380, end: 1425 }], 'night', { bedtime: 1380, morningStart: 480 }));
  assert.equal(st.getArmedNight()?.nativeWindowPrefix, undefined);
  assert.ok(fake.state.activities.includes('night-0'));
  assert.ok(!fake.state.activities.includes('night-native-old-0'));
  assert.equal(st.getArmedNight()?.since, prior.since);
});

test('native handoff is excluded for the whole app registration and released after success or failure', async () => {
  for (const failure of [false, true]) {
    fake.reset();
    refuse = failure;
    const pending = st.armNight([{ name: 'night-0', start: 1380, end: 1425 }], 'night', { bedtime: 1380, morningStart: 420 });
    assert.equal(typeof st.sharedGet('locturne.nightArmingAt'), 'number');
    const checked = failure ? assert.rejects(pending, /registration refused/) : pending;
    release!();
    await checked;
    assert.equal(st.sharedGet('locturne.nightArmingAt'), undefined);
  }
});

for (const renew of [false, true]) {
  test(`a pending nap cannot restart after stand-down${renew ? ' followed by renewal' : ''}`, async () => {
    const pending = st.startNap('block', 30);
    assert.ok(release, 'native registration is in flight');
    st.standDown();
    if (renew) await st.standUp();
    const rejected = assert.rejects(pending, /cancel|subscription/i);
    release!();
    await rejected;
    assert.equal(st.getNap(), null);
    assert.ok(!fake.state.activities.includes('locturne-nap'));
    assert.ok(!fake.shielded('blockSelection').includes('block'));
  });
}

test('two starts cannot register the shared nap activity concurrently', async () => {
  const first = st.startNap('block', 30);
  const finishFirst = release!;
  const second = st.startNap('night', 60);
  // Let either implementation settle its synchronous guard before releasing the first.
  // Release a wrongly accepted second too so the regression does not leave a hanging test.
  if (release !== finishFirst) release!();
  const rejected = assert.rejects(second, /already|starting/i);
  finishFirst();
  await first;
  await rejected;
  assert.equal(st.getNap()?.list, 'block');
  assert.equal(fake.state.activities.filter((name) => name === 'locturne-nap').length, 1);
});
