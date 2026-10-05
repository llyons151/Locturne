/// <reference types="node" />

/**
 * Daily limits against the simulated phone (sim-device.ts): iOS counts usage of the picks it
 * was handed when the limit was armed, so a change to the picks has to reach it. Needs
 * `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
const st = await import('./screen-time.ts');
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const dl = await import('./daily-limits.ts');
const { armTonight } = await import('./arm.ts');

function advance(to: number) {
  const due = device.dueEvents(Date.now(), to);
  for (const e of due) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
  }
  mock.timers.setTime(to);
}

test('a limit whose removal waits for bedtime is settled and re-armed with the new picks on the next open', async () => {
  mock.timers.enable({
    apis: ['Date'],
    now: new Date(2026, 9, 5, 14, 0).getTime(),
  });
  const ids = (o: Record<string, string>) =>
    device.exports.userDefaultsSet('familyActivitySelectionIds', {
      ...device.ids(),
      ...o,
    });
  ids({ night: token(['tiktok']), 'limit-0': token(['fb', 'yt']) });
  rt.saveRoutine({
    ...rt.DEFAULT_ROUTINE,
    bedtime: 23 * 60,
    morningStart: 7 * 60,
    activeNights: [0, 1, 2, 3, 4, 5, 6],
  });
  lc.settleSubscription(true);
  await new Promise((r) => setImmediate(r));
  const armed = await armTonight();
  assert.equal(armed.status, 'armed');
  const limit = { id: 'limit-0' as const, minutes: 30 };
  st.saveLimits([limit]);
  await st.armLimit(limit);

  // 15:00: remove yt from the limit (Apps tab)
  mock.timers.setTime(new Date(2026, 9, 5, 15, 0).getTime());
  st.beginListEdit('limit-0');
  ids({ 'limit-0-next': token(['fb']) });
  assert.equal(st.finishListEdit('limit-0', dl.looserEditsStart(new Date(), st.getArmedNight())), 'bedtime');
  await st.armLimit(st.getLimits()[0]); // pickedLimit re-arms with the live (union) list

  // The app stays closed past bedtime (the extension leaves a limit's list alone). Next morning it opens.
  advance(new Date(2026, 9, 6, 8, 0).getTime());
  lc.syncLock();
  await st.settleLimitChanges();
  lc.syncLock();
  const sel = device.state.monitored.get('limit-0')!.events[0].familyActivitySelection;
  assert.equal(sel, token(['fb']), 'iOS should count only fb after the removal applied');
});
