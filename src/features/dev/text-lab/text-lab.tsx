import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppBackground } from '@/components/app-background';
import { DisplayFont, Nocturne } from '@/theme';

import { AnimatedText, plan } from './animated-text';
import { ANIMATIONS, CURRENT, FAMILIES, type TextAnimation } from './animations';

/** Real onboarding lines (onboarding-flow.tsx), with their sizes and layout. */
const SAMPLES = [
  { head: 'Your phone keeps me up.', headSize: 46, sub: 'I’m Loc. Raccoon. I’d like to sleep.', cta: 'Go on', bottom: true },
  { head: 'A few questions. Then I do math on your nights.', headSize: 36, sub: '', cta: 'Ask away', bottom: false },
  { head: 'Tonight’s lock is ready.', headSize: 36, sub: 'I’m ready. Emotionally, less so.', cta: 'Continue', bottom: false },
  { head: 'Fair.', headSize: 48, sub: '', cta: 'Continue', bottom: false },
  { head: 'That’s it. Go to sleep.', headSize: 38, sub: 'I’ll be asleep. Don’t wake me.', cta: 'Done', bottom: false },
];

const SPEEDS = [0.5, 1, 1.5];
const STORE_KEY = 'locturne.text-lab';

type Saved = { id: number; stars: number[] };

function load(): Saved | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(value: Saved) {
  if (Platform.OS !== 'web') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage; the lab still works without it.
  }
}

function describe(a: TextAnimation) {
  const parts: string[] = [a.split === 'char' ? 'per letter' : a.split === 'word' ? 'per word' : 'whole line'];
  if (a.split !== 'line') parts.push(`${a.stagger}ms stagger`);
  parts.push(a.duration <= 10 ? 'instant cut' : `${a.duration}ms`);
  if (a.order && a.order !== 'forward') parts.push(`${a.order} order`);
  if (a.mask) parts.push('masked');
  if (a.punctuationPause) parts.push(`${a.punctuationPause}ms beat at stops`);
  if (a.jitter) parts.push('uneven rhythm');
  if (a.blur) parts.push('blur');
  return parts.join(' · ');
}

