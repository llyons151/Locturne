import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

type Symbol = SymbolViewProps['name'];
const sym = (ios: string, android: string): Symbol => ({ ios, android, web: android }) as Symbol;
const SUN = sym('sunrise.fill', 'wb_twilight');
const SUN_LINE = sym('sunrise', 'wb_twilight');
const CHEVRON = sym('chevron.right', 'chevron_right');
const CHECK = sym('checkmark', 'check');
const PAUSE = sym('pause.fill', 'pause');

/** A week day as the streak sees it. `pause`: a pass night, which holds the streak without adding to it. */
type Day = 'done' | 'pause' | 'missed' | 'free' | 'future';
type Preset = { label: string; streak: number; total: number; week: Day[] };

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TODAY = 4;
const PRESETS: Preset[] = [
  { label: '6 in a row', streak: 6, total: 23, week: ['done', 'done', 'done', 'done', 'done', 'future', 'future'] },
  { label: 'Pass on Tuesday', streak: 5, total: 23, week: ['done', 'done', 'pause', 'done', 'done', 'future', 'future'] },
  { label: 'Day 1 again', streak: 1, total: 23, week: ['done', 'done', 'missed', 'free', 'done', 'future', 'future'] },
];

/** Mobbin screens each version copies; the files are also saved in docs/design-references/streak. */
const REFS = {
  sweatcoin: ['Sweatcoin', 'VEfZd5UM', '68323603-1b79-480c-b7fa-27c0e4d40d44'],
  mindvalley: ['Mindvalley', '6qbeM851', 'd0126524-ec6c-4b6f-9788-678073b37416'],
  liven: ['Liven', 'WzvC8tWR', '30e09a65-4b59-4fea-a70b-82f2f6e04545'],
  tiimo: ['Tiimo', 'oQcDYGPv', '95d9740b-4ed0-4a51-af5b-74317034071f'],
  pushr: ['pushr', 'Ar9kCenR', 'b06889cf-967c-4a69-b741-4f084b98fe82'],
  insight: ['Insight Timer', 'DzN33eKl', '059e3d86-ddb6-498c-b0cc-33afba20b190'],
  numo: ['Numo', 'hmIY9zJ0', 'cae1eb96-5ca5-4496-9dc4-9aa305c289ef'],
  atoms: ['Atoms', 'SdbySWAp', 'c9d10ef7-c55e-40d5-a8cb-3376e053d799'],
  finch: ['Finch', 'mJFNrpGY', '9c5434c3-6fa3-43bd-bcc2-c46c2e077e25'],
  yazio: ['Yazio', 'SzvZwFK3', '84b1eadf-f94e-43a7-84e6-838d039aeaa1'],
} as const;
type RefKey = keyof typeof REFS;

/**
 * Dev tool: ten ways to show the morning streak at the top of Home, each drawn with Home's own pill,
 * fonts and week dots, beside the Mobbin screen it copies. The state switch shows a plain streak,
 * a pass night (pauses, never breaks) and a fresh start.
 */
