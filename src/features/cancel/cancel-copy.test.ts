/// <reference types="node" />

/** The cancel flow's words and which reasons get a fix before the offer (cancel-copy.ts). */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fixFor, offerTerms, REASONS, recordLine, sampleOffer } from './cancel-copy.ts';

test('price and "something else" go straight to the offer; the rest get a fix first', () => {
  assert.equal(fixFor('price'), null);
  assert.equal(fixFor('other'), null);
  assert.equal(fixFor(null), null);
  for (const reason of ['hard', 'unused', 'fixed'] as const) assert.equal(fixFor(reason)?.to, 'routine');
  assert.equal(fixFor('broken')?.to, 'email');
  assert.equal(new Set(REASONS.map((r) => r.value)).size, REASONS.length);
});

test('the record line counts mornings, and is gentle before the first', () => {
  assert.equal(recordLine(0), 'Leaving before the first morning?');
  assert.equal(recordLine(1), 'You got up 1 morning with me.');
  assert.equal(recordLine(47), 'You got up 47 mornings with me.');
});

test('the offer says its price, that nothing is charged today, and what it renews at', () => {
  const annual = offerTerms(sampleOffer('annual'));
  assert.equal(annual.price, '$29.99');
  assert.equal(annual.unit, 'for your next year');
  assert.match(annual.terms, /nothing is charged today/);
  assert.match(annual.terms, /renews at \$59\.99 a year/);
  const monthly = offerTerms(sampleOffer('monthly'));
  assert.equal(monthly.unit, 'a month for 3 months');
  assert.match(monthly.terms, /renews at \$9\.99 a month/);
});