export function TextLab() {
  const { width, height } = useWindowDimensions();
  const wide = width >= 980;

  const [id, setId] = useState(() => load()?.id ?? 1);
  const [stars, setStars] = useState<number[]>(() => load()?.stars ?? []);
  const [mode, setMode] = useState<'focus' | 'grid'>('focus');
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [compare, setCompare] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [custom, setCustom] = useState('');
  const [play, setPlay] = useState(0);

  const replay = () => setPlay((p) => p + 1);

  useEffect(() => save({ id, stars }), [id, stars]);

  const list = useMemo(
    () => (starredOnly && stars.length ? ANIMATIONS.filter((a) => stars.includes(a.id)) : ANIMATIONS),
    [starredOnly, stars],
  );
  const animation = ANIMATIONS.find((a) => a.id === id) ?? ANIMATIONS[0];
  const sample = useMemo(
    () => (custom.trim() ? { ...SAMPLES[sampleIndex], head: custom.trim(), sub: '' } : SAMPLES[sampleIndex]),
    [custom, sampleIndex],
  );

  const step = (delta: number) => {
    const at = Math.max(0, list.findIndex((a) => a.id === id));
    const next = list[(at + delta + list.length) % list.length];
    setId(next.id);
    replay();
  };
  const toggleStar = (target: number) =>
    setStars((s) => (s.includes(target) ? s.filter((x) => x !== target) : [...s, target].sort((a, b) => a - b)));
  const choose = (target: number) => {
    setId(target);
    setMode('focus');
    replay();
  };

  // Keyboard: arrows browse, space replays, S stars, G grid, C compare.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step(1);
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step(-1);
      else if (event.key === ' ') replay();
      else if (event.key === 's') toggleStar(id);
      else if (event.key === 'g') setMode((m) => (m === 'grid' ? 'focus' : 'grid'));
      else if (event.key === 'c') setCompare((c) => !c);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Loop: replay once the slowest thing on screen has finished, plus a beat to read it.
  const cycle = useMemo(() => {
    const shown = mode === 'grid' ? list : compare ? [animation, CURRENT] : [animation];
    return Math.max(...shown.map((a) => timeline(sample, a).end)) / speed + 1400;
  }, [mode, list, compare, animation, sample, speed]);
  useEffect(() => {
    if (!loop) return;
    const timer = setTimeout(replay, cycle);
    return () => clearTimeout(timer);
  }, [loop, play, cycle]);

  const phoneWidth = Math.min(375, width - 32);
  const phoneHeight = Math.min(760, Math.max(560, height - 230));

  const toolbar = (
    <View style={styles.toolbar}>
      <Segment
        options={[
          { label: 'Focus', value: 'focus' as const },
          { label: 'All 50', value: 'grid' as const },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          replay();
        }}
      />
      <Segment
        options={SPEEDS.map((s) => ({ label: `${s}×`, value: s }))}
        value={speed}
        onChange={(s) => {
          setSpeed(s);
          replay();
        }}
      />
      <Toggle label="Loop" on={loop} onPress={() => setLoop((l) => !l)} />
      {mode === 'focus' ? <Toggle label="vs current" on={compare} onPress={() => { setCompare((c) => !c); replay(); }} /> : null}
      <Toggle
        label={`Starred${stars.length ? ` (${stars.length})` : ''}`}
        on={starredOnly}
        onPress={() => {
          setStarredOnly((s) => !s);
          replay();
        }}
      />
      <Button label="Replay" onPress={replay} strong />
    </View>
  );

  const samples = (
    <View style={styles.samples}>
      {SAMPLES.map((s, i) => (
        <Pressable
          key={s.head}
          onPress={() => {
            setSampleIndex(i);
            setCustom('');
            replay();
          }}
          style={[styles.sample, i === sampleIndex && !custom && styles.sampleOn]}
        >
          <Text numberOfLines={1} style={[styles.sampleLabel, i === sampleIndex && !custom && styles.sampleLabelOn]}>
            {s.head}
          </Text>
        </Pressable>
      ))}
      <TextInput
        value={custom}
        onChangeText={setCustom}
        onSubmitEditing={replay}
        placeholder="Type your own line, Enter to play"
        placeholderTextColor={Nocturne.text3}
        style={styles.input}
      />
    </View>
  );

  const beside = wide && !compare;
  const focus = (
    <View style={[styles.focus, beside && styles.focusBeside]}>
      <View style={styles.stageRow}>
        <Phone key={`a-${id}-${play}`} sample={sample} animation={animation} speed={speed} width={phoneWidth} height={phoneHeight} />
        {compare ? (
          <View style={styles.compareCol}>
            <Phone key={`b-${play}`} sample={sample} animation={CURRENT} speed={speed} width={phoneWidth} height={phoneHeight} />
          </View>
        ) : null}
      </View>
      {compare ? (
        <View style={[styles.stageRow, styles.compareLabels]}>
          <Text style={[styles.compareLabel, { width: phoneWidth }]}>#{animation.id} {animation.name}</Text>
          <Text style={[styles.compareLabel, { width: phoneWidth }]}>Current typewriter</Text>
        </View>
      ) : null}
      <View style={[styles.detail, beside ? styles.detailBeside : { maxWidth: compare ? phoneWidth * 2 + 32 : 560 }]}>
        <View style={styles.detailHead}>
          <Text style={styles.detailNumber}>{String(animation.id).padStart(2, '0')}</Text>
          <View style={styles.detailTitleCol}>
            <Text style={styles.detailName}>{animation.name}</Text>
            <Text style={styles.detailFamily}>{animation.family}{animation.pick ? '  ·  shortlist' : ''}</Text>
          </View>
          <Pressable onPress={() => toggleStar(animation.id)} hitSlop={8} style={styles.starButton} accessibilityLabel="Star">
            <Text style={[styles.star, stars.includes(animation.id) && styles.starOn]}>{stars.includes(animation.id) ? '★' : '☆'}</Text>
          </Pressable>
        </View>
        <Text style={styles.detailNote}>{animation.note}</Text>
        <Text style={styles.detailMeta}>{describe(animation)}</Text>
        {animation.blur ? (
          <Text style={styles.detailWarn}>Uses blur. Check it on an iPhone before choosing; iOS may show a plain fade.</Text>
        ) : null}
        <View style={styles.nav}>
          <Button label="←  Prev" onPress={() => step(-1)} />
          <Button label="Replay" onPress={replay} />
          <Button label="Next  →" onPress={() => step(1)} strong />
        </View>
        {Platform.OS === 'web' ? (
          <Text style={styles.keys}>←/→ browse · Space replay · S star · G all 50 · C compare</Text>
        ) : null}
      </View>
    </View>
  );

  const grid = (
    <View style={styles.grid}>
      {list.map((a) => (
        <Pressable key={a.id} onPress={() => choose(a.id)} style={styles.tile}>
          <View style={styles.tileHead}>
            <Text style={styles.tileNumber}>{String(a.id).padStart(2, '0')}</Text>
            <Text style={styles.tileName} numberOfLines={1}>{a.name}</Text>
            <Pressable onPress={() => toggleStar(a.id)} hitSlop={8}>
              <Text style={[styles.tileStar, stars.includes(a.id) && styles.starOn]}>{stars.includes(a.id) ? '★' : '☆'}</Text>
            </Pressable>
          </View>
          <View style={styles.tileStage}>
            <AnimatedText key={`${a.id}-${play}`} text={sample.head} animation={a} size={26} speed={speed} />
          </View>
          <Text style={styles.tileFamily}>{a.family}</Text>
        </Pressable>
      ))}
    </View>
  );

  const sidebar = (
    <ScrollView style={wide ? styles.sidebar : undefined} contentContainerStyle={styles.sidebarBody}>
      {FAMILIES.map((family) => {
        const items = list.filter((a) => a.family === family.name);
        if (!items.length) return null;
        return (
          <View key={family.name} style={styles.family}>
            <Text style={styles.familyName}>{family.name}</Text>
            <Text style={styles.familyBlurb}>{family.blurb}</Text>
            {items.map((a) => {
              const on = a.id === id && mode === 'focus';
              return (
                <Pressable key={a.id} onPress={() => choose(a.id)} style={[styles.item, on && styles.itemOn]}>
                  <Text style={[styles.itemNumber, on && styles.itemTextOn]}>{String(a.id).padStart(2, '0')}</Text>
                  <Text style={[styles.itemName, on && styles.itemTextOn]} numberOfLines={1}>
                    {a.name}
                  </Text>
                  {a.pick ? <View style={[styles.pickDot, on && styles.pickDotOn]} /> : null}
                  <Pressable onPress={() => toggleStar(a.id)} hitSlop={6}>
                    <Text style={[styles.itemStar, stars.includes(a.id) && styles.starOn, on && styles.itemTextOn]}>
                      {stars.includes(a.id) ? '★' : '☆'}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        );
      })}
      <Text style={styles.legend}>● shortlist · ☆ your stars (saved in this browser)</Text>
    </ScrollView>
  );

  const main = (
    <View style={styles.mainInner}>
      <View style={styles.header}>
        <Text style={styles.h1}>Text lab</Text>
        <Text style={styles.sub}>50 entrances for Loc’s voice. Star the ones you like, then tell Claude the numbers.</Text>
      </View>
      {toolbar}
      {samples}
      {mode === 'focus' ? focus : grid}
    </View>
  );

  if (wide) {
    return (
      <View style={styles.root}>
        {sidebar}
        <ScrollView style={styles.main} contentContainerStyle={styles.mainBody}>
          {main}
        </ScrollView>
      </View>
    );
  }
  return (
    <ScrollView style={styles.narrowRoot} contentContainerStyle={styles.mainBody}>
      {main}
      {mode === 'focus' ? sidebar : null}
    </ScrollView>
  );
}

/** When the headline, the second line and the button start, in ms at 1x. */
function timeline(sample: (typeof SAMPLES)[number], animation: TextAnimation) {
  const head = plan(sample.head, animation).total;
  const subDelay = sample.sub ? Math.max(500, head * 0.7) : 0;
  const sub = sample.sub ? subDelay + plan(sample.sub, animation).total : head;
  // Matches FooterEnter in onboarding: buttons don't wait for the text to finish.
  return { subDelay, cta: 450, end: Math.max(head, sub) + 500 };
}

function Phone({
  sample,
  animation,
  speed,
  width,
  height,
}: {
  sample: (typeof SAMPLES)[number];
  animation: TextAnimation;
  speed: number;
  width: number;
  height: number;
}) {
  const times = timeline(sample, animation);
  return (
    <View style={[styles.phone, { width, height }]}>
      <AppBackground>
        <View style={styles.phoneTop}>
          <View style={styles.fakeBack} />
          <View style={styles.fakeProgress}>
            {[1, 0.2, 0, 0, 0].map((f, i) => (
              <View key={i} style={styles.fakeSegment}>
                <View style={[styles.fakeFill, { width: `${f * 100}%` }]} />
              </View>
            ))}
          </View>
          <Text style={styles.fakeExit}>Exit</Text>
        </View>
        <View style={[styles.phoneBody, sample.bottom ? styles.bottom : styles.center]}>
          <AnimatedText text={sample.head} animation={animation} size={sample.headSize} speed={speed} />
          {sample.sub ? (
            <AnimatedText
              text={sample.sub}
              animation={animation}
              size={24}
              delay={times.subDelay}
              speed={speed}
              style={styles.subLine}
            />
          ) : null}
        </View>
        <Animated.View
          style={[
            styles.phoneFooter,
            {
              animationName: { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
              animationDuration: '420ms',
              animationDelay: `${Math.round(times.cta / speed)}ms`,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'backwards',
            },
          ]}
        >
          <View style={styles.cta}>
            <Text style={styles.ctaLabel}>{sample.cta}</Text>
          </View>
        </Animated.View>
      </AppBackground>
    </View>
  );
}

function Segment<T>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <Pressable key={o.label} onPress={() => onChange(o.value)} style={[styles.segmentItem, o.value === value && styles.segmentOn]}>
          <Text style={[styles.segmentLabel, o.value === value && styles.segmentLabelOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, on && styles.toggleOn]} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <Text style={[styles.toggleLabel, on && styles.toggleLabelOn]}>{label}</Text>
    </Pressable>
  );
}

function Button({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }): ReactNode {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, strong && styles.buttonStrong, pressed && styles.pressed]}>
      <Text style={[styles.buttonLabel, strong && styles.buttonLabelStrong]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: Nocturne.bg },
  narrowRoot: { flex: 1, backgroundColor: Nocturne.bg },
  sidebar: { width: 290, flexGrow: 0, borderRightWidth: 1, borderRightColor: Nocturne.line },
  sidebarBody: { padding: 16, paddingBottom: 40 },
  main: { flex: 1 },
  mainBody: { padding: 16, paddingBottom: 48 },
  mainInner: { gap: 16, width: '100%', maxWidth: 1400, alignSelf: 'center' },
  header: { gap: 4 },
  h1: { ...DisplayFont, color: Nocturne.text, fontSize: 34, letterSpacing: -0.5 },
  sub: { color: Nocturne.text2, fontSize: 15, lineHeight: 21 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  segment: { flexDirection: 'row', backgroundColor: Nocturne.surface, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: Nocturne.line },
  segmentItem: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  segmentOn: { backgroundColor: Nocturne.cta },
  segmentLabel: { color: Nocturne.text2, fontSize: 14, fontWeight: '600' },
  segmentLabelOn: { color: Nocturne.onCta },
  toggle: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: Nocturne.edge },
  toggleOn: { backgroundColor: Nocturne.raised, borderColor: Nocturne.text },
  toggleLabel: { color: Nocturne.text2, fontSize: 14, fontWeight: '600' },
  toggleLabelOn: { color: Nocturne.text },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: Nocturne.surface, borderWidth: 1, borderColor: Nocturne.edge },
  buttonStrong: { backgroundColor: Nocturne.cta, borderColor: Nocturne.cta },
  buttonLabel: { color: Nocturne.text, fontSize: 14, fontWeight: '600' },
  buttonLabelStrong: { color: Nocturne.onCta },
  pressed: { opacity: 0.7 },
  samples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sample: { maxWidth: 260, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Nocturne.surface, borderWidth: 1, borderColor: Nocturne.line },
  sampleOn: { borderColor: Nocturne.text },
  sampleLabel: { color: Nocturne.text2, fontSize: 13 },
  sampleLabelOn: { color: Nocturne.text },
  input: {
    minWidth: 240,
    flexGrow: 1,
    maxWidth: 420,
    color: Nocturne.text,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Nocturne.edge,
  },
  focus: { alignItems: 'center', gap: 16 },
  focusBeside: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 32 },
  detailBeside: { width: 380, marginTop: 40 },
  stageRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 32 },
  compareCol: { opacity: 1 },
  compareLabels: { marginTop: -6 },
  compareLabel: { color: Nocturne.text2, fontSize: 13, textAlign: 'center' },
  phone: {
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Nocturne.edge,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
  },
  phoneTop: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 54, paddingBottom: 10 },
  fakeBack: { width: 34, height: 34, borderRadius: 17, backgroundColor: Nocturne.frost, opacity: 0 },
  fakeProgress: { flex: 1, flexDirection: 'row', gap: 4 },
  fakeSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  fakeFill: { height: '100%', backgroundColor: Nocturne.text },
  fakeExit: { color: Nocturne.text2, fontSize: 15, fontWeight: '500' },
  phoneBody: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  bottom: { justifyContent: 'flex-end' },
  center: { justifyContent: 'center' },
  subLine: { marginTop: 16 },
  phoneFooter: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
  cta: { minHeight: 56, borderRadius: 28, backgroundColor: Nocturne.cta, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  detail: { width: '100%', gap: 8, padding: 18, borderRadius: 20, backgroundColor: Nocturne.surface, borderWidth: 1, borderColor: Nocturne.line },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailNumber: { ...DisplayFont, color: Nocturne.text3, fontSize: 36, fontVariant: ['tabular-nums'] },
  detailTitleCol: { flex: 1 },
  detailName: { ...DisplayFont, color: Nocturne.text, fontSize: 26 },
  detailFamily: { color: Nocturne.text2, fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  starButton: { padding: 6 },
  star: { color: Nocturne.text3, fontSize: 26 },
  starOn: { color: Nocturne.text },
  detailNote: { color: Nocturne.text, fontSize: 16, lineHeight: 22 },
  detailMeta: { color: Nocturne.text2, fontSize: 13, lineHeight: 18, fontFamily: Platform.select({ web: 'var(--font-mono)', default: undefined }) },
  detailWarn: { color: Nocturne.text3, fontSize: 12, lineHeight: 17 },
  nav: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  keys: { color: Nocturne.text3, fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: 300,
    flexGrow: 1,
    maxWidth: 420,
    minHeight: 190,
    padding: 14,
    borderRadius: 18,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.line,
    gap: 10,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileNumber: { color: Nocturne.text3, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tileName: { flex: 1, color: Nocturne.text, fontSize: 14, fontWeight: '600' },
  tileStar: { color: Nocturne.text3, fontSize: 18 },
  tileStage: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  tileFamily: { color: Nocturne.text3, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  family: { marginBottom: 18 },
  familyName: { color: Nocturne.text, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' },
  familyBlurb: { color: Nocturne.text3, fontSize: 12, marginTop: 2, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  itemOn: { backgroundColor: Nocturne.cta },
  itemNumber: { color: Nocturne.text3, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'], width: 20 },
  itemName: { flex: 1, color: Nocturne.text, fontSize: 14 },
  itemTextOn: { color: Nocturne.onCta },
  itemStar: { color: Nocturne.text3, fontSize: 16 },
  pickDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Nocturne.text2 },
  pickDotOn: { backgroundColor: Nocturne.onCta },
  legend: { color: Nocturne.text3, fontSize: 12, marginTop: 4 },
});
