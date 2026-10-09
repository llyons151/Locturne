import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeEach, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as analytics from './analytics.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const compile = (code: string) => babel.transformSync(code, {
  filename: 'analytics-start.ts', configFile: false, babelrc: false,
  presets: ['@babel/preset-typescript'], plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
beforeEach(analytics.resetAnalytics);

function startup(store = new Map<string, unknown>(), ready: Promise<void> = Promise.resolve()) {
  const links: Record<string, string>[] = [];
  const clients: { options: { before_send: (e: { event: string; properties: Record<string, unknown> }) => unknown }; captures: unknown[] }[] = [];
  class Client {
    optedOut = false;
    captures: unknown[] = [];
    options: typeof clients[number]['options'];
    constructor(_key: string, options: typeof clients[number]['options']) { this.options = options; clients.push(this); }
    capture(event: string, properties: Record<string, unknown>) { this.captures.push({ event, properties }); }
    screen() {} register() {} setPersonProperties() {} setPersistedProperty() {}
    ready() { return ready; }
    getDistinctId() { return 'install-id'; }
    optOut() { this.optedOut = true; return Promise.resolve(); }
  }
  const modules: Record<string, unknown> = {
    'expo-constants': { __esModule: true, default: { expoConfig: { extra: { posthog: { apiKey: 'phc_test' } } } } },
    'expo-notifications': { getLastNotificationResponse: () => null, addNotificationResponseReceivedListener() {} },
    'expo-router': {}, react: {},
    'posthog-react-native': { __esModule: true, default: Client, PostHogPersistedProperty: { Queue: 'queue' } },
    'react-native': { Platform: { OS: 'ios' }, AppState: { addEventListener() {} } },
    './analytics': analytics,
    './heartbeat': { readNightChecks: () => [] }, './lock-state': {},
    './morning-proof': { onProofChange() {} },
    './notifications': { getNotificationPermission: async () => 'undetermined' },
    './purchases': { isStubbed: () => false, setAttributes(value: Record<string, string>) { links.push(value); } }, './routine': {},
    './screen-time': { sharedGet: (key: string) => store.get(key), sharedSet: (key: string, value: unknown) => store.set(key, value) },
  };
  const exports: { startAnalytics?: () => void } = {};
  runInNewContext(compile(readFileSync(new URL('./analytics-start.ts', import.meta.url), 'utf8')), {
    exports, require: (id: string) => modules[id], __DEV__: false,
  });
  return { start: () => exports.startAnalytics!(), clients, store, links };
}

test('a fresh install with no age answer starts analytics and sends its funnel', () => {
  const h = startup();
  h.start();
  assert.equal(h.clients.length, 1, 'onboarding no longer asks age, so nothing else would start it');
  analytics.track('onboarding_started', { rerun: false, entry_step: 'hello' });
  analytics.track('onboarding_answered', { question: 'nightMinutes', answer: 45 });
  assert.equal(h.clients[0].captures.length, 2);
});

test('a stored under-13 answer from an older build stays stopped on every launch', () => {
  const h = startup(new Map([['locturne.analytics.eligible', false]]));
  h.start();
  analytics.track('onboarding_started', { rerun: false, entry_step: 'hello' });
  analytics.track('onboarding_answered', { question: 'age_bracket', answer: '18-24' });
  assert.equal(h.clients.length, 0, 'the persisted child opt-out cannot be reversed on a later launch');
  assert.equal(h.store.get('locturne.analytics.eligible'), false);
});

test('an older adult age answer initializes once', () => {
  const h = startup(new Map([['locturne.analytics.eligible', true]]));
  h.start();
  analytics.track('onboarding_answered', { question: 'age_bracket', answer: '18-24' });
  assert.equal(h.clients.length, 1);
  assert.equal(h.clients[0].captures.length, 1);
});

test('actual installed SDK lifecycle method cannot export an incoming personal deep link', async () => {
  const h = startup(new Map([['locturne.analytics.eligible', true]]));
  h.start();
  const mapPath = require.resolve('posthog-react-native').replace(/index\.js$/, 'posthog-rn.js.map');
  const source = JSON.parse(readFileSync(mapPath, 'utf8')).sourcesContent[0] as string;
  const ast = babel.parseSync(source, { filename: 'sdk.ts', configFile: false, babelrc: false, parserOpts: { plugins: ['typescript'] } });
  let method = '';
  require('@babel/traverse').default(ast, { ClassMethod(path: { node: { key: { name: string }; start: number; end: number } }) {
    if (path.node.key.name === 'captureAppLifecycleEvents') method = source.slice(path.node.start, path.node.end);
  } });
  assert.ok(method, 'exercise SDK implementation, not a lifecycle mock');
  const exports: { Lifecycle?: new () => { captureAppLifecycleEvents(): Promise<void> } } = {};
  runInNewContext(compile(`export class Lifecycle { ${method} }`), {
    exports, Linking: { getInitialURL: async () => 'locturne://scan?email=private@example.com&code=SECRET' },
    AppState: { addEventListener() {} }, maybeAdd: (key: string, value: unknown) => ({ [key]: value }),
  });
  const captured: unknown[] = [];
  const raw: unknown[] = [];
  const instance = Object.assign(new exports.Lifecycle!(), {
    _appProperties: {}, _persistence: 'memory', _logger: { warn() {} },
    capture: (event: string, properties: Record<string, unknown>) => {
      raw.push({ event, properties });
      captured.push(h.clients[0].options.before_send({ event, properties }));
    },
  });
  await instance.captureAppLifecycleEvents();
  assert.match(JSON.stringify(raw), /private@example.com/);
  assert.doesNotMatch(JSON.stringify(captured), /private@example.com|SECRET|locturne:\/\//);
});


test('anything but a stored false starts analytics, and a child answer wins over delayed SDK readiness', async () => {
  for (const persisted of [undefined, null, 'true', 1, {}]) {
    analytics.resetAnalytics();
    const h = startup(new Map([['locturne.analytics.eligible', persisted]]));
    h.start();
    assert.equal(h.clients.length, 1);
  }
  analytics.resetAnalytics();
  let finish!: () => void;
  const ready = new Promise<void>((resolve) => { finish = resolve; });
  const h = startup(new Map(), ready);
  h.start();
  analytics.track('onboarding_answered', { question: 'age_bracket', answer: '18-24' });
  analytics.stopForChild();
  const captured = h.clients[0].captures.length;
  finish();
  await ready;
  await Promise.resolve();
  analytics.trackScreen('/wake');
  analytics.track('onboarding_answered', { question: 'age_bracket', answer: '35+' });
  assert.equal(h.clients[0].captures.length, captured);
  assert.ok(h.links.length > 0);
  assert.ok(h.links.every((value) => value.$posthogUserId === ''), 'SDK readiness never relinks a child');
  assert.equal(h.store.get('locturne.analytics.eligible'), false);
});
