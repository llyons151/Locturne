import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { formatPreset } from '@/features/onboarding/time-wheel';
import * as haptic from '@/lib/haptics';
import {
  endNap,
  getAccess,
  getNap,
  hasSelection,
  isAnyShieldUp,
  isScreenTimeAvailable,
  setShieldText,
  startNap,
  type ActiveNap,
} from '@/lib/screen-time';
import { noOrphan } from '@/lib/text';
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

import { LengthPicker } from './length-picker';

/**
 * The Nap tab: tuck him in for 15, 30 or 60 minutes and the bedtime apps sleep with him.
 * Calls and texts are untouched. A nap is the user's own idea, so waking early is one tap.
 *
 * The nap lives in the App Group (`startNap`), and iOS wakes the apps at the end even if
 * the app is closed, so this screen only mirrors it.
 */

const LENGTHS = [15, 30, 60];

/** Loc's lines (VOICE.md line bank). */
const LINES = {
  idle: 'Finally. A nap.',
  napping: 'Tucked in. Do not perceive me.',
  ended: "I'm up. Don't talk to me yet.",
  woken: 'Fine. *Fine.*',
};

type Nap = ActiveNap;

/** Why a nap can't start right now, or null if it can. */
function blocker(): string | null {
  if (!isScreenTimeAvailable()) return 'Naps need Screen Time, which only iPhone has.';
  if (getAccess() !== 'approved') return 'Turn on Screen Time access first.';
  if (!hasSelection('night')) return 'Pick your bedtime apps on the Apps tab first.';
  // Waking at the end of the nap would also wake a bedtime block, so don't stack them.
  if (isAnyShieldUp()) return 'Your apps are already asleep.';
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
  const [nap, setNap] = useState<Nap | null>(null);
  const [line, setLine] = useState<keyof typeof LINES>('idle');
  const [now, setNow] = useState(Date.now);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Pick up a nap started earlier (or one iOS already ended) whenever the tab comes back.
  useFocusEffect(
    useCallback(() => {
      if (!isScreenTimeAvailable()) return;
      setNap(getNap());
      setNow(Date.now());
    }, []),
  );

  // One tick a second while napping, and every 30 s otherwise (for "until 3:12 pm").
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (nap && t >= nap.end) {
        haptic.done();
        if (isScreenTimeAvailable()) getNap(); // tidies up if iOS hasn't yet
        setNap(null);
        setLine('ended');
      }
    }, nap ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [nap]);

  const start = async () => {
    const why = blocker();
    setNotice(why);
    if (why) return;
    setStarting(true);
    try {
      // Without this iOS shows its own "restricted" screen instead of Loc's.
      setShieldText({
        title: LINES.napping.replaceAll('*', ''),
        subtitle: `Napping until ${timeOf(Date.now() + length * 60_000)}`,
        button: 'Fine',
      });
      const started = await startNap('night', length);
      setNow(Date.now());
      setNap(started);
      setLine('napping');
    } catch {
      setNotice("iOS wouldn't start the nap. Try again in a moment.");
    } finally {
      setStarting(false);
    }
  };
  const wake = () => {
    haptic.tap();
    endNap();
    setNap(null);
    setLine('woken');
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
            ? 'Your bedtime apps are asleep with him. Calls and texts still work.'
            : 'Your bedtime apps sleep with him. Calls and texts still work.'}
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
        </View>
      ) : (
        <View style={styles.bottom}>
          <LengthPicker value={length} options={LENGTHS} onChange={setLength} />
          <Text style={styles.until}>Apps asleep until {timeOf(now + length * 60_000)}</Text>
          <PrimaryButton label="Tuck him in" onPress={start} disabled={starting} />
          {/* Never imply protection is on when it isn't (GAME_PLAN, "Reliability"). */}
          {notice && <Text style={styles.preview}>{notice}</Text>}
        </View>
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
