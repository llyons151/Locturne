/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { downstairsLine, stepsLine } from './lines.ts';

test('steps lines follow the line bank at 0, 80, 160 and 200 of 200', () => {
  assert.equal(stepsLine(0, 200), 'No.');
  assert.equal(stepsLine(80, 200), "I can hear you walking. I'm ignoring it.");
  assert.equal(stepsLine(160, 200), 'Fine. *Fine.*');
  assert.equal(stepsLine(200, 200), "I'm up. Don't talk to me yet.");
});

test('his lines never shout', () => {
  const all = [
    ...[0, 50, 100, 199, 200].map((n) => stepsLine(n, 200)),
    ...(['idle', 'waiting', 'moving', 'holding', 'met', 'timedOut', 'noSignal', 'flat'] as const).map((s) =>
      downstairsLine(s, 0.6),
    ),
  ];
  for (const line of all) assert.ok(!line.includes('!'), line);
});