export function StreakLab() {
  const insets = useSafeAreaInsets();
  const [preset, setPreset] = useState(0);
  const p = PRESETS[preset];

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.l, paddingBottom: insets.bottom + Space.xxl }]}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}>
        <Text style={styles.link}>Close</Text>
      </Pressable>
      <Text style={styles.title}>Streak lab</Text>
      <Text style={styles.note}>Ten takes on the Home pill, each next to the Mobbin screen it copies. Today is Thursday.</Text>
      <View style={styles.switch}>
        {PRESETS.map((x, i) => (
          <Pressable key={x.label} onPress={() => setPreset(i)} style={[styles.chip, i === preset && styles.chipOn]}>
            <Text style={[styles.chipText, i === preset && styles.chipTextOn]}>{x.label}</Text>
          </Pressable>
        ))}
      </View>

      <Version n={1} name="Pill that names it" refKey="sweatcoin" why="Sweatcoin's top pill: icon, number, unit, and a chevron that says it opens something.">
        <Row left={<Pill><Sun /><Num>{p.streak}</Num><Label>day streak</Label><Chevron /></Pill>} />
        <Week p={p} />
      </Version>

      <Version n={2} name="Streak banner" refKey="mindvalley" why="Mindvalley's full-width row under the greeting: small icon tile, number, STREAK in caps.">
        <View style={styles.banner}>
          <View style={styles.tile}><Sun size={14} /></View>
          <Num>{p.streak}</Num>
          <Text style={styles.caps}>MORNING STREAK</Text>
          <View style={{ flex: 1 }} />
          <Chevron />
        </View>
        <Week p={p} />
      </Version>

      <Version n={3} name="Streak card with the week inside" refKey="liven" why="Liven's widget: the number is the title, a short line under it, the week dots in the same card.">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{p.streak} {p.streak === 1 ? 'morning' : 'mornings'} in a row</Text>
          <Text style={styles.cardLine}>{p.streak === 1 ? 'Back at it. I noticed.' : "Don't make it weird."}</Text>
          <Week p={p} compact />
        </View>
      </Version>

      <Version n={4} name="Two tiles: in a row and all time" refKey="tiimo" why="Tiimo's pair: DAYS IN A ROW next to TOTAL DAYS. Keeps the lifetime count on Home too.">
        <View style={styles.tiles}>
          <View style={[styles.statTile, styles.statTileOn]}>
            <View style={styles.rowTight}><Text style={styles.statNum}>{p.streak}</Text><Sun size={18} /></View>
            <Text style={styles.caps}>IN A ROW</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statNum}>{p.total}</Text>
            <Text style={styles.caps}>ALL TIME</Text>
          </View>
        </View>
        <Week p={p} />
      </Version>

      <Version n={5} name="Week card, streak in its corner" refKey="pushr" why="pushr's 'this week' card: count at top right, the run of days joined into one capsule.">
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardHeadText}>This week</Text>
            <View style={styles.rowTight}><Sun size={15} /><Num>{p.streak}</Num></View>
          </View>
          <ChainWeek p={p} />
        </View>
      </Version>

      <Version n={6} name="A line over the week" refKey="insight" why="Insight Timer: '1 consecutive day' as a small line, then the check circles. No pill at all.">
        <Text style={styles.overline}>
          <Text style={styles.overlineNum}>{p.streak}</Text> {p.streak === 1 ? 'morning' : 'mornings'} in a row
        </Text>
        <Week p={p} />
      </Version>

      <Version n={7} name="Number over its name" refKey="numo" why="Numo: big number, 'day streak' right under it, and the pause rule said once in plain words.">
        <View style={styles.stack}>
          <View style={styles.rowTight}><Sun size={22} /><Text style={styles.bigNum}>{p.streak}</Text></View>
          <Text style={styles.caps}>MORNING STREAK</Text>
        </View>
        <Week p={p} />
        <Text style={styles.fine}>A pass pauses it. It never breaks it.</Text>
      </Version>

      <Version n={8} name="In a row" refKey="atoms" why="Atoms says 'days in a row!' rather than 'streak'. Plain words, same pill.">
        <Row left={<Pill><Sun /><Num>{p.streak}</Num><Label>in a row</Label></Pill>} />
        <Week p={p} />
      </Version>

      <Version n={9} name="Paused days in the week" refKey="finch" why="Finch marks protected days with their own icon in the week, so a pass night reads as held, not missed.">
        <Row left={<Pill><Sun /><Num>{p.streak}</Num><Label>morning streak</Label></Pill>} />
        <Week p={p} sunDone pauseIcon />
      </Version>

      <Version n={10} name="Every day is a sunrise" refKey="yazio" why="Yazio's overview: each day is the streak icon itself, filled when kept, outline when not.">
        <Text style={styles.overline}>
          <Text style={styles.overlineNum}>{p.streak}</Text> morning streak
        </Text>
        <SunWeek p={p} />
      </Version>
    </ScrollView>
  );
}

