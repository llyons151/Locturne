import assert from 'node:assert/strict';
import { test } from 'node:test';
import { liveScanStage, type Stage } from './scan-stage.ts';

test('a scanner opened before morning activates at the boundary without closing the route', () => {
  const result = liveScanStage({ kind: 'notYet' }, { kind: 'morning' }, { phase: 'morning', morningKey: '2026-10-06' }, true);
  assert.equal(result.kind, 'morning');
});

test('scan success cannot keep claiming awake through the next night or morning', () => {
  const stored: Stage = { kind: 'unlocked', morningKey: '2026-10-05' };
  assert.equal(liveScanStage(stored, { kind: 'awake' }, { phase: 'day', morningKey: '2026-10-05' }, false), stored);
  assert.equal(liveScanStage(stored, { kind: 'notYet' }, { phase: 'night', morningKey: '2026-10-06' }, true).kind, 'notYet');
  assert.equal(liveScanStage(stored, { kind: 'morning' }, { phase: 'morning', morningKey: '2026-10-06' }, true).kind, 'morning');
});

test('setup hides the printable code when bedtime starts and resumes only when editing is allowed', () => {
  const draft: Stage = { kind: 'register', source: 'qr', expect: 'private-code' };
  assert.equal(liveScanStage(draft, { kind: 'asleep' }, { phase: 'night', morningKey: '2026-10-06' }, true).kind, 'asleep');
  assert.equal(liveScanStage(draft, { kind: 'choose', source: 'qr' }, { phase: 'day', morningKey: '2026-10-06' }, false), draft);
});
