/// <reference types="node" />

/**
 * Moving through onboarding (navigation.ts): next, back, and the two edit paths, from the
 * schedule card on `commit` and from the walk's "Pick another way".
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
  stepsFor,
  PAINS,
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
    const nav = reach('armed');
    assert.deepEqual(nav.history, stepsFor('all'));
    assert.deepEqual(
      stepsFor('all'),
      STEPS.filter((s) => s !== 'night-feel' && s !== 'worst-time'),
      '`all` is the flow as it was, plus the pain question',
    );
    assert.equal(currentStep(navigate(nav, next)), 'armed');
  });

  test('the demo goes straight to Screen Time', () => {
    assert.equal(nextStep('tomorrow'), 'screen-time');
  });

  test('the side step rejoins the main path', () => {
    assert.equal(nextStep('declined'), 'plans');
  });

  test('the times come before the quiz, so the questions can speak in them', () => {
    assert.ok(STEPS.indexOf('bedtime') < STEPS.indexOf('morning-minutes'));
    assert.ok(STEPS.indexOf('wake') < STEPS.indexOf('night-minutes'));
    assert.ok(STEPS.indexOf('found') < STEPS.indexOf('plans'), 'attribution is asked before the paywall');
    assert.ok(STEPS.indexOf('found') < STEPS.indexOf('reveal'), 'attribution is a quiz question, not a screen before the price');
    assert.ok(STEPS.indexOf('age') === STEPS.indexOf('reveal') - 1, 'age comes right before the reveal, its only reader');
  });

  test('`?step=` accepts real steps and `declined` only', () => {
    assert.ok(isStep('tomorrow'));
    assert.ok(isStep('declined'));
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
    const nav = reach('morning-minutes');
    assert.equal(currentStep(navigate(nav, back)), 'wake');
    const first = startNav('hello', initialAnswers);
    assert.equal(canGoBack(first), false);
    assert.equal(navigate(first, back), first);
  });

  test('from the reveal goes back to the last question', () => {
    const nav = reach('reveal');
    assert.equal(currentStep(navigate(nav, back)), 'age');
  });

  test('what they would do with the time comes right after the running total', () => {
    assert.equal(nextStep('nights-per-week'), 'time-back');
    assert.equal(nextStep('time-back'), 'tried');
    assert.equal(nextStep('reveal'), 'build');
    assert.equal(nextStep('build'), 'method');
    assert.equal(nextStep('tried'), 'found');
    assert.equal(nextStep('found'), 'age');
    assert.equal(nextStep('commit'), 'founder');
    assert.equal(nextStep('founder'), 'offer');
  });

  test('a second next from the same screen does nothing', () => {
    const nav = reach('offer');
    const sent = { type: 'next', at: nav.history.length } as const;
    const once = navigate(nav, sent);
    assert.equal(currentStep(once), 'plans');
    assert.equal(navigate(once, sent), once);
  });

  test('after purchase the stack starts again, with no way back to the paywall', () => {
    const nav = run(reach('offer'), { type: 'reset', to: 'armed' });
    assert.deepEqual(nav.history, ['armed']);
    assert.equal(canGoBack(nav), false);
    assert.equal(currentStep(navigate(nav, next)), 'armed', '`armed` is the last page');
  });

  test('the paywall exit, then Continue, reaches the plans', () => {
    const nav = run(reach('offer'), { type: 'go', to: 'declined' }, next);
    assert.equal(currentStep(nav), 'plans');
  });
});

describe('editing from the schedule card on commit', () => {
  const summary = () => reach('commit', run(startNav('hello', initialAnswers), set({ method: 'downstairs' })));

  test('Save returns to commit without stacking a second copy', () => {
    const before = summary();
    const nav = run(before, edit('bedtime'), set({ bedtime: 22 * 60 }), next);
    assert.equal(currentStep(nav), 'commit');
    assert.deepEqual(nav.history, before.history);
    assert.equal(nav.answers.bedtime, 22 * 60);
    assert.equal(nav.returnTo, null);
    assert.equal(nav.beforeEdit, null);
  });

  test('while editing, the step knows it (its button says Save)', () => {
    const nav = run(summary(), edit('wake'));
    assert.equal(isEditing(nav), true);
    assert.equal(nav.returnTo, 'commit');
    assert.equal(isEditing(run(nav, next)), false);
  });

  test('Back cancels the edit: the answer goes back to what it was', () => {
    const before = summary();
    const nav = run(before, edit('wake'), set({ wake: 5 * 60 }), back);
    assert.equal(currentStep(nav), 'commit');
    assert.equal(nav.answers.wake, before.answers.wake);
    assert.equal(nav.returnTo, null);
  });

  test('a cancelled edit doesn’t undo answers given before it', () => {
    const before = run(summary(), edit('bedtime'), set({ bedtime: 22 * 60 }), next);
    const nav = run(before, edit('wake'), set({ wake: 5 * 60 }), back);
    assert.equal(nav.answers.bedtime, 22 * 60);
    assert.equal(nav.answers.wake, initialAnswers.wake);
  });

  test('two edits in a row each return to commit', () => {
    const before = summary();
    const nav = run(before, edit('bedtime'), next, edit('apps'), set({ apps: ['TikTok'] }), next);
    assert.deepEqual(nav.history, before.history);
    assert.deepEqual(nav.answers.apps, ['TikTok']);
  });

  test('agreeing on commit after an edit carries on toward the offer', () => {
    const nav = run(summary(), edit('bedtime'), next, next);
    assert.equal(currentStep(nav), 'founder');
  });

  test('Back from commit after a saved edit goes to the step before it, not the edit', () => {
    const nav = run(summary(), edit('bedtime'), next, back);
    assert.equal(currentStep(nav), 'apps');
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
  const nav = run(reach('commit'), edit('apps'), { type: 'go', to: 'offer' });
  assert.equal(isEditing(nav), false);
  assert.equal(currentStep(navigate(nav, next)), 'plans');
});

test('starting again after purchase drops any edit in progress', () => {
  const nav = run(reach('commit'), edit('bedtime'), { type: 'reset', to: 'armed' });
  assert.equal(nav.returnTo, null);
  assert.equal(nav.beforeEdit, null);
});

test('a permission callback cannot advance a different visit at the same stack depth', () => {
  const original = reach('screen-time');
  const callback: NavAction = { type: 'next', at: original.history.length, visit: original.visit };
  const moved = run(original, back, { type: 'edit', to: 'method' });
  assert.equal(moved.history.length, original.history.length);
  assert.equal(currentStep(moved), 'method');
  assert.equal(navigate(moved, callback), moved, 'old Screen Time completion must not submit a later method edit');
});

describe('the pain branches (ONBOARDING_BRANCHES §5.1)', () => {
  /** Walks a whole branch: answers `pain` on screen 2, then Continue to the end. */
  const walk = (pain: (typeof PAINS)[number]) => {
    let nav = run(startNav('hello', initialAnswers), next, set({ pain }));
    for (let i = 0; currentStep(nav) !== 'armed'; i++) {
      assert.ok(i < STEPS.length, `${pain} never reached the end`);
      nav = navigate(nav, next);
    }
    return nav.history;
  };

  test('every branch reaches the paywall and the end; only a feeling question adds a screen', () => {
    const toPaywall = (pain: (typeof PAINS)[number]) => {
      const history = walk(pain);
      assert.deepEqual(history, stepsFor(pain));
      assert.ok(history.includes('plans'));
      return history.indexOf('plans');
    };
    const base = toPaywall('all');
    assert.equal(toPaywall('morning'), base);
    assert.equal(toPaywall('night'), base + 1, 'night-feel');
    assert.equal(toPaywall('overall'), base + 1, 'worst-time');
  });

  test('the question comes right after hello, before the times', () => {
    for (const pain of PAINS) assert.deepEqual(stepsFor(pain).slice(0, 2), ['hello', 'pain']);
  });

  test('each branch asks its own end of the night first, and only its own feeling question', () => {
    const night = stepsFor('night');
    const morning = stepsFor('morning');
    const overall = stepsFor('overall');
    assert.ok(night.indexOf('night-minutes') < night.indexOf('morning-minutes'));
    assert.ok(night.includes('night-feel') && !night.includes('worst-time'));
    assert.ok(morning.indexOf('wake') < morning.indexOf('bedtime'), 'the alarm first');
    assert.ok(!morning.includes('night-feel') && !morning.includes('worst-time'));
    assert.ok(overall.includes('worst-time') && !overall.includes('night-feel'));
  });

  test('every branch asks both minutes questions, so the estimate is whole', () => {
    for (const pain of PAINS) {
      const steps = stepsFor(pain);
      for (const s of ['bedtime', 'wake', 'night-minutes', 'morning-minutes', 'nights-per-week', 'tried', 'reveal'] as const)
        assert.ok(steps.includes(s), `${pain} asks ${s}`);
      assert.ok(steps.indexOf('nights-per-week') < steps.indexOf('reveal'));
    }
  });

  test('no answer yet reads as all', () => {
    assert.deepEqual(stepsFor(undefined), stepsFor('all'));
    assert.equal(nextStep('pain'), 'bedtime');
  });

  test('Back to the question and a different pick carries on in the new order', () => {
    let nav = run(startNav('hello', initialAnswers), next, set({ pain: 'night' }), next, next, next);
    assert.equal(currentStep(nav), 'night-minutes');
    nav = run(nav, back, back, back);
    assert.equal(currentStep(nav), 'pain');
    nav = run(nav, set({ pain: 'morning' }), next);
    assert.equal(currentStep(nav), 'wake', 'morning asks the alarm first');
  });

  test('a step from another branch carries on to the next step this branch has', () => {
    assert.equal(nextStep('night-feel', [], 'all'), 'nights-per-week');
    assert.equal(nextStep('worst-time', [], 'morning'), 'nights-per-week');
  });

  test('editing from commit still returns, in any branch', () => {
    for (const pain of PAINS) {
      let nav = startNav('hello', { ...initialAnswers, pain });
      while (currentStep(nav) !== 'commit') nav = navigate(nav, next);
      nav = run(nav, edit('wake'), next);
      assert.equal(currentStep(nav), 'commit', pain);
    }
  });
});
