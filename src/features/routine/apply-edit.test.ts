/// <reference types="node" />
/**
 * The rules for editing the routine (apply-edit.ts), with the real night maths and the stores
 * faked: refused while the apps are asleep, and the "Sleep now" question asked only when saving
 * would really sleep them, naming the end that moved.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { dateKey, nightInto, nightsAround, wallClock } from '../../lib/lock-state.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

const code = babel.transformSync(readFileSync(new URL('./apply-edit.ts', import.meta.url), 'utf8'), {
  filename: 'apply-edit.ts',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;

type Routine = { bedtime: number; morningStart: number; activeNights: number[]; method: string; stepGoal: number };
type Proof = { morningKey: string; kind: string; at: number };

const ROUTINE: Routine = { bedtime: 23 * 60, morningStart: 7 * 60, activeNights: [0, 1, 2, 3, 4, 5, 6], method: 'steps', stepGoal: 200 };

/** Day `day` of October 2026 at hh:mm, local time. */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm);

function load(world: { phase?: string; held?: (phase: string) => string; armed?: boolean; proofs?: Proof[]; routine?: Routine } = {}) {
  const alerts: string[] = [];
  const mocks: Record<string, unknown> = {
    'react-native': { Alert: { alert: (title: string) => alerts.push(title) } },
    '@/hooks/use-app-start': { armIfPaid() {} },
    '@/lib/emergency': { heldPhase: world.held ?? ((phase: string) => phase) },
    '@/lib/lock-controller': {
      armRoutine: async () => {},
      inPendingFirstNight: () => false,
      readLock: () => ({ phase: world.phase ?? 'day' }),
      syncLock() {},
    },
    '@/lib/lock-state': { dateKey, nightInto, nightsAround, wallClock },
    '@/lib/morning-proof': { getProofs: () => world.proofs ?? [] },
    '@/lib/notifications': { rescheduleNotifications: async () => {} },
    '@/lib/routine': {
      getPendingRoutine: () => null,
      getRoutine: () => world.routine ?? ROUTINE,
      saveRoutine() {},
      toLockSettings: (r: Routine) => ({ ...r, nightApps: ['night'], alwaysApps: [] }),
    },
    '@/lib/scan': { editRefusal: (phase: string) => (phase === 'night' || phase === 'morning' ? 'asleep' : null) },
    '@/lib/screen-time': { getArmedNight: () => (world.armed === false ? null : {}) },
  };
  const exports = {} as {
    routineEditRefusal: (now?: Date) => 'asleep' | null;
    refuseWhileAsleep: (now?: Date) => boolean;
    sleepsAtOnce: (next: Routine, now?: Date) => 'night' | 'morning' | null;
  };
  runInNewContext(code, { exports, require: (id: string) => mocks[id] });
  return { ...exports, alerts };
}

describe('routineEditRefusal', () => {
  test('refused at night and in an unproven morning, allowed by day', () => {
    assert.equal(load({ phase: 'night' }).routineEditRefusal(), 'asleep');
    assert.equal(load({ phase: 'morning' }).routineEditRefusal(), 'asleep');
    assert.equal(load({ phase: 'day' }).routineEditRefusal(), null);
  });

  test('a night nothing holds (a pass, no apps, lapsed) counts as awake', () => {
    assert.equal(load({ phase: 'night', held: () => 'day' }).routineEditRefusal(), null);
  });

  test('refuseWhileAsleep says why, and only when refused', () => {
    const asleep = load({ phase: 'night' });
    assert.equal(asleep.refuseWhileAsleep(), true);
    assert.deepEqual(asleep.alerts, ['Your apps are asleep']);
    const awake = load({ phase: 'day' });
    assert.equal(awake.refuseWhileAsleep(), false);
    assert.deepEqual(awake.alerts, []);
  });
});

describe('sleepsAtOnce', () => {
  test('a bedtime moved before now sleeps the apps: the night moved', () => {
    const { sleepsAtOnce } = load();
    assert.equal(sleepsAtOnce({ ...ROUTINE, bedtime: 21 * 60 }, at(14, 22)), 'night');
  });

  test('a morning moved past now, before any proof, sleeps them: the morning moved', () => {
    const { sleepsAtOnce } = load();
    assert.equal(sleepsAtOnce({ ...ROUTINE, morningStart: 9 * 60 }, at(15, 8)), 'morning');
  });

  test('a morning already proven stays awake when the start moves later', () => {
    const proofs = [{ morningKey: dateKey(at(15, 9)), kind: 'steps', at: at(15, 7, 10).getTime() }];
    assert.equal(load({ proofs }).sleepsAtOnce({ ...ROUTINE, morningStart: 9 * 60 }, at(15, 8)), null);
  });

  test("yesterday's proof doesn't count for this morning", () => {
    const proofs = [{ morningKey: dateKey(at(14, 9)), kind: 'steps', at: at(14, 7, 10).getTime() }];
    assert.equal(load({ proofs }).sleepsAtOnce({ ...ROUTINE, morningStart: 9 * 60 }, at(15, 8)), 'morning');
  });

  test('nothing sleeps when nothing would hold the night', () => {
    const next = { ...ROUTINE, bedtime: 21 * 60 };
    // Paused by a pass, an empty bedtime list or a lapsed subscription: heldPhase says day.
    assert.equal(load({ held: () => 'day' }).sleepsAtOnce(next, at(14, 22)), null);
    assert.equal(load({ armed: false }).sleepsAtOnce(next, at(14, 22)), null);
  });

  test('outside the new night, or on a night switched off, nothing sleeps', () => {
    const { sleepsAtOnce } = load();
    assert.equal(sleepsAtOnce({ ...ROUTINE, bedtime: 21 * 60 }, at(14, 20)), null);
    // The 14th is a Wednesday (3): that evening off.
    assert.equal(sleepsAtOnce({ ...ROUTINE, bedtime: 21 * 60, activeNights: [0, 1, 2, 4, 5, 6] }, at(14, 22)), null);
  });
});
