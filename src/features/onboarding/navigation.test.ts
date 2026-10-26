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
    const nav = reach('first-morning');
    assert.deepEqual(nav.history, stepsFor('all'));
    assert.deepEqual(
      stepsFor('all'),
      STEPS.filter((s) => s !== 'night-feel' && s !== 'after-feel'),
      '`all` is the flow as it was, plus the pain question',
    );
    assert.equal(currentStep(navigate(nav, next)), 'first-morning');
  });

  test('the demo goes straight to Screen Time', () => {
    assert.equal(nextStep('tomorrow'), 'screen-time');
  });

  test('the side step rejoins the main path', () => {
    assert.equal(nextStep('declined'), 'plans');
  });

  test('the times come before the quiz, so the questions can speak in them', () => {
    assert.ok(STEPS.indexOf('bedtime') < STEPS.indexOf('mornings'));
    assert.ok(STEPS.indexOf('wake') < STEPS.indexOf('night-minutes'));
    assert.ok(STEPS.indexOf('found') < STEPS.indexOf('plans'), 'attribution is asked before the paywall');
    assert.ok(STEPS.indexOf('found') > STEPS.indexOf('reveal'), 'attribution waits until after the payoff');
    assert.ok(!(STEPS as readonly string[]).includes('age'), 'no age question');
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
    assert.equal(currentStep(navigate(nav, back)), 'tried');
  });

  test('what they would do with the time comes after the number', () => {
    assert.equal(nextStep('reveal'), 'time-back');
    assert.equal(nextStep('time-back'), 'build');
    assert.equal(nextStep('build'), 'method');
    assert.equal(nextStep('commit'), 'found');
    assert.equal(nextStep('found'), 'founder');
    assert.equal(nextStep('founder'), 'offer');
  });

  test('a second next from the same screen does nothing', () => {
    const nav = reach('armed');
    const sent = { type: 'next', at: nav.history.length } as const;
    const once = navigate(nav, sent);
    assert.equal(currentStep(once), 'first-morning');
    assert.equal(navigate(once, sent), once);
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
    assert.equal(currentStep(nav), 'found');
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
    for (let i = 0; currentStep(nav) !== 'first-morning'; i++) {
      assert.ok(i < STEPS.length, `${pain} never reached the end`);
      nav = navigate(nav, next);
    }
    return nav.history;
  };

  test('every branch reaches the paywall and the end, the same length as the others', () => {
    const lengths = PAINS.map((pain) => {
      const history = walk(pain);
      assert.deepEqual(history, stepsFor(pain));
      assert.ok(history.includes('plans'));
      return history.indexOf('plans');
    });
    assert.equal(new Set(lengths).size, 1, `screens to the paywall: ${lengths.join(', ')}`);
  });

  test('the question comes right after hello, before the times', () => {
    for (const pain of PAINS) assert.deepEqual(stepsFor(pain).slice(0, 2), ['hello', 'pain']);
  });

  test('each branch asks its own end of the night first, and only its own feeling question', () => {
    const night = stepsFor('night');
    const morning = stepsFor('morning');
    const overall = stepsFor('overall');
    assert.ok(night.indexOf('night-minutes') < night.indexOf('morning-minutes'));
    assert.ok(night.includes('night-feel') && !night.includes('mornings') && !night.includes('after-feel'));
    assert.ok(morning.indexOf('wake') < morning.indexOf('bedtime'), 'the alarm first');
    assert.ok(morning.includes('mornings') && !morning.includes('night-feel'));
    assert.ok(overall.includes('after-feel') && !overall.includes('mornings') && !overall.includes('night-feel'));
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
    assert.equal(nextStep('after-feel', [], 'morning'), 'nights-per-week');
    assert.equal(nextStep('mornings', [], 'night'), 'night-minutes');
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
