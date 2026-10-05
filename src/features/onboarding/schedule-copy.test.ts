import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstEnabledNight, scheduleCopy } from './schedule-copy.ts';

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

test('paywall rerun on an off night names the next enabled night and wake-up', () => {
  const now = at(5, 20); // Monday evening, Tuesday night enabled.
  const night = firstEnabledNight(23 * 60, 7 * 60, [2], now)!;
  assert.equal(night.start.getTime(), at(6, 23).getTime());
  assert.equal(night.end.getTime(), at(7, 7).getTime());
  const copy = scheduleCopy(night, now);
  assert.equal(copy.when, 'Tomorrow');
  assert.match(copy.sleep, /tomorrow at 11:00 PM/);
  assert.match(copy.armed, /Tomorrow at 11:00 PM/);
  assert.match(copy.morning, /Wednesday 7:00 AM/);
});

test('all-off schedules promise no night block or wake-up', () => {
  const now = at(5, 23);
  const night = firstEnabledNight(23 * 60, 7 * 60, [], now);
  assert.equal(night, null);
  assert.equal(scheduleCopy(night, now).sleep, 'Every night is switched off in Routine.');
});

test('after midnight the active night is selected by the prior evening, including night shifts', () => {
  for (const [bedtime, morning, hour] of [[60, 7 * 60, 2], [8 * 60, 16 * 60, 9]]) {
    const now = at(6, hour);
    const night = firstEnabledNight(bedtime, morning, [1], now)!;
    assert.equal(night.start.getTime(), at(6, bedtime / 60).getTime());
    assert.equal(scheduleCopy(night, now).when, 'Now');
    const off = firstEnabledNight(bedtime, morning, [2], now)!;
    assert.equal(off.start.getTime(), at(7, bedtime / 60).getTime());
    assert.equal(scheduleCopy(off, now).when, 'Tomorrow');
  }
});

test('completed mornings plan the next enabled night instead of promising an immediate lock', () => {
  const now = at(6, 8);
  const night = firstEnabledNight(23 * 60, 7 * 60, [1], now)!;
  assert.equal(night.start.getTime(), at(12, 23).getTime());
  assert.equal(scheduleCopy(night, now).when, 'Monday');
});
