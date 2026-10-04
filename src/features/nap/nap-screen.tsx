import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import { Segmented } from '@/components/segmented';
import * as haptic from '@/lib/haptics';
import { syncLock } from '@/lib/lock-controller';
import {
  endNap,
  getAccess,
  getNap,
  hasSelection,
  isNightHeld,
  isScreenTimeAvailable,
  isStoodDown,
  NapClockChangeError,
  selectionSize,
  startNap,
  type ActiveNap,
} from '@/lib/screen-time';
import { formatPreset, noOrphan } from '@/lib/text';
import {
  DISPLAY_MAX_SCALE,
  DisplayFont,
  Gap,
  italicOverhang,
  Nocturne,
  NUMBER_FONT,
  Space,
  Type,
  VoiceSize,
} from '@/theme';

import { NapClock } from './nap-clock';
import { useSideways } from './use-sideways';

/**
 * The Nap tab, GAME_PLAN's "Block now": tuck him in for a while, and the bedtime apps (or
 * apps picked just for naps) sleep with him. Phone calls always get through. It starts at
 * once because it only tightens things; waking him early takes a deliberate confirmation.
 *
 * The nap lives in the App Group (`startNap`), and iOS wakes the apps at the end even if
 * the app is closed, so this screen only mirrors it. Apps another rule still holds (the
 * always list, the night lock, a used-up limit) stay asleep when it ends.
 */

const lengthLabel = (minutes: number) => (minutes % 60 === 0 ? `${minutes / 60} hr` : `${minutes} min`);
const LENGTHS = [15, 30, 60, 120, 240].map((minutes) => ({ value: minutes, label: lengthLabel(minutes) }));

type List = ActiveNap['list'];
const LISTS: { value: List; label: string }[] = [
  { value: 'night', label: 'Bedtime apps' },
  { value: 'block', label: 'Pick apps' },
];

/** "1 pick", "3 picks". A whole category is one pick: iOS won't say how many apps it holds. */
const countPicks = (n: number) => (n === 1 ? '1 pick' : `${n} picks`);

/** Loc's lines (VOICE.md line bank). */
const LINES = {
  idle: 'Finally. A nap.',
  napping: 'Tucked in. Do not perceive me.',
  ended: "I'm up. Don't talk to me yet.",
  woken: 'Fine. *Fine.*',
};

type Nap = ActiveNap;

/** Why a nap can't start right now, or null if it can. */
function blocker(list: List): string | null {
  if (!isScreenTimeAvailable()) return 'Naps need Screen Time, which only iPhone has.';
  if (getAccess() !== 'approved') return 'Turn on Screen Time access first.';
  if (isStoodDown()) return 'Block now needs a subscription. Subscribe from the You tab.';
  if (list === 'night' && !hasSelection('night')) return 'Pick your bedtime apps on the Apps tab first.';
  if (list === 'block' && !hasSelection('block')) return 'Pick the apps for this nap first.';
  if (list === 'night' && isNightHeld()) return 'Your bedtime apps are already asleep.';
  return null;
}

/** 1453 seconds → "24:13". */
function clock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const timeOf = (ms: number) => {
  const d = new Date(ms);
  return formatPreset(d.getHours() * 60 + d.getMinutes());
};

