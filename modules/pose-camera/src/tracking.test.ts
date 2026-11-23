import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { after, test } from 'node:test';

// Expo's entry point is uncompiled TypeScript inside node_modules. Supply just the native
// boundary without loading React Native, and load a fresh wrapper for each build capability.
const globals = globalThis as typeof globalThis & { poseCameraTestNative: Record<string, unknown> | null };
globals.poseCameraTestNative = null;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo') return {
      url: 'data:text/javascript,export const requireOptionalNativeModule = () => globalThis.poseCameraTestNative;',
      shortCircuit: true,
    };
    return nextResolve(specifier, context);
  },
});
after(() => { hooks.deregister(); });
const load = (id: string): Promise<typeof import('./tracking.ts')> =>
  import(new URL(`./tracking.ts?${id}`, import.meta.url).href);

test('an old build cannot report a successful engine change', async () => {
  globals.poseCameraTestNative = {};
  const tracking = await load('old');
  assert.equal(tracking.canChooseTrackingEngine, false);
  assert.equal(tracking.setTrackingEngine('vision'), false);
});

test('a missing native module is safe on unsupported platforms', async () => {
  globals.poseCameraTestNative = null;
  const tracking = await load('missing');
  assert.equal(tracking.canChooseTrackingEngine, false);
  assert.equal(tracking.getTrackingEngine(), 'mediapipe');
  assert.equal(tracking.setTrackingEngine('vision'), false);
});

test('a fresh settings instance reads the saved native engine choice', async () => {
  let saved = 'mediapipe';
  globals.poseCameraTestNative = {
    trackingEngine: () => saved,
    setTrackingEngine: (engine: string) => { saved = engine; return true; },
  };
  const tracking = await load('first');
  assert.equal(tracking.canChooseTrackingEngine, true);
  assert.equal(tracking.getTrackingEngine(), 'mediapipe');
  assert.equal(tracking.setTrackingEngine('vision'), true);
  const reopened = await load('reopened');
  assert.equal(reopened.getTrackingEngine(), 'vision');
  assert.equal(reopened.setTrackingEngine('mediapipe'), true);
  assert.equal(tracking.getTrackingEngine(), 'mediapipe');
});

test('a native rejection or exception is reported as a failed save', async () => {
  globals.poseCameraTestNative = { trackingEngine: () => 'mediapipe', setTrackingEngine: () => false };
  const tracking = await load('failure');
  assert.equal(tracking.setTrackingEngine('vision'), false);
  globals.poseCameraTestNative!.setTrackingEngine = () => { throw new Error('unavailable'); };
  assert.equal(tracking.setTrackingEngine('vision'), false);
});
