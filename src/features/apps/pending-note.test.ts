/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { clock, pauseNote, removalNote, startsLabel } from './pending-note.ts';

// 2026-10-05 is a Monday.
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);

describe('removalNote', () => {
  test('made in the day: tonight at bedtime', () => {
    const line = removalNote(at(5, 23), at(5, 14));
    assert.equal(line, `Apps you removed stay asleep. Your change starts at ${clock(at(5, 23))}.`);
  });

  test('made after bedtime: names tomorrow, not a time already passed', () => {
    const line = removalNote(at(6, 23), at(5, 23, 30));
    assert.equal(line, `Apps you removed stay asleep. Your change starts tomorrow at ${clock(at(6, 23))}.`);
  });

  test('an after-midnight bedtime reads as tonight', () => {
    assert.equal(startsLabel(at(6, 1), at(5, 14)), `at ${clock(at(6, 1))}`);
  });
});

describe('pauseNote', () => {
  test('the night of the unlock names tonight and the morning', () => {
    const line = pauseNote({ morning: 'tomorrow morning', resumes: at(6, 23), weekday: null }, true);
    assert.equal(line, `Awake tonight and tomorrow morning after an emergency unlock. They sleep again at ${clock(at(6, 23))}.`);
  });

  test('the next day drops "tonight"', () => {
    const line = pauseNote({ morning: 'this morning', resumes: at(6, 23), weekday: null }, false);
    assert.equal(line, `Awake after an emergency unlock. They sleep again at ${clock(at(6, 23))}.`);
    assert.doesNotMatch(line, /tonight/);
  });

  test('the next night off: names the night that is on, with its weekday', () => {
    const line = pauseNote({ morning: 'tomorrow morning', resumes: at(8, 23), weekday: 'Thursday' }, true);
    assert.match(line, new RegExp(`They sleep again at ${clock(at(8, 23))} on Thursday\\.$`));
  });

  test('every night off: they stay awake', () => {
    const line = pauseNote({ morning: 'tomorrow morning', resumes: null, weekday: null }, true);
    assert.match(line, /Every night is switched off, so they stay awake\.$/);
    assert.doesNotMatch(line, /sleep again/);
  });
});
