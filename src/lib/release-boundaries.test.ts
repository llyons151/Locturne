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
  for (const [key, dev, lab, expected] of [
    [undefined, false, undefined, 'closed'], ['test_example', false, undefined, 'closed'],
    ['appl_example', false, undefined, 'real'], [undefined, true, undefined, 'stub'],
    [undefined, false, '1', 'stub'],
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
    runInNewContext(code, { exports, require: (id: string) => modules[id], __DEV__: dev, process: { env: { EXPO_PUBLIC_DEV_LABS: lab } } });
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
