import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

test('scanner refreshes denied camera access after Settings and removes its foreground listener', async () => {
  let listener: ((state: string) => void) | undefined;
  let cleanup: (() => void) | undefined;
  let reads = 0;
  let focused = true;
  let permission = { granted: false, canAskAgain: false };
  const hooks = {
    useRef: () => ({ current: null }),
    useEffect: (effect: () => (() => void)) => { cleanup = effect(); },
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }),
  };
  const mocks: Record<string, unknown> = {
    react: hooks,
    'expo-router': { useIsFocused: () => focused },
    'expo-camera': {
      CameraView: 'camera',
      useCameraPermissions: () => [permission, async () => {}, async () => { reads++; permission = { granted: true, canAskAgain: false }; }],
    },
    '@/components/text': { Text: 'text', TextInput: 'input' },
    'react-native': {
      View: 'view', Text: 'text', Linking: {},
      StyleSheet: { create: (styles: unknown) => styles },
      AppState: { addEventListener: (_: string, next: typeof listener) => {
        listener = next;
        return { remove: () => { listener = undefined; } };
      } },
    },
    '@/components/buttons': { PrimaryButton: 'button' },
    '@/theme': { Nocturne: {}, Radius: {}, Space: {}, Type: {} },
  };
  const code = babel.transformSync(readFileSync(new URL('./scanner.tsx', import.meta.url), 'utf8'), {
    filename: 'scanner.tsx', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {} as { Scanner: (props: { onScan: () => void }) => { children: { type: string; props: { active?: boolean; onBarcodeScanned?: unknown } }[] } };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: hooks });
  exports.Scanner({ onScan() {} });
  assert.ok(listener, 'must listen for return from Settings while the scanner remains mounted');
  listener('background');
  assert.equal(reads, 0);
  listener('active');
  await Promise.resolve();
  assert.equal(reads, 1);
  const result = exports.Scanner({ onScan() {} });
  assert.equal(result.children[0].type, 'camera');
  focused = false;
  const hidden = exports.Scanner({ onScan() {} });
  assert.equal(hidden.children[0].props.active, false);
  assert.equal(hidden.children[0].props.onBarcodeScanned, undefined);
  cleanup!();
  assert.equal(listener, undefined);
});
