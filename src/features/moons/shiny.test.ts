import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CHARM_STREAK,
  FIRST_SHINY_BY,
  FIRST_SHINY_FROM,
  firstShinyAt,
  freshShiny,
  mergeShiny,
  parseShiny,
  settleShiny,
  shinyOdds,
  SHINY_ODDS,
  SHINY_ODDS_CHARM,
  type ShinyState,
} from './shiny.ts';
import { shinyOf, turnHue } from './shiny-look.ts';

const key = (n: number) => {
  const d = new Date(Date.UTC(2026, 0, 1 + n));
  return d.toISOString().slice(0, 10);
};

/** Runs `days` mornings in a row wearing `worn`, from morning 1; returns the state and the morning each catch came. */
function hunt(seed: number, days: number, worn = 'harvest', streak = 0) {
  let state: ShinyState = freshShiny(seed);
  const catches: { id: string; morning: number }[] = [];
  for (let m = 1; m <= days; m++) {
    const r = settleShiny({ owned: true, state, worn, mornings: m, latest: key(m), streak, now: m });
    state = r.state;
    if (r.caught) catches.push({ id: r.caught, morning: m });
  }
  return { state, catches };
}

test('no roll on the first morning', () => {
  const r = settleShiny({ owned: true, state: freshShiny(1), worn: 'harvest', mornings: 1, latest: key(1), streak: 0, now: 0 });
  assert.equal(r.caught, null);
  assert.equal(r.state.rolled, null);
});

test('each morning rolls once: settling again the same morning changes nothing', () => {
  const s = freshShiny(7);
  const a = settleShiny({ owned: true, state: s, worn: 'harvest', mornings: 2, latest: key(2), streak: 0, now: 0 });
  const b = settleShiny({ owned: true, state: a.state, worn: 'harvest', mornings: 2, latest: key(2), streak: 0, now: 1 });
  assert.equal(b.state, a.state);
  assert.equal(b.caught, null);
  // Wearing another moon later that morning doesn't roll again either.
  const c = settleShiny({ owned: true, state: a.state, worn: 'blood', mornings: 2, latest: key(2), streak: 0, now: 1 });
  assert.equal(c.state, a.state);
});

test('the first shiny is certain by its morning, for every install', () => {
  for (let seed = 0; seed < 300; seed++) {
    const at = firstShinyAt(seed);
    assert.ok(at >= FIRST_SHINY_FROM && at <= FIRST_SHINY_BY);
    const { catches } = hunt(seed, FIRST_SHINY_BY);
    assert.ok(catches.length >= 1, `seed ${seed} caught nothing by morning ${FIRST_SHINY_BY}`);
    assert.ok(catches[0].morning <= at);
  }
});

test('the hunt counts the mornings rolled for the worn moon, and a catch keeps the count', () => {
  const { state, catches } = hunt(12345, 40, 'harvest');
  const c = state.caught.harvest;
  assert.ok(c);
  assert.equal(catches[0].id, 'harvest');
  // Morning 1 doesn't roll, so a catch on morning n took n - 1 mornings.
  assert.equal(c.hunted, c.morning - 1);
  assert.equal(state.hunt.harvest, undefined);
});

test('a moon whose shiny you have is not hunted', () => {
  let { state } = hunt(99, FIRST_SHINY_BY, 'harvest');
  assert.ok(state.caught.harvest);
  const before = state.caught.harvest;
  for (let m = FIRST_SHINY_BY + 1; m < FIRST_SHINY_BY + 30; m++) {
    state = settleShiny({ owned: true, state, worn: 'harvest', mornings: m, latest: key(m), streak: 0, now: m }).state;
  }
  assert.deepEqual(state.caught.harvest, before);
  assert.equal(state.hunt.harvest, undefined);
});

