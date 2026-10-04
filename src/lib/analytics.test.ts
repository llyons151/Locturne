/// <reference types="node" />

/** The analytics privacy rules (docs/ANALYTICS.md, "Privacy") and the queue before startup. */
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
  ageBracket,
  answerFor,
  resetAnalytics,
  setAnalyticsSink,
  stopForChild,
  track,
  type AnalyticsSink,
} from './analytics.ts';

function fakeSink() {
  const captured: { event: string; properties: unknown }[] = [];
  let optedOut = false;
  const sink: AnalyticsSink = {
    capture: (event, properties) => captured.push({ event, properties }),
    screen: () => {},
    register: () => {},
    setPerson: () => {},
    optOut: () => {
      optedOut = true;
    },
  };
  return { sink, captured, optedOut: () => optedOut };
}

beforeEach(resetAnalytics);

test('age leaves the phone as a bracket, and not at all under 13', () => {
  assert.equal(ageBracket(12), null);
  assert.equal(ageBracket(13), '13-17');
  assert.equal(ageBracket(17), '13-17');
  assert.equal(ageBracket(18), '18-24');
  assert.equal(ageBracket(34), '25-34');
  assert.equal(ageBracket(35), '35+');
  assert.deepEqual(answerFor('age', { age: 16 }), { question: 'age_bracket', answer: '13-17' });
  assert.equal(answerFor('age', { age: 11 }), null);
});

test('only quiz steps send an answer, and only once given', () => {
  assert.deepEqual(answerFor('found', { found: 'tiktok' }), { question: 'found', answer: 'tiktok' });
  assert.deepEqual(answerFor('night-minutes', { nightMinutes: 45 }), { question: 'nightMinutes', answer: 45 });
  assert.equal(answerFor('found', {}), null);
  // Apps, bedtime and wake times have no step mapping, so they can never be sent.
  for (const step of ['apps', 'bedtime', 'wake', 'walk', 'hello']) {
    assert.equal(answerFor(step, { found: 'tiktok', age: 20 }), null);
  }
});

test('events tracked before startup are sent once the sink is set', () => {
  track('apps_picked', { count: 3 });
  const fake = fakeSink();
  setAnalyticsSink(fake.sink);
  track('walk_started', {});
  assert.deepEqual(
    fake.captured.map((c) => c.event),
    ['apps_picked', 'walk_started'],
  );
});

test('under 13: opt out, and nothing more is sent or queued', () => {
  const fake = fakeSink();
  setAnalyticsSink(fake.sink);
  stopForChild();
  track('apps_picked', { count: 3 });
  assert.equal(fake.optedOut(), true);
  assert.equal(fake.captured.length, 0);
});

test('a sink that throws never breaks the caller', () => {
  setAnalyticsSink({ ...fakeSink().sink, capture: () => { throw new Error('offline'); } });
  assert.doesNotThrow(() => track('walk_started', {}));
});