function Version({ n, name, refKey, why, children }: { n: number; name: string; refKey: RefKey; why: string; children: ReactNode }) {
  const [app, short, id] = REFS[refKey];
  return (
    <View style={styles.version}>
      <Text style={styles.vTitle}>{n}. {name}</Text>
      <Text style={styles.note}>{why}</Text>
      <View style={styles.pair}>
        <Pressable onPress={() => Linking.openURL(`https://mobbin.com/screens/${id}`)} style={styles.refWrap}>
          <Image source={{ uri: `https://mobbin.com/api/mcp/short/${short}` }} style={styles.ref} resizeMode="cover" />
          <Text style={styles.refName}>{app} ↗</Text>
        </Pressable>
        <View style={styles.phone}>{children}</View>
      </View>
    </View>
  );
}

const Sun = ({ size = 15 }: { size?: number }) => <SymbolView name={SUN} size={size} tintColor={Nocturne.text} />;
const Chevron = () => <SymbolView name={CHEVRON} size={12} weight="semibold" tintColor={Nocturne.text3} />;
const Num = ({ children }: { children: ReactNode }) => <Text style={styles.num}>{children}</Text>;
const Label = ({ children }: { children: ReactNode }) => <Text style={styles.label}>{children}</Text>;
const Pill = ({ children }: { children: ReactNode }) => <View style={styles.pill}>{children}</View>;

/** Home's row: streak pill on the left, the screen time sample on the right. */
function Row({ left }: { left: ReactNode }) {
  return (
    <View style={styles.row}>
      {left}
      <View style={styles.pill}>
        <SymbolView name={sym('hourglass', 'hourglass_empty')} size={15} tintColor={Nocturne.text} />
        <Num>2h 18m</Num>
      </View>
    </View>
  );
}

