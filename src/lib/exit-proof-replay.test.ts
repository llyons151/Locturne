import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { simDevice, token } from './sim-device.ts';

const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const { spendPass } = await import('./passes.ts');
const { emergencyUnlock } = await import('./emergency.ts');
const { proofUnlocks } = await import('./morning-proof.ts');
const { armTonight } = await import('./arm.ts');
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m).getTime();

afterEach(() => { mock.timers.reset(); device.reset(); });

function advance(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
  }
  mock.timers.setTime(to);
}

for (const kind of ['pass', 'emergency'] as const) {
  test(`${kind} does not replay after a new routine night sharing the same morning date`, async () => {
    // Drain any arming queued by the previous test before resetting its simulated phone.
    for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
    device.reset();
    mock.timers.enable({ apis: ['Date'], now: at(5, 12) });
    device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
    lc.settleSubscription(true);
    const routine = { ...rt.DEFAULT_ROUTINE, bedtime: 21 * 60 };
    rt.saveRoutine(routine);
    assert.equal((await armTonight()).status, 'armed');
    advance(at(6, 7, 30));
    if (kind === 'pass') assert.equal(spendPass(), null);
    else assert.ok(emergencyUnlock());
    assert.equal(lc.readLock().phase, 'day');
    advance(at(6, 10));
    rt.saveRoutine({ ...routine, bedtime: 20 * 60, morningStart: 22 * 60 }, new Date(), lc.inPendingFirstNight(new Date()));
    lc.syncLock();
    await lc.armRoutine();
    advance(at(6, 20, 30));
    assert.equal(lc.syncLock().phase, 'night');
    advance(at(6, 22, 5));
    assert.equal(lc.syncLock().phase, 'morning');
    assert.ok(device.state.shielded.has('tiktok'));
    assert.equal(lc.currentProof(), null);
    assert.equal(lc.proveMorning('steps')?.phase, 'day');
  });

  test(`${kind} intended before its own bedtime still covers that morning`, () => {
    const proof = { kind, morningKey: '2026-10-06', at: at(5, 21), bedtime: 23 * 60, morningStart: 7 * 60 };
    assert.equal(proofUnlocks(proof, { key: proof.morningKey, nightStart: new Date(at(5, 23)), ran: true }), true);
  });
}

test('a renewal free morning does not cover a later new night sharing its date', async () => {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
  device.reset();
  mock.timers.enable({ apis: ['Date'], now: at(5, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  const routine = { ...rt.DEFAULT_ROUTINE, bedtime: 21 * 60 };
  rt.saveRoutine(routine);
  await armTonight();
  advance(at(5, 23));
  lc.settleSubscription(false);
  advance(at(7, 7, 30));
  lc.settleSubscription(true);
  await lc.armRoutine();
  assert.equal(lc.readLock().phase, 'day');
  advance(at(7, 10));
  rt.saveRoutine({ ...routine, bedtime: 20 * 60, morningStart: 22 * 60 }, new Date(), lc.inPendingFirstNight(new Date()));
  lc.syncLock();
  await lc.armRoutine();
  advance(at(7, 20, 30));
  assert.equal(lc.syncLock().phase, 'night');
  advance(at(7, 22, 5));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(device.state.shielded.has('tiktok'));
});

test('an emergency pause needs no proof after travel changes the morning date', async () => {
  const zone = process.env.TZ;
  try {
    for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
    device.reset();
    process.env.TZ = 'Pacific/Chatham';
    mock.timers.enable({ apis: ['Date'], now: new Date(2026, 3, 7, 12).getTime() });
    device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
    device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['news']) });
    lc.settleSubscription(true);
    rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 0, morningStart: 330 });
    await armTonight();
    advance(new Date(2026, 3, 9, 3, 19, 26).getTime());
    const use = emergencyUnlock();
    assert.ok(use?.pauseNight);
    process.env.TZ = 'UTC';
    advance(Date.UTC(2026, 3, 8, 17, 51, 30));
    assert.equal(lc.syncLock().phase, 'day');
    assert.equal(lc.proveMorning('steps'), null);
    assert.equal(device.state.shielded.has('tiktok'), false);
    assert.ok(device.state.shielded.has('news'));
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});
