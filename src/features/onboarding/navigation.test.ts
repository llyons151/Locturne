/// <reference types="node" />

/**
 * Moving through onboarding (navigation.ts): next, back, and the two edit paths, from the
 * "Tonight's lock is ready" summary and from the walk's "Pick another way".
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { Answers } from './content.ts';
import {
  canGoBack,
  currentStep,
  isEditing,
  isStep,
  navigate,
  nextStep,
  startNav,
  STEPS,
  type Nav,
  type NavAction,
  type StepId,
} from './navigation.ts';

/** content.ts's `initialAnswers` (content.ts itself needs the app's `@/` paths to load). */
const initialAnswers: Answers = { bedtime: 23 * 60 + 30, wake: 7 * 60, apps: [], plan: 'annual', remindTrial: true };

const run = (nav: Nav, ...actions: NavAction[]) => actions.reduce(navigate, nav);
const next: NavAction = { type: 'next' };
const back: NavAction = { type: 'back' };
const set = (answers: Partial<Answers>): NavAction => ({ type: 'set', answers });
const edit = (to: StepId): NavAction => ({ type: 'edit', to });

/** Walks forward from `from` until `to` is on screen. */
function reach(to: StepId, from: Nav = startNav('hello', initialAnswers)): Nav {
  let nav = from;
  for (let i = 0; currentStep(nav) !== to; i++) {
    assert.ok(i < STEPS.length, `never reached ${to}`);
    nav = navigate(nav, next);
  }
  return nav;
}

describe('forward', () => {
  test('Continue goes through every step in order, and stops at the last', () => {
    const nav = reach('first-morning');
    assert.deepEqual(nav.history, [...STEPS]);
    assert.equal(currentStep(navigate(nav, next)), 'first-morning');
  });

  test('the demo comes before the walk, and late at night the walk is skipped', () => {
    assert.equal(nextStep('tomorrow'), 'walk');
    assert.equal(nextStep('tomorrow', ['walk']), 'screen-time');
    const nav = run(reach('tomorrow'), { type: 'next', skip: ['walk'] });
    assert.equal(currentStep(nav), 'screen-time');
    assert.equal(currentStep(navigate(nav, back)), 'tomorrow', 'Back returns to the demo, not the skipped walk');
  });

  test('the side steps rejoin the main path', () => {
    assert.equal(nextStep('under-13'), 'alarm');
    assert.equal(nextStep('declined'), 'plans');
  });

  test('`?step=` accepts real steps and `declined` only', () => {
    assert.ok(isStep('walk'));
    assert.ok(isStep('declined'));
    assert.ok(!isStep('under-13'), 'the age gate can’t be jumped to');
    assert.ok(!isStep('nope'));
    assert.ok(!isStep(undefined));
  });

  test('answers are kept as they’re given', () => {
    const nav = run(startNav('hello', initialAnswers), set({ bedtime: 22 * 60 }), set({ method: 'steps' }));
    assert.equal(nav.answers.bedtime, 22 * 60);
    assert.equal(nav.answers.method, 'steps');
    assert.equal(nav.answers.wake, initialAnswers.wake);
  });
});

describe('back', () => {
  test('goes to the step before, and not past the first', () => {
    const nav = reach('nights');
    assert.equal(currentStep(navigate(nav, back)), 'deal');
    const first = startNav('hello', initialAnswers);
    assert.equal(canGoBack(first), false);
    assert.equal(navigate(first, back), first);
  });

  test('steps over the math screen, which would bounce straight forward again', () => {
    const nav = reach('reveal');
    assert.equal(currentStep(navigate(nav, back)), 'time-back');
  });

  test('never steps over the first screen, even when it moves on by itself', () => {
    const nav = run(startNav('math', initialAnswers), next);
    assert.equal(currentStep(nav), 'reveal');
    assert.deepEqual(navigate(nav, back).history, ['math']);
  });

  test('a second next from the same screen does nothing', () => {
    const nav = reach('armed');
    const sent = { type: 'next', at: nav.history.length } as const;
    const once = navigate(nav, sent);
    assert.equal(currentStep(once), 'first-morning');
    assert.equal(navigate(once, sent), once);
  });

  test('the under-13 screen has no Back', () => {
    const nav = run(reach('age'), { type: 'go', to: 'under-13' });
    assert.equal(canGoBack(nav), false);
    assert.equal(navigate(nav, back), nav);
  });

  test('after purchase the stack starts again, with no way back to the paywall', () => {
    const nav = run(reach('offer'), { type: 'reset', to: 'armed' });
    assert.deepEqual(nav.history, ['armed']);
    assert.equal(canGoBack(nav), false);
    assert.equal(currentStep(navigate(nav, next)), 'first-morning');
  });

  test('the paywall exit, then Continue, reaches the plans', () => {
    const nav = run(reach('offer'), { type: 'go', to: 'declined' }, next);
    assert.equal(currentStep(nav), 'plans');
  });
});

