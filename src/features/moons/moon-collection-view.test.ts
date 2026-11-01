/// <reference types="node" />
/**
 * The collection screen (moon-collection-view.tsx), rendered with a stand-in React that only
 * builds the tree: what each tile says, which are locked, what a tap does.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import * as ladder from './moon-ladder.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const code = babel.transformSync(readFileSync(new URL('./moon-collection-view.tsx', import.meta.url), 'utf8'), {
  filename: 'moon-collection-view.tsx',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;

const LADDER = ['dawn', 'harvest', 'aurora', 'supermoon', 'nebula', 'midnightsun', 'blood', 'deepsea', 'prism', 'eclipse', 'twin-moonlet'];
const NAMES: Record<string, string> = {
  moonlight: 'Moonlight', dawn: 'Dawn Moon', harvest: 'Harvest Moon', aurora: 'Aurora', supermoon: 'Supermoon', nebula: 'Nebula',
  midnightsun: 'Midnight Sun', blood: 'Blood Moon', deepsea: 'Deep Sea', prism: 'Prism', eclipse: 'Eclipse', 'twin-moonlet': 'Moonlet', ringed: 'Ringed Moon',
};
const MOONS = Object.entries(NAMES).map(([id, name]) => ({ id, name }));

type Node = { type: unknown; props: Record<string, any>; children: Node[] };
type Owned = Record<string, { id: string; morningKey: string; morning: number; at: number; seen?: boolean }>;

function render({
  owned = {} as Owned,
  worn = 'moonlight',
  mornings = 0,
  first = null as string | null,
  today = '2026-11-10',
  limited = [] as { id: string; date: string }[],
} = {}) {
  const calls = { settle: 0, secret: 0, wear: [] as string[], alerts: [] as { title: string; body: string; buttons: any[] }[], seen: [] as string[][], ticks: 0 };
  const cleanups: (() => void)[] = [];
  const react = {
    createElement: (type: unknown, props: Record<string, any> | null, ...children: unknown[]) => ({ type, props: props ?? {}, children: children.flat() }),
    useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => {}],
    useRef: (v: unknown) => ({ current: v }),
    useEffect: (fn: () => void | (() => void)) => {
      const c = fn();
      if (typeof c === 'function') cleanups.push(c);
    },
  };
  const mocks: Record<string, unknown> = {
    react,
    'react-native': {
      Alert: { alert: (title: string, body: string, buttons: any[]) => calls.alerts.push({ title, body, buttons }) },
      Pressable: 'Pressable',
      ScrollView: 'ScrollView',
      View: 'View',
      StyleSheet: { create: (s: unknown) => s },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 34 }) },
    '@/components/text': { Text: 'Text' },
    '@/lib/haptics': { tap() {}, tick: () => calls.ticks++ },
    '@/lib/lock-controller': { readLock: () => ({ morningKey: today }) },
    '@/lib/morning-proof': { getMorningsWon: () => mornings, getFirstMorning: () => first },
    '@/theme': { DisplayFont: {}, Gap: { gutter: 24, block: 24, section: 32 }, Nocturne: {}, Space: { xs: 4, s: 8, m: 12, l: 16, xl: 24 }, Type: {} },
    './moon-collection': {
      checkSecretMoon: async () => void calls.secret++,
      LIMITED: limited,
      markSeen: (ids: string[]) => calls.seen.push(ids),
      SECRET_MOON: 'twin-moonlet',
      settleMoons: () => void calls.settle++,
      useOwnedMoons: () => owned,
    },
    './moon-data': { LADDER, MOONS },
    './moon-ladder': ladder,
    './moon-theme': { DEFAULT_MOON: MOONS[0], setMoon: (id: string) => calls.wear.push(id), useMoon: () => MOONS.find((m) => m.id === worn) },
    './moon-thumb': { MoonThumb: 'MoonThumb' },
  };
  const exports: Record<string, any> = {};
  runInNewContext(code, { exports, React: react, require: (id: string) => mocks[id] ?? assert.fail(`unmocked import ${id}`), Math });
  // Expand function components (Grid) into their output.
  const expand = (n: any): any => {
    if (!n || typeof n !== 'object') return n;
    if (typeof n.type === 'function') return expand(n.type({ ...n.props, children: n.children }));
    return { ...n, children: (n.children ?? []).map(expand) };
  };
  const tree = expand(exports.MoonCollection({ title: true })) as Node;
  const all: Node[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    all.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(tree);
  const tiles = all.filter((n) => n.type === 'Pressable').map((n) => {
    const thumb = n.children.find((c: Node) => c?.type === 'MoonThumb') as Node;
    const [name, status] = n.children.filter((c: Node) => c?.type === 'Text').map((t: Node) => t.children.join(''));
    return { id: thumb.props.moon.id as string, name, status, locked: thumb.props.locked as boolean, wearing: thumb.props.wearing as boolean, press: n.props.onPress as () => void, label: n.props.accessibilityLabel as string };
  });
  const texts = all.filter((n) => n.type === 'Text').map((n) => n.children.join(''));
  return { tiles, texts, calls, close: () => cleanups.forEach((c) => c()) };
}

const own = (ids: string[], extra: Partial<Owned[string]> = {}): Owned =>
  Object.fromEntries(ids.map((id, i) => [id, { id, morningKey: '2026-11-0' + (i + 1), morning: ladder.LADDER_MORNINGS[LADDER.indexOf(id)] ?? 1, at: 0, seen: true, ...extra }]));

test('a new user: Moonlight worn, every ladder moon locked, the first counting down, the secret a "?"', () => {
  const { tiles, texts } = render();
  assert.deepEqual(tiles.map((t) => t.id), ['moonlight', ...LADDER]);
  assert.deepEqual(tiles[0], { ...tiles[0], status: 'Wearing', locked: false, wearing: true });
  assert.equal(tiles[1].status, '1 morning left');
  assert.equal(tiles[2].status, 'Morning 3');
  assert.equal(tiles[9].status, 'Morning 200');
  assert.equal(tiles[10].status, 'Week 50');
  assert.equal(tiles[11].name, 'Secret moon');
  assert.equal(tiles[11].status, 'Tap for a hint');
  assert.ok(tiles.slice(1).every((t) => t.locked));
  assert.ok(texts.includes('0 of 10'));
  assert.ok(!texts.includes('Rare'), 'no Rare group before owning one');
});

test('settles before the first paint and checks the secret', () => {
  const { calls } = render();
  assert.equal(calls.settle, 1);
  assert.equal(calls.secret, 1);
});

test('only the next moon counts down, in mornings, with the right plural', () => {
  const { tiles } = render({ owned: own(['dawn', 'harvest']), mornings: 5 });
  assert.equal(tiles.find((t) => t.id === 'aurora')!.status, '2 mornings left');
  assert.equal(tiles.find((t) => t.id === 'supermoon')!.status, 'Morning 14');
  assert.equal(render({ owned: own(['dawn', 'harvest']), mornings: 6 }).tiles.find((t) => t.id === 'aurora')!.status, '1 morning left');
});

test('a due moon not yet settled never says "0 mornings left"', () => {
  const { tiles } = render({ owned: own(['dawn']), mornings: 3 });
  assert.equal(tiles.find((t) => t.id === 'harvest')!.status, 'Morning 3');
});

test('owned moons show the morning they came on, New until seen, Wearing above all', () => {
  const owned = { ...own(['dawn']), ...own(['harvest'], { seen: false }) };
  const { tiles, texts } = render({ owned, mornings: 3, worn: 'dawn' });
  const by = (id: string) => tiles.find((t) => t.id === id)!;
  assert.equal(by('dawn').status, 'Wearing');
  assert.equal(by('harvest').status, 'New');
  assert.equal(by('moonlight').status, 'The first');
  assert.ok(texts.includes('2 of 10'));
});

test('the count leaves out Moonlight, the secret and the rare', () => {
  const owned = own(['dawn', 'twin-moonlet', 'ringed']);
  owned.ringed.morning = 40;
  const { texts } = render({ owned, mornings: 1 });
  assert.ok(texts.includes('1 of 10'));
});

test('the rare moon appears in its own group only once owned', () => {
  const owned = own(['dawn']);
  owned.ringed = { id: 'ringed', morningKey: '2026-11-05', morning: 4, at: 0, seen: true };
  const { tiles, texts } = render({ owned, mornings: 4 });
  assert.ok(texts.includes('Rare'));
  assert.equal(tiles.at(-1)!.id, 'ringed');
  assert.equal(tiles.at(-1)!.status, '1 in 365');
});

test('a limited moon not owned is never shown, owned it joins the Rare group', () => {
  const limited = [{ id: 'harvest', date: '2027-08-02' }];
  assert.ok(!render({ limited }).texts.includes('Rare'));
});

test('tapping a moon you own wears it; a locked one only ticks', () => {
  const { tiles, calls } = render({ owned: own(['dawn']), mornings: 1 });
  tiles.find((t) => t.id === 'dawn')!.press();
  tiles.find((t) => t.id === 'moonlight')!.press();
  tiles.find((t) => t.id === 'nebula')!.press();
  assert.deepEqual(calls.wear, ['dawn', 'moonlight']);
  assert.equal(calls.ticks, 1);
});

test('the secret tile gives Loc\'s riddle, and "Tell me how" gives the real rule', () => {
  const { tiles, calls } = render();
  tiles.find((t) => t.id === 'twin-moonlet')!.press();
  assert.equal(calls.alerts.length, 1);
  const how = calls.alerts[0].buttons.find((b) => b.text === 'Tell me how');
  how.onPress();
  assert.match(calls.alerts[1].body, /400 steps within 20 minutes/);
  assert.equal(calls.wear.length, 0);
});

test('the secret, once owned, is a normal moon to wear', () => {
  const { tiles, calls } = render({ owned: own(['twin-moonlet']) });
  const t = tiles.find((x) => x.id === 'twin-moonlet')!;
  assert.equal(t.locked, false);
  assert.equal(t.name, 'Moonlet');
  t.press();
  assert.deepEqual(calls.wear, ['twin-moonlet']);
  assert.equal(calls.alerts.length, 0);
});

test('the Eclipse shows "Week 50" until it comes, even with every other rung done', () => {
  const { tiles } = render({ owned: own(LADDER.slice(0, 9)), mornings: 250, first: '2026-01-01', today: '2026-11-10' });
  assert.equal(tiles.find((t) => t.id === 'eclipse')!.status, 'Week 50');
});

test('closing marks everything owned as seen, once', () => {
  const owned = own(['dawn', 'harvest'], { seen: false });
  const { close, calls } = render({ owned, mornings: 3 });
  assert.deepEqual(calls.seen, []);
  close();
  assert.deepEqual(calls.seen.map((ids) => [...ids].sort()), [['dawn', 'harvest']]);
});

test('every tile has a spoken label naming the moon and its state', () => {
  const { tiles } = render({ owned: own(['dawn']), mornings: 1 });
  for (const t of tiles) assert.match(t.label, /^.+, .+$/);
  assert.equal(tiles.find((t) => t.id === 'twin-moonlet')!.label, 'Secret moon, Tap for a hint');
});

test('wearing a moon you don\'t own (the dev picker) never marks a locked tile as worn', () => {
  const { tiles } = render({ worn: 'blood' });
  const blood = tiles.find((t) => t.id === 'blood')!;
  assert.equal(blood.locked, true);
  assert.equal(blood.wearing, false);
  assert.equal(blood.status, 'Morning 100');
  assert.ok(tiles.every((t) => !t.wearing));
});