/** Home's week dots (home-top.tsx), with pass nights shown. */
function Week({ p, compact, sunDone, pauseIcon }: { p: Preset; compact?: boolean; sunDone?: boolean; pauseIcon?: boolean }) {
  const size = compact ? 28 : 32;
  return (
    <View style={styles.week}>
      {p.week.map((d, i) => (
        <View key={i} style={styles.day}>
          <Text style={[styles.letter, i === TODAY && styles.letterToday]}>{LETTERS[i]}</Text>
          <View
            style={[
              styles.dot,
              { width: size, height: size, borderRadius: size / 2 },
              d === 'done' && styles.dotDone,
              d === 'pause' && (pauseIcon ? styles.dotPause : styles.dotDone),
              i === TODAY && d !== 'done' && styles.dotToday,
              d === 'future' && styles.dotFuture,
            ]}
          >
            {d === 'done' ? <SymbolView name={sunDone ? SUN : CHECK} size={sunDone ? 14 : 12} weight="bold" tintColor={Nocturne.bg} /> : null}
            {d === 'pause' ? (
              <SymbolView name={pauseIcon ? PAUSE : CHECK} size={12} weight="bold" tintColor={pauseIcon ? Nocturne.text : Nocturne.bg} />
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** pushr: a run of kept mornings drawn as one capsule. */
function ChainWeek({ p }: { p: Preset }) {
  const kept = (d: Day) => d === 'done' || d === 'pause';
  return (
    <View style={styles.chain}>
      {p.week.map((d, i) => {
        const on = kept(d);
        const joinL = on && i > 0 && kept(p.week[i - 1]);
        const joinR = on && i < 6 && kept(p.week[i + 1]);
        return (
          <View key={i} style={styles.chainDay}>
            <View
              style={[
                styles.chainCell,
                on && styles.chainOn,
                joinL && styles.joinL,
                joinR && styles.joinR,
                d === 'future' && styles.dotFuture,
              ]}
            >
              {on ? <SymbolView name={d === 'pause' ? PAUSE : CHECK} size={12} weight="bold" tintColor={Nocturne.bg} /> : null}
            </View>
            <Text style={[styles.letter, i === TODAY && styles.letterToday]}>{LETTERS[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Yazio: the day is the icon. */
function SunWeek({ p }: { p: Preset }) {
  return (
    <View style={styles.week}>
      {p.week.map((d, i) => (
        <View key={i} style={styles.day}>
          <Text style={[styles.letter, i === TODAY && styles.letterToday]}>{LETTERS[i]}</Text>
          <View style={[styles.sunCell, d !== 'done' && d !== 'pause' && { opacity: d === 'future' ? 0.25 : 0.45 }]}>
            <SymbolView
              name={d === 'done' ? SUN : d === 'pause' ? PAUSE : SUN_LINE}
              size={22}
              tintColor={d === 'done' ? Nocturne.text : d === 'pause' ? Nocturne.text2 : Nocturne.text3}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const PILL = 'rgba(255,255,255,0.08)';

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Nocturne.bg },
  content: { paddingHorizontal: Space.l, gap: Space.l, maxWidth: 760, width: '100%', alignSelf: 'center' },
  link: { ...Type.secondary, color: Nocturne.text2 },
  title: { fontSize: 28, fontWeight: '700', color: Nocturne.text, textAlign: 'center' },
  note: { ...Type.caption, color: Nocturne.text2, textAlign: 'center' },
  switch: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Space.s },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: PILL, justifyContent: 'center' },
  chipOn: { backgroundColor: Nocturne.text },
  chipText: { ...Type.caption, color: Nocturne.text },
  chipTextOn: { color: Nocturne.bg, fontWeight: '600' },

  version: { gap: Space.s, paddingTop: Space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Nocturne.line },
  vTitle: { fontSize: 18, fontWeight: '700', color: Nocturne.text, textAlign: 'center' },
  pair: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: Space.l, marginTop: Space.s },
  refWrap: { alignItems: 'center', gap: Space.xs },
  ref: { width: 150, height: 325, borderRadius: 14, backgroundColor: Nocturne.surface },
  refName: { ...Type.caption, color: Nocturne.text3 },
  phone: { width: 358, maxWidth: '100%', padding: Space.l, gap: Space.xl, borderRadius: 28, backgroundColor: Nocturne.bg, borderWidth: 1, borderColor: Nocturne.edge },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: PILL },
  num: { ...NUMBER_FONT, fontSize: 16, color: Nocturne.text },
  label: { ...Type.secondary, color: Nocturne.text2 },
  caps: { fontSize: 12, letterSpacing: 1.2, fontWeight: '600', color: Nocturne.text2 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 12, borderRadius: 14, backgroundColor: PILL },
  tile: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  card: { gap: Space.m, padding: Space.l, borderRadius: 20, backgroundColor: PILL },
  cardTitle: { ...NUMBER_FONT, fontSize: 22, color: Nocturne.text },
  cardLine: { ...Type.secondary, color: Nocturne.text2, marginTop: -Space.s },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeadText: { fontSize: 17, fontWeight: '700', color: Nocturne.text },

  tiles: { flexDirection: 'row', gap: Space.m },
  statTile: { flex: 1, gap: 4, padding: Space.l, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  statTileOn: { backgroundColor: PILL },
  statNum: { ...NUMBER_FONT, fontSize: 30, color: Nocturne.text },

  overline: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center', marginBottom: -Space.s },
  overlineNum: { ...NUMBER_FONT, fontSize: 16, color: Nocturne.text },

  stack: { alignItems: 'center', gap: 2 },
  bigNum: { ...NUMBER_FONT, fontSize: 40, color: Nocturne.text },
  fine: { ...Type.caption, color: Nocturne.text3, textAlign: 'center', marginTop: -Space.s },

  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: Space.s },
  letter: { ...Type.caption, color: Nocturne.text3 },
  letterToday: { color: Nocturne.text, fontWeight: '600' },
  dot: { borderWidth: 1.5, borderColor: Nocturne.edge, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Nocturne.text, borderColor: Nocturne.text },
  dotPause: { borderColor: Nocturne.text2, borderStyle: 'dashed' },
  dotToday: { borderColor: Nocturne.text, borderWidth: 2 },
  dotFuture: { opacity: 0.4 },

  chain: { flexDirection: 'row' },
  chainDay: { flex: 1, alignItems: 'center', gap: Space.s },
  chainCell: { alignSelf: 'stretch', marginHorizontal: 5, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  chainOn: { backgroundColor: Nocturne.text },
  joinL: { marginLeft: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  joinR: { marginRight: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 },

  sunCell: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