export function NapScreen() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  const [length, setLength] = useState(30);
  const [list, setList] = useState<List>('night');
  const [picking, setPicking] = useState(false);
  const [picks, setPicks] = useState(0);
  const [nap, setNap] = useState<Nap | null>(null);
  const [line, setLine] = useState<keyof typeof LINES>('idle');
  const [now, setNow] = useState(Date.now);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [focused, setFocused] = useState(false);
  // Turning the phone on its side mid-nap shows the moon clock. Only listens while it could.
  const side = useSideways(nap !== null && focused);

  // Pick up a nap started earlier (or one iOS already ended) whenever the tab comes back.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (isScreenTimeAvailable()) {
        setNap(getNap());
        setNow(Date.now());
        setPicks(selectionSize('block'));
      }
      return () => setFocused(false);
    }, []),
  );

  // One tick a second while napping, and every 30 s otherwise (for "until 3:12 pm").
  // On its side the clock shows whole minutes, so it only ticks as each one turns over,
  // and every second again for the last minute.
  useEffect(() => {
    const ms = nap ? nap.end - Date.now() : 0;
    const delay = !nap ? 30_000 : side && ms > 61_000 ? (ms % 60_000 || 60_000) + 20 : 1000;
    const id = setTimeout(() => {
      const t = Date.now();
      setNow(t);
      if (nap && t >= nap.end) {
        haptic.done();
        // Tidies up if iOS hasn't yet, and puts the shields' words back.
        if (isScreenTimeAvailable()) syncLock();
        setNap(null);
        setLine('ended');
      }
    }, delay);
    return () => clearTimeout(id);
  }, [nap, side, now]);

  const choose = (next: List) => {
    setList(next);
    setNotice(null);
    // The first time, go straight to Apple's picker.
    if (next === 'block' && isScreenTimeAvailable() && picks === 0) setPicking(true);
  };
  const refreshPicks = () => setPicks(isScreenTimeAvailable() ? selectionSize('block') : 0);

  const start = async () => {
    const why = blocker(list);
    setNotice(why);
    if (why) return;
    setStarting(true);
    try {
      const started = await startNap(list, length);
      // Loc's Block now words on the shield (shield-copy.ts), unless the night or morning
      // lock holds these apps too, whose words and morning tap matter more.
      syncLock();
      setNow(Date.now());
      setNap(started);
      setLine('napping');
    } catch (error) {
      setNotice(error instanceof NapClockChangeError ? error.message : "iOS wouldn't start the nap. Try again in a moment.");
    } finally {
      setStarting(false);
    }
  };
  const wakeNow = () => {
    haptic.tap();
    endNap();
    syncLock();
    setNap(null);
    setLine('woken');
  };
  // Deliberate, like every early exit (GAME_PLAN, "Humane exits"): the system alert asks first.
  const wake = () => {
    Alert.alert('Wake him early?', 'Your apps wake up now. Anything else keeping them asleep stays.', [
      { text: 'Keep napping', style: 'cancel' },
      { text: 'Wake him', style: 'destructive', onPress: wakeNow },
    ]);
  };

  const left = nap ? (nap.end - now) / 1000 : 0;
  const done = nap ? 1 - left / ((nap.end - nap.start) / 1000) : 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
        Nap
      </Text>

      <Animated.View key={line} entering={FadeIn.duration(400)} style={styles.top}>
        <Voice text={LINES[line]} />
        <Text style={styles.body}>
          {nap
            ? `${nap.list === 'night' ? 'Your bedtime apps are' : 'The apps you picked are'} asleep with him. Phone calls still get through.`
            : `${list === 'night' ? 'Your bedtime apps sleep' : 'The apps you pick sleep'} with him. Phone calls still get through.`}
        </Text>
      </Animated.View>

      <View style={styles.flex} />

      {nap ? (
        <View style={styles.bottom}>
          <View
            style={styles.timer}
            accessible
            accessibilityLabel={`${Math.ceil(left / 60)} minutes left. Apps asleep until ${timeOf(nap.end)}.`}
          >
            <Text style={styles.countdown} maxFontSizeMultiplier={1.2}>
              {clock(left)}
            </Text>
            <View style={styles.statusRow}>
              <SymbolView name={sym('moon.zzz.fill', 'bedtime')} size={15} tintColor={Nocturne.text2} />
              <Text style={styles.status}>Apps asleep until {timeOf(nap.end)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(1, done) * 100}%` }]} />
            </View>
          </View>
          <TextButton label="Wake him early" onPress={wake} />
          <NapClock side={side} progress={done} left={left} until={`Apps asleep until ${timeOf(nap.end)}`} />
        </View>
      ) : (
        <View style={styles.bottom}>
          <Segmented label="Which apps sleep" value={list} options={LISTS} onChange={choose} />
          {list === 'block' && (
            <Section>
              <ValueRow
                icon={sym('square.grid.2x2', 'apps')}
                title="Apps for naps"
                value={picks ? countPicks(picks) : 'None yet'}
                onPress={() =>
                  isScreenTimeAvailable() ? setPicking(true) : setNotice("Apple's app picker only opens on iPhone.")
                }
                last
              />
            </Section>
          )}
          <Segmented label="Nap length" value={length} options={LENGTHS} onChange={setLength} />
          <Text style={styles.until}>Apps asleep until {timeOf(now + length * 60_000)}</Text>
          <PrimaryButton label="Tuck him in" onPress={start} disabled={starting} />
          {/* Never imply protection is on when it isn't (GAME_PLAN, "Reliability"). */}
          {notice && <Text style={styles.preview}>{notice}</Text>}
        </View>
      )}

      {picking && (
        <ScreenTimePicker
          list="block"
          onPicked={refreshPicks}
          onClose={() => {
            setPicking(false);
            refreshPicks();
            // The library saves the picks a moment after Done (see the Apps tab).
            setTimeout(refreshPicks, 500);
          }}
        />
      )}
    </ScrollView>
  );
}

/** His line in the italic serif. `*word*` is set in the upright cut for emphasis. */
function Voice({ text }: { text: string }) {
  const parts = noOrphan(text).split('*');
  return (
    <Text style={styles.voice} maxFontSizeMultiplier={1.3}>
      {parts.map((part, i) => (i % 2 ? <Text key={i} style={styles.emphasis}>{part}</Text> : part))}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: Gap.gutter },
  flex: { flex: 1, minHeight: Space.xxxl },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3 },
  top: { gap: Space.l, marginTop: Space.xxxl },
  voice: {
    ...DisplayFont,
    ...italicOverhang(VoiceSize.headline),
    color: Nocturne.text,
    fontSize: VoiceSize.headline,
    lineHeight: VoiceSize.headline * 1.08,
  },
  emphasis: { fontStyle: 'normal' },
  body: { ...Type.body, color: Nocturne.text2 },

  bottom: { gap: Space.l, paddingBottom: Space.s },

  until: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  preview: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },

  timer: { gap: Space.m },
  countdown: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 72, lineHeight: 80, fontVariant: ['tabular-nums'] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  status: { ...Type.body, color: Nocturne.text2 },
  track: { height: 6, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.cta },
});
