/// <reference types="node" />

/**
 * The wrapper against a fake react-native-device-activity, so it runs without a phone.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

type Call = [string, ...unknown[]];
const calls: Call[] = [];
let status = 0;
let statusAfterPrompt = 2;
let saved: Record<string, string> = {};

mock.module('react-native-device-activity', {
  namedExports: {
    AuthorizationStatus: { notDetermined: 0, denied: 1, approved: 2 },
    isAvailable: () => true,
    getAuthorizationStatus: () => status,
    requestAuthorization: async (who: string) => {
      calls.push(['requestAuthorization', who]);
      status = statusAfterPrompt;
    },
    pollAuthorizationStatus: async () => status,
    getFamilyActivitySelectionId: (id: string) => saved[id],
    blockSelection: (...args: unknown[]) => calls.push(['blockSelection', ...args]),
    unblockSelection: (...args: unknown[]) => calls.push(['unblockSelection', ...args]),
    isShieldActive: () => calls.some(([name]) => name === 'blockSelection'),
    updateShield: (...args: unknown[]) => calls.push(['updateShield', ...args]),
  },
});

const st = await import('./screen-time.ts');

beforeEach(() => {
  calls.length = 0;
  status = 0;
  statusAfterPrompt = 2;
  saved = {};
});

test('access maps the library status to words', () => {
  status = 0;
  assert.equal(st.getAccess(), 'notDetermined');
  status = 1;
  assert.equal(st.getAccess(), 'denied');
  status = 2;
  assert.equal(st.getAccess(), 'approved');
});

test('requestAccess asks for this person only, never a child', async () => {
  assert.equal(await st.requestAccess(), 'approved');
  assert.deepEqual(calls, [['requestAuthorization', 'individual']]);
});

test('a declined prompt reports denied', async () => {
  statusAfterPrompt = 1;
  assert.equal(await st.requestAccess(), 'denied');
});

test('lists are addressed by id, and tagged as ours', () => {
  st.sleepApps('night');
  st.wakeApps('night');
  st.sleepApps('always');
  assert.deepEqual(calls, [
    ['blockSelection', { activitySelectionId: 'night' }, 'locturne'],
    ['unblockSelection', { activitySelectionId: 'night' }, 'locturne'],
    ['blockSelection', { activitySelectionId: 'always' }, 'locturne'],
  ]);
});

test('hasSelection is true only once a list has been picked', () => {
  assert.equal(st.hasSelection('night'), false);
  saved = { night: 'opaque-token' };
  assert.equal(st.hasSelection('night'), true);
  assert.equal(st.hasSelection('always'), false);
});

test('shield text goes into title, subtitle and the one button, and the button just closes', () => {
  st.setShieldText({ title: 'Shh.', subtitle: 'Locturne', button: 'Fine' });
  const [name, config, actions, trigger] = calls[0] as [string, Record<string, unknown>, unknown, string];
  assert.equal(name, 'updateShield');
  assert.equal(config.title, 'Shh.');
  assert.equal(config.subtitle, 'Locturne');
  assert.equal(config.primaryButtonLabel, 'Fine');
  assert.deepEqual(actions, { primary: { behavior: 'close' } });
  assert.equal(trigger, 'locturne');
});
