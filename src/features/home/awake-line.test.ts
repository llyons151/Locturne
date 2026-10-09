/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { awakeLine, dayHero, napHero, offHero, unheldLine } from './awake-line.ts';

describe('awakeLine', () => {
  test('an armed night names its bedtime', () => {
    assert.equal(awakeLine({ armed: true, stoodDown: false, tonightAt: '11 pm', alwaysSleeps: true }), 'Apps awake until 11 pm');
  });

  test('a night off says so', () => {
    assert.equal(awakeLine({ armed: true, stoodDown: false, tonightAt: null, alwaysSleeps: false }), 'Apps awake. Tonight is off.');
  });

  test('a night off with always-asleep apps says they still sleep', () => {
    assert.equal(
      awakeLine({ armed: true, stoodDown: false, tonightAt: null, alwaysSleeps: true }),
      'Bedtime apps awake. Tonight is off. Always-asleep apps still sleep.',
    );
  });

  test('stood down (lapsed, never bought, Ask to Buy waiting): nothing is scheduled, always list included', () => {
    for (const tonightAt of ['11 pm', null]) {
      const line = awakeLine({ armed: false, stoodDown: true, tonightAt, alwaysSleeps: true });
      assert.equal(line, 'Apps awake. Nothing is scheduled to sleep.');
      assert.doesNotMatch(line, /until|Always/);
    }
  });

  test('arming failed: no bedtime named, and the always list still sleeps', () => {
    const line = awakeLine({ armed: false, stoodDown: false, tonightAt: '11 pm', alwaysSleeps: true });
    assert.doesNotMatch(line, /until/);
    assert.match(line, /Always-asleep apps still sleep/);
  });

  test('nothing armed and no always-asleep apps picked: nothing is said to sleep', () => {
    const line = awakeLine({ armed: false, stoodDown: false, tonightAt: '11 pm', alwaysSleeps: false });
    assert.equal(line, 'Apps awake. Nothing is scheduled to sleep.');
    assert.doesNotMatch(line, /until|Always/);
  });
});

test('awakeLine: an armed night with no bedtime apps names no bedtime', () => {
  const line = awakeLine({ armed: true, stoodDown: false, tonightAt: '11 pm', alwaysSleeps: false, noBedtimeApps: true });
  assert.equal(line, 'No bedtime apps picked, so nothing sleeps at bedtime.');
  assert.doesNotMatch(line, /until/);
});

describe('unheldLine', () => {
  test('a night nothing holds says tonight', () => {
    assert.equal(
      unheldLine({ phase: 'night', alwaysSleeps: true, unpaid: false }),
      'Bedtime apps awake tonight. Always-asleep apps still sleep.',
    );
    assert.equal(unheldLine({ phase: 'night', alwaysSleeps: false, unpaid: false }), 'Apps awake. Nothing is asleep tonight.');
  });

  test('a morning nothing holds (after the last paid one) never says tonight', () => {
    for (const alwaysSleeps of [true, false]) {
      for (const unpaid of [true, false]) {
        const line = unheldLine({ phase: 'morning', alwaysSleeps, unpaid });
        assert.doesNotMatch(line, /tonight/);
        assert.match(line, /this morning/);
      }
    }
  });

  test('stood down or unpaid: the always list is never promised to sleep', () => {
    for (const phase of ['night', 'morning'] as const) {
      assert.doesNotMatch(unheldLine({ phase, alwaysSleeps: false, unpaid: false }), /Always/);
      assert.doesNotMatch(unheldLine({ phase, alwaysSleeps: false, unpaid: true }), /Always/);
      // Unpaid but not stood down yet (opened offline): it may still be shielded, so it isn't
      // said to be awake either.
      assert.equal(unheldLine({ phase, alwaysSleeps: true, unpaid: true }), `Bedtime apps awake ${phase === 'morning' ? 'this morning' : 'tonight'}.`);
    }
  });
});

describe('dayHero', () => {
  const base = { scheduled: true, line: 'Apps awake until 11:00 PM', until: '8h', sleepsAt: '11:00 PM' };

  test('armed and paid: counts down to bedtime', () => {
    assert.deepEqual(dayHero({ ...base, attention: null }), {
      title: 'Bedtime in 8h',
      body: 'Your apps go to sleep at 11:00 PM. Start winding down before then.',
    });
  });

  test('no subscription (stood down, never bought): his status leads, no bedtime named', () => {
    const hero = dayHero({
      ...base,
      scheduled: false,
      attention: { title: 'No subscription, so nothing sleeps.', detail: 'Your setup is saved.' },
    });
    assert.equal(hero.title, 'No subscription, so nothing sleeps.');
    assert.doesNotMatch(`${hero.title} ${hero.body}`, /Bedtime in|go to sleep at/);
  });

  test('nothing scheduled without a health warning: says so instead of a bedtime', () => {
    const line = awakeLine({ armed: false, stoodDown: true, tonightAt: '11:00 PM', alwaysSleeps: true });
    const hero = dayHero({ ...base, scheduled: false, line, attention: null });
    assert.equal(hero.body, 'Apps awake. Nothing is scheduled to sleep.');
    assert.doesNotMatch(`${hero.title} ${hero.body}`, /Bedtime in|11:00 PM/);
  });

  test('tonight off: says so and names the next night, no countdown that reads as tonight', () => {
    const hero = dayHero({ ...base, until: '61h', attention: null, offTonight: 'Sunday' });
    assert.deepEqual(hero, { title: 'Tonight is off', body: 'Your next bedtime is 11:00 PM on Sunday.' });
  });

  test('every night off', () => {
    assert.equal(dayHero({ ...base, sleepsAt: null, until: null, attention: null }).title, 'No bedtime scheduled');
  });
});

describe('napHero', () => {
  test('a Block now by day says the apps are asleep and until when, not the bedtime countdown', () => {
    const hero = napHero('3:12 PM');
    assert.equal(hero.title, 'Your apps are asleep');
    assert.match(hero.body, /until 3:12 PM\./);
    assert.doesNotMatch(`${hero.title} ${hero.body}`, /Bedtime in|go to sleep at/);
  });
});

describe('offHero', () => {
  test('a night off with apps on the always list says they still sleep', () => {
    const hero = offHero(true);
    assert.equal(hero.title, 'Night off');
    assert.equal(hero.body, 'Bedtime apps awake tonight. Always-asleep apps still sleep.');
    assert.doesNotMatch(hero.body, /Nothing sleeps/);
  });

  test('with nothing on the always list (or it stood down), nothing sleeps', () => {
    assert.match(offHero(false).body, /Nothing sleeps tonight/);
  });
});
