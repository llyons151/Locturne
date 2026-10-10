/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  editLimit,
  freeLimitId,
  isLimitId,
  limitLabel,
  looserEditsStart,
  MAX_LIMITS,
  renameLimit,
  settleLimits,
  type DailyLimit,
} from './daily-limits.ts';

/** Thursday 2026-10-01 at hh:mm, local time. */
function at(hh: number, mm = 0, day = 1): Date {
  return new Date(2026, 9, day, hh, mm);
}

const bedtime = at(23, 30);
const thirty: DailyLimit[] = [{ id: 'limit-0', minutes: 30 }];

describe('editing a limit', () => {
  test('a new limit starts now', () => {
    assert.deepEqual(editLimit([], 'limit-1', 45, bedtime), [{ id: 'limit-1', minutes: 45 }]);
  });

  test('a stricter limit starts now', () => {
    assert.deepEqual(editLimit(thirty, 'limit-0', 15, bedtime), [{ id: 'limit-0', minutes: 15 }]);
  });

  test('a looser limit waits for bedtime', () => {
    assert.deepEqual(editLimit(thirty, 'limit-0', 60, bedtime), [
      { id: 'limit-0', minutes: 30, pending: { minutes: 60, from: bedtime.getTime() } },
    ]);
  });

  test('removing a limit waits for bedtime too', () => {
    assert.deepEqual(editLimit(thirty, 'limit-0', null, bedtime), [
      { id: 'limit-0', minutes: 30, pending: { minutes: null, from: bedtime.getTime() } },
    ]);
  });

  test('going back to the current limit cancels a waiting loosening', () => {
    const loosened = editLimit(thirty, 'limit-0', 120, bedtime);
    assert.deepEqual(editLimit(loosened, 'limit-0', 30, bedtime), thirty);
  });

  test('a second loosening never brings the first one forward', () => {
    const midnight = at(0, 0, 2);
    const once = editLimit(thirty, 'limit-0', 60, midnight, at(9));
    assert.deepEqual(editLimit(once, 'limit-0', 120, at(21), at(20)), [
      { id: 'limit-0', minutes: 30, pending: { minutes: 120, from: midnight.getTime(), dated: at(9).getTime() } },
    ]);
    // A later start wins, dated now.
    assert.deepEqual(editLimit(once, 'limit-0', null, at(23, 0, 2), at(20)), [
      { id: 'limit-0', minutes: 30, pending: { minutes: null, from: at(23, 0, 2).getTime(), dated: at(20).getTime() } },
    ]);
  });

  test('removing a limit that does not exist changes nothing', () => {
    assert.deepEqual(editLimit(thirty, 'limit-2', null, bedtime), thirty);
  });
});

describe('settling at bedtime', () => {
  const waiting: DailyLimit[] = [
    { id: 'limit-0', minutes: 30, pending: { minutes: 60, from: bedtime.getTime() } },
    { id: 'limit-1', minutes: 15, pending: { minutes: null, from: bedtime.getTime() } },
    { id: 'limit-2', minutes: 45 },
  ];

  test('nothing changes before bedtime', () => {
    const settled = settleLimits(waiting, at(23, 29));
    assert.deepEqual(settled, { limits: waiting, rearm: [], removed: [] });
  });

  test('at bedtime, looser limits apply and removed ones go', () => {
    const settled = settleLimits(waiting, bedtime);
    assert.deepEqual(settled.limits, [
      { id: 'limit-0', minutes: 60 },
      { id: 'limit-2', minutes: 45 },
    ]);
    assert.deepEqual(settled.rearm, [{ id: 'limit-0', minutes: 60 }]);
    assert.deepEqual(settled.removed, ['limit-1']);
  });
});

describe('naming a limit', () => {
  const social: DailyLimit[] = [{ id: 'limit-0', name: 'Social', minutes: 30 }];

  test('a name saves at once, trimmed, and a blank one clears it', () => {
    assert.deepEqual(renameLimit(thirty, 'limit-0', '  Social '), social);
    assert.deepEqual(renameLimit(social, 'limit-0', '   '), thirty);
  });

  test('the name carries over stricter, looser and settled edits', () => {
    assert.deepEqual(editLimit(social, 'limit-0', 15, bedtime), [{ id: 'limit-0', name: 'Social', minutes: 15 }]);
    const loosened = editLimit(social, 'limit-0', 60, bedtime);
    assert.equal(loosened[0].name, 'Social');
    assert.deepEqual(settleLimits(loosened, bedtime).limits, [{ id: 'limit-0', name: 'Social', minutes: 60 }]);
  });
});

describe('slots', () => {
  test('the first free slot, then none once all are used', () => {
    assert.equal(freeLimitId([]), 'limit-0');
    assert.equal(freeLimitId([{ id: 'limit-0', minutes: 30 }, { id: 'limit-2', minutes: 30 }]), 'limit-1');
    const full = Array.from({ length: MAX_LIMITS }, (_, i) => ({ id: `limit-${i}` as const, minutes: 30 }));
    assert.equal(freeLimitId(full), null);
  });

  test('only our slots count as limit ids', () => {
    assert.equal(isLimitId('limit-0'), true);
    assert.equal(isLimitId(`limit-${MAX_LIMITS}`), false);
    assert.equal(isLimitId('night'), false);
  });
});

describe('when looser edits start', () => {
  const night = { bedtime: 23 * 60 + 30, morningStart: 7 * 60 };

  test('the next bedtime, and from bed the one after', () => {
    assert.deepEqual(looserEditsStart(at(14), night), at(23, 30));
    assert.deepEqual(looserEditsStart(at(23, 45), night), at(23, 30, 2));
  });

  test('midnight when no night is armed', () => {
    assert.deepEqual(looserEditsStart(at(14), null), at(0, 0, 2));
  });
});

test('labels', () => {
  assert.equal(limitLabel(15), '15 min');
  assert.equal(limitLabel(60), '1 hr');
  assert.equal(limitLabel(90), '1 hr 30 min');
});
