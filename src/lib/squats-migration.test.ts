/// <reference types="node" />

/**
 * Squats went on 2026-11-05. A routine saved with them (as the active one, a waiting edit or the
 * one before) is read as Walk it off, the default, and saved back so the extensions read it too:
 * nobody is left on a morning no screen can prove. Step away, the sixth way, joins the list.
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const rt = await import('./routine.ts');
const { getRoutine, getPendingRoutine, getRoutineChange, normalizeRoutine, normalizeStored, DEFAULT_ROUTINE, WAKE_METHODS, isWakeMethod } = rt;
const { shieldCopy } = await import('./shield-copy.ts');

const KEY = 'locturne.routine';
const squats = { ...DEFAULT_ROUTINE, method: 'squats', squatGoal: 25 } as unknown as typeof DEFAULT_ROUTINE;

test('six ways, squats not among them, Step away in', () => {
  assert.deepEqual([...WAKE_METHODS].sort(), ['dance', 'downtime', 'place', 'pushups', 'scan', 'steps']);
  assert.equal(isWakeMethod('squats'), false);
  assert.equal(isWakeMethod('downtime'), true);
});

test('a squats routine walks, and its count goes', () => {
  const r = normalizeRoutine(squats);
  assert.equal(r.method, 'steps');
  assert.equal('squatGoal' in r, false);
  assert.equal(r.stepGoal, 200, 'the step goal it had');
});

test('a routine that needs nothing is the same object (no needless writes)', () => {
  const r = { ...DEFAULT_ROUTINE, method: 'downtime' as const, downtimeMinutes: 90 };
  assert.equal(normalizeRoutine(r), r);
  const stored = { active: r, since: 1 };
  assert.equal(normalizeStored(stored), stored);
});

test('an unknown method (a newer build’s, a bad write) walks too', () => {
  assert.equal(normalizeRoutine({ ...DEFAULT_ROUTINE, method: 'juggling' } as unknown as typeof DEFAULT_ROUTINE).method, 'steps');
});

test('the stored routine is migrated everywhere and saved back, keeping when it came into force', () => {
  const now = new Date(2026, 10, 5, 15);
  fake.state.store[KEY] = {
    active: squats,
    since: 1000,
    prior: squats,
    priorSince: 500,
    pending: { routine: { ...squats, bedtime: 22 * 60 }, from: now.getTime() + 3_600_000 },
  };
  assert.equal(getRoutine(now).method, 'steps');
  assert.equal(getPendingRoutine(now)?.routine.method, 'steps', 'a waiting edit to squats walks too');
  assert.equal(getPendingRoutine(now)?.routine.bedtime, 22 * 60, 'and keeps its other changes');
  const change = getRoutineChange(now);
  assert.equal(change?.since, 1000, 'not an edit: no night is judged under a new routine');
  assert.equal(change?.prior?.method, 'steps');
  const saved = fake.state.store[KEY] as { active: { method: string; squatGoal?: number } };
  assert.equal(saved.active.method, 'steps', 'saved back for the extensions');
  assert.equal(saved.active.squatGoal, undefined);
});

test('the morning shield of a migrated routine asks for the walk', () => {
  const { subtitle } = shieldCopy('morning', normalizeRoutine(squats));
  assert.equal(subtitle, 'Walk 200 steps, then tap I’m up.');
});

test('a squats routine nobody has opened since still gets words, not a crash', () => {
  // An old routine read straight (the extension's copy, before the app migrates it).
  assert.match(shieldCopy('morning', squats).subtitle, /Walk 200 steps/);
});
