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
// The slots it lists (moon-slots.ts), run for real against the same mocks.
const slotsCode = babel.transformSync(readFileSync(new URL('./moon-slots.ts', import.meta.url), 'utf8'), {
  filename: 'moon-slots.ts',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;

const LADDER = ['dawn', 'harvest', 'aurora', 'supermoon', 'nebula', 'midnightsun', 'blood', 'deepsea', 'prism', 'eclipse', 'twin-moonlet', 'twin-sisters', 'micromoon'];
const SECRETS = ['twin-moonlet', 'twin-sisters', 'micromoon'];
const NAMES: Record<string, string> = {
  moonlight: 'Moonlight', dawn: 'Dawn Moon', harvest: 'Harvest Moon', aurora: 'Aurora', supermoon: 'Supermoon', nebula: 'Nebula',
  midnightsun: 'Midnight Sun', blood: 'Blood Moon', deepsea: 'Deep Sea', prism: 'Prism', eclipse: 'Eclipse', 'twin-moonlet': 'Moonlet', 'twin-sisters': 'Sisters', micromoon: 'Micromoon', ringed: 'Ringed Moon', bluemoon: 'Blue Moon',
};
/** The app's first rare moon, whichever it is. */
const RARE = ladder.RARE_MOONS[0];
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
  streak = 0,
} = {}) {
  const calls = { back: 0, settle: 0, secret: 0, wear: [] as string[], alerts: [] as { title: string; body: string; buttons: any[] }[], seen: [] as string[][], ticks: 0 };
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
    'react-native-reanimated': {
      __esModule: true,
      default: { ScrollView: 'ScrollView', View: 'AnimatedView' },
      runOnJS: (fn: unknown) => fn,
      useAnimatedScrollHandler: () => () => {},
      useAnimatedStyle: () => ({}),
      useSharedValue: (value: unknown) => ({ value }),
      withSequence: (...steps: unknown[]) => steps.at(-1),
      withTiming: (to: unknown) => to,
    },
    'expo-router': { router: { canGoBack: () => true, back: () => calls.back++, replace() {} } },
    'expo-symbols': { SymbolView: 'SymbolView' },
    '@/components/grouped-list': { sym: (ios: string) => ios },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 34 }) },
    '@/components/text': { Text: 'Text' },
    '@/lib/haptics': { tap() {}, tick: () => calls.ticks++ },
    '@/lib/lock-controller': { readLock: () => ({ morningKey: today }) },
    '@/lib/morning-proof': { getMorningsWon: () => mornings, getFirstMorning: () => first },
    '@/lib/streak': { getStreak: () => streak },
    './moon-glow': { SwipeGlow: 'SwipeGlow' },
    './moons-pills': { MoonsPills: 'MoonsPills' },
    './moon-cards': {
      SkyCards: 'SkyCards',
      // As moon-cards.ts orders them: yours (rare included), then coming; one point per card.
      skyCards: (main: any[], extras: any[]) => ({ all: [...main.filter((s) => s.owned), ...extras, ...main.filter((s) => !s.owned)], step: 1 }),
    },
    '@/theme': { DisplayFont: {}, NUMBER_FONT: {}, Gap: { gutter: 24, block: 24, section: 32 }, Nocturne: {}, Space: { xs: 4, s: 8, m: 12, l: 16, xl: 24 }, Type: {} },
    './moon-collection': {
      checkSecretMoons: () => void calls.secret++,
      isSecret: (id: string) => SECRETS.includes(id),
      LIMITED: limited,
      markSeen: (ids: string[]) => calls.seen.push(ids),
      settleMoons: () => void calls.settle++,
      useOwnedMoons: () => owned,
    },
    '../home/week': { morningsLabel: (n: number) => (n === 1 ? 'morning' : 'mornings') },
    './moon-data': { LADDER, MOONS },
    './moon-ladder': ladder,
    './moon-rise': { wearAndRise: (id: string) => calls.wear.push(id) },
    './moon-theme': { DEFAULT_MOON: MOONS[0], useMoon: () => MOONS.find((m) => m.id === worn), useWornMoon: () => MOONS.find((m) => m.id === worn) },
    './moon-thumb': { MoonThumb: 'MoonThumb' },
  };
  const slots: Record<string, any> = {};
  runInNewContext(slotsCode, { exports: slots, require: (id: string) => mocks[id] ?? assert.fail(`unmocked import ${id}`), Math });
  mocks['./moon-slots'] = slots;
  const exports: Record<string, any> = {};
  runInNewContext(code, { exports, React: react, require: (id: string) => mocks[id] ?? assert.fail(`unmocked import ${id}`), Math });
  // Expand function components into their output.
  const expand = (n: any): any => {
    if (!n || typeof n !== 'object') return n;
    if (typeof n.type === 'function') return expand(n.type({ ...n.props, children: n.children }));
    return { ...n, children: (n.children ?? []).map(expand) };
  };
  const tree = expand(exports.MoonCollection({ as: 'sheet' })) as Node;
  const all: Node[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    all.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(tree);
  const closeBtn = all.find((n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Close');
  const find = (n: any, type: string): Node | undefined => (n?.type === type ? n : (n?.children ?? []).map((c: any) => find(c, type)).find(Boolean));
  // The moons as the page hands them to the cards (moon-cards.tsx): ladder order, then rare ones once owned.
  const cards = all.find((n) => n.type === 'SkyCards')!.props as { slots: any[]; extras: any[]; owned: Owned; worn: string; onPress: (slot: any) => boolean };
  const tiles = [...cards.slots, ...cards.extras].map((slot) => {
    const name = slots.slotLabel(slot) as string;
    const got = cards.owned[slot.moon.id];
    const status = slot.owned ? (slot.moon.id === 'moonlight' ? 'From the start' : got ? `Morning ${got.morning}` : undefined) : undefined;
    return { id: slot.moon.id as string, name, status, locked: !slot.owned, wearing: slot.owned && slot.moon.id === cards.worn, press: () => void cards.onPress(slot), label: slot.owned ? name : `${name}, locked` };
  });
  const texts = all.filter((n) => n.type === 'Text').map((n) => n.children.map((c: any) => (typeof c === 'object' ? c.children.join('') : c)).join(''));
  const pills = all.find((n) => n.type === 'MoonsPills')?.props as { mornings: number; streak: number; owned: number; total: number; moonId: string };
  // The light at the top: the card the swipe starts on (the worn moon's).
  const swipe = all.find((n) => n.type === 'SwipeGlow')!.props as { ids: string[]; x: { value: number }; step: number };
  const glow = { id: swipe.ids[Math.round(swipe.x.value / swipe.step)] };
  return { tiles, texts, pills, glow, calls, closeBtn, close: () => cleanups.forEach((c) => c()) };
}

const own = (ids: string[], extra: Partial<Owned[string]> = {}): Owned =>
  Object.fromEntries(ids.map((id, i) => [id, { id, morningKey: '2026-11-0' + (i + 1), morning: ladder.LADDER_MORNINGS[LADDER.indexOf(id)] ?? 1, at: 0, seen: true, ...extra }]));

test('a new user: Moonlight worn, every ladder moon locked and named only by when it comes, the secret a "?"', () => {
  const { tiles, texts, pills } = render();
  assert.deepEqual(tiles.map((t) => t.id), ['moonlight', ...LADDER]);
  assert.deepEqual(tiles[0], { ...tiles[0], status: 'From the start', locked: false, wearing: true });
  assert.deepEqual(tiles.slice(1, 11).map((t) => t.name), ['Morning 1', 'Morning 3', 'Morning 7', 'Morning 14', 'Morning 30', 'Morning 50', 'Morning 100', 'Morning 150', 'Morning 200', 'Week 50']);
  assert.ok(tiles.slice(1, 11).every((t) => t.status === undefined), 'one line, no name and no countdown');
  assert.equal(tiles[1].label, 'Morning 1, locked');
  assert.equal(tiles[11].name, 'Secret moon');
  assert.equal(tiles[11].status, undefined, 'no hint');
  assert.deepEqual(tiles.slice(11).map((t) => [t.name, t.status, t.locked]), SECRETS.map(() => ['Secret moon', undefined, true]), 'all three secrets, none named');
  assert.ok(tiles.slice(1).every((t) => t.locked));
  assert.equal(pills.owned, 1, 'Moonlight is yours from the start');
  assert.equal(pills.total, 1 + LADDER.length);
  assert.ok(!texts.includes('Rare'), 'no Rare group before owning one');
});

test('settles before the first paint and checks the secret', () => {
  const { calls } = render();
  assert.equal(calls.settle, 1);
  assert.equal(calls.secret, 1);
});

test('a moon once yours swaps its "Morning N" for its name, over the morning that brought it', () => {
  const { tiles } = render({ owned: own(['dawn', 'harvest']), mornings: 5 });
  const by = (id: string) => tiles.find((t) => t.id === id)!;
  assert.deepEqual([by('harvest').name, by('harvest').status], ['Harvest Moon', 'Morning 3']);
  assert.deepEqual([by('aurora').name, by('aurora').status], ['Morning 7', undefined]);
  assert.ok(!tiles.some((t) => t.name === 'Aurora' || /left/.test(t.status ?? '')));
});

test('the worn moon: its tile is marked, its light is at the top and its name under the title', () => {
  const owned = { ...own(['dawn']), ...own(['harvest'], { seen: false }) };
  const { tiles, texts, pills, glow } = render({ owned, mornings: 3, worn: 'dawn' });
  const by = (id: string) => tiles.find((t) => t.id === id)!;
  assert.equal(by('dawn').wearing, true);
  assert.ok(tiles.filter((t) => t.locked).every((t) => t.status === undefined), 'a locked moon has one line, no countdown');
  assert.equal(by('dawn').label, by('dawn').name);
  assert.equal(glow.id, 'dawn');
  assert.ok(texts.includes('Wearing Dawn Moon'));
  assert.equal(pills.owned, 3);
  assert.equal(pills.moonId, 'dawn');
});

test('the pills get every morning and the streak', () => {
  const { pills } = render({ mornings: 16, streak: 6 });
  assert.deepEqual([pills.mornings, pills.streak], [16, 6]);
});

test('the count is Moonlight plus every moon earned, rare and secret too', () => {
  const owned = own(['dawn', 'twin-moonlet', RARE]);
  owned[RARE].morning = 40;
  const { pills } = render({ owned, mornings: 1 });
  assert.equal(pills.owned, 4);
});

test('the rare moon appears only once owned', () => {
  assert.ok(!render({ mornings: 4 }).tiles.some((t) => t.id === RARE));
  const owned = own(['dawn']);
  owned[RARE] = { id: RARE, morningKey: '2026-11-05', morning: 4, at: 0, seen: true };
  const { tiles } = render({ owned, mornings: 4 });
  assert.equal(tiles.at(-1)!.id, RARE);
  assert.equal(tiles.at(-1)!.status, 'Morning 4');
});

test('a limited moon not owned is never shown', () => {
  const limited = [{ id: 'harvest', date: '2027-08-02' }];
  assert.equal(render({ limited }).tiles.filter((t) => t.id === 'harvest').length, 1, 'only its ladder slot');
});

test('tapping a moon you own wears it at once and the page stays; the worn one does nothing; a locked one ticks', () => {
  const { tiles, calls } = render({ owned: own(['dawn']), mornings: 1 });
  tiles.find((t) => t.id === 'dawn')!.press();
  tiles.find((t) => t.id === 'moonlight')!.press();
  tiles.find((t) => t.id === 'nebula')!.press();
  assert.deepEqual(calls.wear, ['dawn'], 'Moonlight is already worn');
  assert.equal(calls.back, 0, 'no closing, no popup (user, 2026-11-16)');
  assert.equal(calls.ticks, 1);
});

test('the secret tile tells you nothing: a tap is a tick, no riddle, no rule (user, 2026-11-02)', () => {
  const { tiles, calls, texts } = render();
  tiles.find((t) => t.id === 'twin-moonlet')!.press();
  assert.equal(calls.alerts.length, 0);
  assert.equal(calls.ticks, 1);
  assert.equal(calls.wear.length, 0);
  assert.ok(!texts.some((t) => /hint|steps/i.test(t)));
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
  assert.equal(tiles.find((t) => t.id === 'eclipse')!.name, 'Week 50');
});

test('closing marks everything owned as seen, once', () => {
  const owned = own(['dawn', 'harvest'], { seen: false });
  const { close, calls } = render({ owned, mornings: 3 });
  assert.deepEqual(calls.seen, []);
  close();
  assert.deepEqual(calls.seen.map((ids) => [...ids].sort()), [['dawn', 'harvest']]);
});

test('every tile has a spoken label: its name, and "locked" until yours (worn is its selected state)', () => {
  const { tiles } = render({ owned: own(['dawn']), mornings: 1 });
  for (const t of tiles) assert.equal(t.label, t.locked ? `${t.name}, locked` : t.name);
  assert.equal(tiles.find((t) => t.id === 'twin-moonlet')!.label, 'Secret moon, locked');
});

test('wearing a moon you don\'t own (the dev picker) never marks a locked tile as worn', () => {
  const { tiles } = render({ worn: 'blood' });
  const blood = tiles.find((t) => t.id === 'blood')!;
  assert.equal(blood.locked, true);
  assert.equal(blood.wearing, false);
  assert.equal(blood.name, 'Morning 100');
  assert.ok(tiles.every((t) => !t.wearing));
});

test('the sheet has a Close button that goes back', () => {
  const { closeBtn, calls } = render();
  assert.ok(closeBtn, 'no Close button');
  closeBtn.props.onPress();
  assert.equal(calls.back, 1);
});
