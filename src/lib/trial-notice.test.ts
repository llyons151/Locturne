import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { trialNotice } from './trial-notice.ts';

// Ends Saturday Oct 10, 2026 at 3pm local.
const ENDS = new Date(2026, 9, 10, 15, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0);

describe('trialNotice', () => {
  test('nothing without a trial, or before the last two days', () => {
    assert.equal(trialNotice(null, at(9, 12)), null);
    assert.equal(trialNotice(ENDS, at(4, 12)), null);
    assert.equal(trialNotice(ENDS, at(8, 14)), null);
  });

  test('shows from two days out, with the day named', () => {
    assert.match(trialNotice(ENDS, at(8, 16))!.title, /ends Saturday\.$/);
    assert.match(trialNotice(ENDS, at(9, 9))!.title, /ends tomorrow\.$/);
    assert.match(trialNotice(ENDS, at(10, 9))!.title, /ends today\.$/);
  });

  test('gone once the trial has ended', () => {
    assert.equal(trialNotice(ENDS, ENDS), null);
    assert.equal(trialNotice(ENDS, at(11, 9)), null);
  });

  test('says how to cancel, in his voice rules', () => {
    const notice = trialNotice(ENDS, at(9, 9))!;
    assert.match(notice.detail, /cancel/i);
    assert.ok(!`${notice.title}${notice.detail}`.includes('!'));
  });
});

test('a trial ending just after midnight is the night before’s', () => {
  // Started Sunday 00:30, it ends the next Sunday 00:30: that's Saturday night.
  const ends = new Date(2026, 9, 11, 0, 30);
  assert.equal(trialNotice(ends, new Date(2026, 9, 10, 23, 0))?.title, 'Your free trial ends tonight.');
  assert.equal(trialNotice(ends, new Date(2026, 9, 9, 9, 0))?.title, 'Your free trial ends tomorrow night.');
  // A daytime end is still its own day.
  assert.equal(trialNotice(new Date(2026, 9, 11, 9, 0), new Date(2026, 9, 10, 9, 0))?.title, 'Your free trial ends tomorrow.');
});