describe('editing from the summary', () => {
  const summary = () => reach('ready', run(startNav('hello', initialAnswers), set({ method: 'downstairs' })));

  test('Save returns to the summary without stacking a second copy', () => {
    const before = summary();
    const nav = run(before, edit('bedtime'), set({ bedtime: 22 * 60 }), next);
    assert.equal(currentStep(nav), 'ready');
    assert.deepEqual(nav.history, before.history);
    assert.equal(nav.answers.bedtime, 22 * 60);
    assert.equal(nav.returnTo, null);
    assert.equal(nav.beforeEdit, null);
  });

  test('while editing, the step knows it (its button says Save)', () => {
    const nav = run(summary(), edit('wake'));
    assert.equal(isEditing(nav), true);
    assert.equal(nav.returnTo, 'ready');
    assert.equal(isEditing(run(nav, next)), false);
  });

  test('Back cancels the edit: the answer goes back to what it was', () => {
    const before = summary();
    const nav = run(before, edit('wake'), set({ wake: 5 * 60 }), back);
    assert.equal(currentStep(nav), 'ready');
    assert.equal(nav.answers.wake, before.answers.wake);
    assert.equal(nav.returnTo, null);
  });

  test('a cancelled edit doesn’t undo answers given before it', () => {
    const before = run(summary(), edit('bedtime'), set({ bedtime: 22 * 60 }), next);
    const nav = run(before, edit('wake'), set({ wake: 5 * 60 }), back);
    assert.equal(nav.answers.bedtime, 22 * 60);
    assert.equal(nav.answers.wake, initialAnswers.wake);
  });

  test('two edits in a row each return to the summary', () => {
    const before = summary();
    const nav = run(before, edit('bedtime'), next, edit('apps'), set({ apps: ['TikTok'] }), next);
    assert.deepEqual(nav.history, before.history);
    assert.deepEqual(nav.answers.apps, ['TikTok']);
  });

  test('Continue on the summary after an edit carries on to the commit', () => {
    const nav = run(summary(), edit('bedtime'), next, next);
    assert.equal(currentStep(nav), 'commit');
  });

  test('Back from the summary after a saved edit goes to the step before it, not the edit', () => {
    const nav = run(summary(), edit('bedtime'), next, back);
    assert.equal(currentStep(nav), 'apps');
  });
});

describe('editing the method from the walk', () => {
  const walk = () => reach('walk', run(startNav('hello', initialAnswers), set({ method: 'steps' })));

  test('“Pick another way” returns to the walk once a method is picked', () => {
    const nav = run(walk(), edit('method'), set({ method: 'downstairs' }), next);
    assert.equal(currentStep(nav), 'walk');
    assert.equal(nav.answers.method, 'downstairs');
    assert.equal(nav.history.filter((s) => s === 'walk').length, 1);
  });

  test('Back from the method keeps the step counter they had', () => {
    const nav = run(walk(), edit('method'), set({ method: 'scan' }), back);
    assert.equal(currentStep(nav), 'walk');
    assert.equal(nav.answers.method, 'steps');
  });

  test('then the walk carries on to Screen Time', () => {
    const nav = run(walk(), edit('method'), next, next);
    assert.equal(currentStep(nav), 'screen-time');
  });
});

test('the first pass through an editable step is not an edit', () => {
  // Reaching `bedtime` for the first time: Continue goes on to `wake`, Back keeps answers.
  const nav = run(reach('bedtime'), set({ bedtime: 22 * 60 }));
  assert.equal(isEditing(nav), false);
  assert.equal(currentStep(navigate(nav, next)), 'wake');
  assert.equal(navigate(nav, back).answers.bedtime, 22 * 60);
});

test('only the edited step saves and returns; a step reached from it moves on as usual', () => {
  const nav = run(reach('ready'), edit('apps'), { type: 'go', to: 'commit' });
  assert.equal(isEditing(nav), false);
  assert.equal(currentStep(navigate(nav, next)), 'offer');
});

test('starting again after purchase drops any edit in progress', () => {
  const nav = run(reach('ready'), edit('bedtime'), { type: 'reset', to: 'armed' });
  assert.equal(nav.returnTo, null);
  assert.equal(nav.beforeEdit, null);
});
