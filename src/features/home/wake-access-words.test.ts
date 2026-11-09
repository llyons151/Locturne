import assert from 'node:assert/strict';
import { test } from 'node:test';

const WAKE_METHODS = ['steps', 'dance', 'scan', 'place', 'pushups', 'downtime'] as const;
import { wakeAccessHero, wakeFixLabel, wakeNeedFor } from './wake-access-words.ts';

test('each wake-up names the permission it needs and says the apps won’t wake', () => {
  assert.equal(wakeNeedFor('steps'), 'motion');
  assert.equal(wakeNeedFor('downtime'), 'motion');
  assert.equal(wakeNeedFor('place'), 'location');
  assert.equal(wakeFixLabel('downtime'), 'Turn on Motion & Fitness');
  assert.equal(wakeFixLabel('dance'), 'Turn on Camera');
  for (const m of ['scan', 'pushups', 'dance'] as const) assert.equal(wakeNeedFor(m), 'camera');
  for (const m of WAKE_METHODS) {
    const hero = wakeAccessHero(m);
    assert.match(hero.title, /is off\.$/);
    assert.match(hero.body, /your apps won’t wake/);
  }
});
