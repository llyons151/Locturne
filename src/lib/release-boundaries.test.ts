import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as purchases from './purchases.ts';
import * as revenuecat from './revenuecat.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

test('actual startup selection never enables free purchases in an ordinary iOS release', async () => {
  const code = babel.transformSync(readFileSync(new URL('./purchases-start.ts', import.meta.url), 'utf8'), {
    filename: 'purchases-start.ts', configFile: false, babelrc: false,
    presets: ['@babel/preset-typescript'], plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  for (const [key, dev, lab, free, expected] of [
    [undefined, false, undefined, undefined, 'closed'], ['test_example', false, undefined, undefined, 'closed'],
    ['appl_example', false, undefined, undefined, 'real'], [undefined, true, undefined, undefined, 'stub'],
    [undefined, false, '1', undefined, 'stub'],
    // An archive made outside the production EAS profile must still respect purchases.
    [undefined, false, undefined, '1', 'closed'], ['appl_example', false, undefined, '1', 'real'],
    [undefined, false, '0', '1', 'closed'],
    [undefined, true, undefined, '1', 'stub'], [undefined, false, '1', '1', 'stub'],
  ] as const) {
    let selected: purchases.PurchasesProvider | undefined;
    let configured = false;
    const modules: Record<string, unknown> = {
      'expo-constants': { __esModule: true, default: { expoConfig: { extra: { revenueCat: { appleApiKey: key } } }, executionEnvironment: 'standalone' }, ExecutionEnvironment: { StoreClient: 'storeClient' } },
      'react-native': { Platform: { OS: 'ios' } },
      'react-native-purchases': { __esModule: true, default: { configure() { configured = true; }, ENTITLEMENT_VERIFICATION_MODE: { INFORMATIONAL: 'INFORMATIONAL' } }, LOG_LEVEL: {} },
      './purchases': { ...purchases, setPurchasesProvider: (provider: purchases.PurchasesProvider) => { selected = provider; } },
      './revenuecat': { ...revenuecat, createRevenueCatPurchases: () => ({ ...purchases.createClosedPurchases(), stubbed: false }) },
      './screen-time': { sharedGet() {}, sharedSet() {} },
    };
    const exports: { startPurchases?: () => void } = {};
    runInNewContext(code, { exports, require: (id: string) => modules[id], __DEV__: dev, process: { env: { EXPO_PUBLIC_DEV_LABS: lab, EXPO_PUBLIC_FREE_TESTING: free } } });
    exports.startPurchases!();
    assert.equal(configured, expected === 'real');
    assert.equal(selected?.stubbed, expected === 'stub');
    if (expected === 'closed') {
      assert.equal(await selected!.isEntitled(), false);
      assert.equal((await selected!.purchase('annual')).status, 'failed');
    }
  }
});

test('production build config rejects preview flags and test keys independently', () => {
  const configSource = readFileSync(new URL('../../app.config.js', import.meta.url), 'utf8');
  for (const key of ['', 'test_fake', 'appl_real']) for (const lab of [undefined, '1', '0']) {
    const module = { exports: (_input: unknown) => ({}) };
    runInNewContext(configSource, { module, process: { env: { EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_DEV_LABS: lab } } });
    const run = () => module.exports({ config: { extra: { revenueCat: { appleApiKey: key } } } });
    if (key !== 'appl_real' || lab) assert.throws(run);
    else assert.doesNotThrow(run);
  }
});

test('installed decoder preserves 4096 adversarial mixed Unicode payloads and malformed byte runs', () => {
  const queryRequire = createRequire(require.resolve('query-string'));
  const decode = queryRequire('decode-uri-component');
  let seed = 0x541727;
  for (let i = 0; i < 4096; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    let point = seed % 0x110000;
    if (point >= 0xd800 && point <= 0xdfff) point = 0x1f319;
    const value = String.fromCodePoint(point) + ' +&=/?';
    const encoded = encodeURIComponent(value);
    assert.equal(decode(encoded), value);
    assert.equal(decode('%FF-' + encoded + '-%80'), '%FF-' + value + '-%80');
  }
});

test('installed shell quoting rejects line terminators after a comment token', () => {
  const { quote } = require('shell-quote');
  for (const newline of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(() => quote(['echo', 'ok', { comment: 'x' }, `a${newline}id;#`]), TypeError);
  }
  assert.equal(quote(['echo', 'two words']), "echo 'two words'");
});

test('installed source map consumer rejects unreasonable section offsets and preserves normal lookups', () => {
  const { SourceMapConsumer } = require('source-map-js');
  const map = { version: 3, sources: ['input.js'], names: [], mappings: 'AAAA' };
  for (const line of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => new SourceMapConsumer({ version: 3, sections: [{ offset: { line, column: 0 }, map }] }));
  }
  const consumer = new SourceMapConsumer(map);
  assert.equal(consumer.originalPositionFor({ line: 1, column: 0 }).source, 'input.js');
});