test('the odds: 1 in 64, 1 in 32 on a run of a week', () => {
  assert.equal(shinyOdds(0), 1 / SHINY_ODDS);
  assert.equal(shinyOdds(CHARM_STREAK - 1), 1 / SHINY_ODDS);
  assert.equal(shinyOdds(CHARM_STREAK), 1 / SHINY_ODDS_CHARM);
});

test('after the first, catches come at about the odds', () => {
  // Many installs hunting a second moon for a long time: the catch rate lands near 1 in 64.
  let rolls = 0;
  let hits = 0;
  for (let seed = 0; seed < 200; seed++) {
    let state = hunt(seed, FIRST_SHINY_BY).state;
    for (let m = FIRST_SHINY_BY + 1; m < 400; m++) {
      const r = settleShiny({ owned: true, state, worn: `moon${m}`, mornings: m, latest: key(m), streak: 0, now: m });
      state = r.state;
      rolls++;
      if (r.caught) hits++;
    }
  }
  const rate = hits / rolls;
  assert.ok(rate > 1 / 90 && rate < 1 / 45, `rate ${rate}`);
});

test('merge keeps every catch and the further-rolled seed, and drops hunts for caught moons', () => {
  const a: ShinyState = { seed: 1, rolled: '2026-01-05', caught: { harvest: { id: 'harvest', morningKey: '2026-01-05', morning: 5, at: 5, hunted: 4 } }, hunt: { blood: 2 } };
  const b: ShinyState = { seed: 2, rolled: '2026-01-09', caught: { blood: { id: 'blood', morningKey: '2026-01-09', morning: 9, at: 9, hunted: 3, presented: true } }, hunt: { harvest: 3, full: 6 } };
  const m = mergeShiny(a, b)!;
  assert.equal(m.seed, 2);
  assert.equal(m.rolled, '2026-01-09');
  assert.deepEqual(Object.keys(m.caught).sort(), ['blood', 'harvest']);
  assert.deepEqual(m.hunt, { full: 6 });
  assert.equal(mergeShiny(null, a), a);
});

test('parse takes a saved copy back and rejects garbage', () => {
  const s: ShinyState = { seed: 3, rolled: null, caught: { full: { id: 'full', morningKey: '2026-01-02', morning: 2, at: 1, hunted: 1 } }, hunt: { blood: 4 } };
  assert.deepEqual(parseShiny(JSON.parse(JSON.stringify(s))), s);
  assert.equal(parseShiny(null), null);
  assert.equal(parseShiny({ caught: {} }), null);
});

test('placeholder look: the colours turn, the moon keeps its id', () => {
  assert.equal(turnHue('#FF0000', 120), '#00FF00');
  assert.equal(turnHue('#808080', 90), '#808080');
  const moon = { id: 'x', name: 'X', kind: 'real', tag: '', glow: '#FF0000', glowOpacity: 1, scale: 1, cx: 0.5, orb: ['#FF0000', '#FF0000', '#FF0000', '#FF0000'], skyColors: ['#FF0000', '#FF0000', '#FF0000', '#FF0000'] } as const;
  const s = shinyOf({ ...moon, orb: [...moon.orb], skyColors: [...moon.skyColors] });
  assert.equal(s.id, 'x');
  assert.equal(s.shiny, true);
  assert.notEqual(s.glow, '#FF0000');
});

test('only a moon you have unlocked can have its shiny caught', () => {
  let state = freshShiny(5);
  for (let m = 1; m <= 60; m++) {
    const r = settleShiny({ state, worn: 'locked', owned: false, mornings: m, latest: key(m), streak: 9, now: m });
    assert.equal(r.caught, null);
    state = r.state;
  }
  assert.deepEqual(state.caught, {});
  assert.deepEqual(state.hunt, {});
  // The morning still counts as rolled: wearing an owned moon later that morning doesn't roll it again.
  const again = settleShiny({ state, worn: 'harvest', owned: true, mornings: 60, latest: key(60), streak: 9, now: 61 });
  assert.equal(again.state, state);
});
