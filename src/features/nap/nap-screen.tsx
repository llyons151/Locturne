'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useProtection } from '@/hooks/use-protection';
import { isPickerSettling, settlePicker } from '@/features/apps/picker-settle';
import { OutlineButton, PrimaryButton } from '@/components/buttons';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import { Segmented } from '@/components/segmented';
import * as haptic from '@/lib/haptics';
import { onLockChange, syncLock } from '@/lib/lock-controller';
import {
  getProtection,
  getNap,
  hasSelection,
  isNightHeld,
  isScreenTimeAvailable,
  isStoodDown,
  NapClockChangeError,
  peekNap,
  selectionSize,
  shownSelection,
  startNap,
  type ActiveNap,
} from '@/lib/screen-time';
import { formatPreset, noOrphan } from '@/lib/text';
import {
  DisplayFont,
  italicOverhang,
  Nocturne,
  NUMBER_FONT,
  Space,
  Type,
  VoiceSize,
} from '@/theme';

import { NapClock } from './nap-clock';
import { shownLine, type NapLine } from './nap-line';
import { closeSleepSheet } from './sleep-sheet';
import { useSideways } from './use-sideways';

const SKY = require('@/assets/onboarding/night-sky-moonless.png');
const MOON = require('@/assets/onboarding/moon.webp');

/**
 * The Sleep sheet, GAME_PLAN's "Block now": tuck him in for a while, and the bedtime apps (or
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
const LINES: Record<NapLine, string> = {
  idle: 'Finally. A nap.',
  napping: 'Tucked in. Do not perceive me.',
  ended: "I'm up. Don't talk to me yet.",
  woken: 'Fine. *Fine.*',
};

type Nap = ActiveNap;

/** Why a nap can't start right now, or null if it can. */
function blocker(list: List): string | null {
  if (!isScreenTimeAvailable()) return 'Naps need Screen Time, which only iPhone has.';
  if (getProtection() !== 'on') return 'Turn on Screen Time access first.';
  if (isStoodDown()) return 'Block now needs a subscription. Subscribe from the You tab.';
  if (list === 'night' && !hasSelection('night')) {
    // An emergency unlock parks the picks until the next bedtime (`pauseNightUntil`): they're
    // still chosen, just awake, and a nap on the empty live list would shield nothing.
    return shownSelection('night').size > 0
      ? 'Your bedtime apps are awake until bedtime after the emergency unlock. Pick apps for this nap instead.'
      : 'Pick your bedtime apps on the Apps tab first.';
  }
  if (list === 'block' && !hasSelection('block')) return 'Pick the apps for this nap first.';
  if (list === 'night' && isNightHeld()) return 'Your bedtime apps are already asleep.';
  return null;
}

/** "1 minute", "3 minutes". */
const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

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
  const [protection, recheckProtection] = useProtection();

  const [length, setLength] = useState(30);
  const [list, setList] = useState<List>('night');
  const [picking, setPicking] = useState(false);
  const [picks, setPicks] = useState(0);
  const [nap, setNap] = useState<Nap | null>(null);
  const [line, setLine] = useState<NapLine>('idle');
  const [now, setNow] = useState(Date.now);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [focused, setFocused] = useState(false);
  // Turning the phone on its side mid-nap shows the moon clock. Only listens while it could.
  const side = useSideways(nap !== null && focused && protection === 'on');

  // A stand-down (a lapse found on return) or a pass ends the nap while this sheet is open.
  useEffect(() => onLockChange(() => isScreenTimeAvailable() && setNap(peekNap())), []);

  // Pick up a nap started earlier (or one iOS already ended) whenever the sheet opens or comes back.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (isScreenTimeAvailable()) {
        const found = getNap();
        setNap(found);
        // One running already reads as this sheet's own, so ending it some other way reads as ended.
        if (found) setLine('napping');
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
    if (next === 'block' && isScreenTimeAvailable() && picks === 0 && !isPickerSettling('block')) setPicking(true);
  };
  const refreshPicks = () => setPicks(isScreenTimeAvailable() ? selectionSize('block') : 0);

  // The notice sits under the button; iOS has no live regions, so VoiceOver is told directly.
  const refuse = (why: string) => {
    setNotice(why);
    AccessibilityInfo.announceForAccessibility(why);
  };

  const start = async () => {
    if (isPickerSettling(list)) return refuse("Your app picks are still saving. Try again in a moment.");
    const why = blocker(list);
    setNotice(null);
    if (why) return refuse(why);
    setStarting(true);
    try {
      const started = await startNap(list, length);
      // Loc's Block now words on the shield (shield-copy.ts), unless the night or morning
      // lock holds these apps too, whose words and morning tap matter more.
      syncLock();
      recheckProtection();
      setNow(Date.now());
      setNap(started);
      setLine('napping');
    } catch (error) {
      refuse(error instanceof NapClockChangeError ? error.message : "iOS wouldn't start the nap. Try again in a moment.");
    } finally {
      setStarting(false);
    }
  };
  // Early exits use the same deliberate emergency/pass flow as every other lock.
  const wake = () => router.push('/exits');

  // A pass, an emergency unlock or a lapse can end the nap with only `setNap` above.
  const shown = shownLine(line, nap !== null);
  const left = nap ? (nap.end - now) / 1000 : 0;
  const done = nap ? 1 - left / ((nap.end - nap.start) / 1000) : 0;
  const napProtected = protection === 'on';
  const napStatus = nap && napProtected
    ? `Apps asleep until ${timeOf(nap.end)}`
    : 'Screen Time protection is off.';

  const at = LENGTHS.findIndex((l) => l.value === length);
  const step = (by: 1 | -1) => {
    const next = LENGTHS[at + by];
    if (!next) return;
    haptic.tap();
    setLength(next.value);
  };

  // The pill under the picture, like the reference's address pill: what sleeps, until when.
  const pill = nap ? napStatus : `Apps asleep until ${timeOf(now + length * 60_000)}`;

  return (
    <View style={styles.sheet}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.4}>
        Sleep
      </Text>

      {/* The reference's map: here the night sky and the moon, with his line and the length on it. */}
      <View style={styles.visual}>
        <Image source={SKY} style={[StyleSheet.absoluteFill, styles.sky]} contentFit="cover" contentPosition="top right" accessible={false} />
        <Image source={MOON} style={styles.moon} contentFit="contain" accessible={false} />

        <Animated.View key={shown} entering={FadeIn.duration(400)} style={styles.voiceWrap}>
          <Voice text={nap && !napProtected ? "I can’t confirm they’re asleep." : LINES[shown]} />
        </Animated.View>

        {nap ? (
          <View
            style={styles.timer}
            accessible
            accessibilityLabel={`${plural(Math.max(0, Math.ceil(left / 60)), 'minute')} left. ${napStatus}.`}
          >
            <Text style={styles.countdown} maxFontSizeMultiplier={1.2}>
              {clock(left)}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(1, done) * 100}%` }]} />
            </View>
          </View>
        ) : (
          /* One adjustable control for VoiceOver: swipe up or down to change the length. */
          <View
            style={[styles.stepper, styles.stepperRoom]}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Nap length"
            accessibilityValue={{ text: `${lengthLabel(length)}, apps asleep until ${timeOf(now + length * 60_000)}` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          >
            <StepButton icon="minus" onPress={() => step(-1)} disabled={at <= 0} />
            <Animated.Text key={length} entering={FadeIn.duration(220)} style={styles.lengthValue} maxFontSizeMultiplier={1.2}>
              {lengthLabel(length)}
            </Animated.Text>
            <StepButton icon="plus" onPress={() => step(1)} disabled={at >= LENGTHS.length - 1} />
          </View>
        )}

        <View style={styles.pill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <SymbolView name={sym('moon.zzz.fill', 'bedtime')} size={15} tintColor={Nocturne.text} />
          <Text style={styles.pillText} numberOfLines={1}>
            {pill}
          </Text>
        </View>
      </View>

      <Text style={styles.body}>
        {nap && !napProtected ? 'Turn Screen Time access back on from the Apps tab.' : nap
          ? `${nap.list === 'night' ? 'Your bedtime apps are' : 'The apps you picked are'} asleep with him. Phone calls still get through.`
          : `${list === 'night' ? 'Your bedtime apps sleep' : 'The apps you pick sleep'} with him. Phone calls still get through.`}
      </Text>

      {nap ? null : (
        <View style={styles.choose}>
          <Segmented label="Which apps sleep" value={list} options={LISTS} onChange={choose} />
          {list === 'block' && (
            <Section>
              <ValueRow
                icon={sym('square.grid.2x2', 'apps')}
                title="Apps for naps"
                value={picks ? countPicks(picks) : 'None yet'}
                onPress={() =>
                  isScreenTimeAvailable() ? (!isPickerSettling('block') && setPicking(true)) : refuse("Apple's app picker only opens on iPhone.")
                }
                last
              />
            </Section>
          )}
        </View>
      )}

      {/* The reference's two buttons: the main one filled, the other outlined. */}
      <View style={styles.actions}>
        {nap ? (
          <>
            <PrimaryButton flex label="Done" onPress={closeSleepSheet} />
            <OutlineButton flex label="Wake him early" onPress={wake} />
          </>
        ) : (
          <>
            <PrimaryButton flex icon={sym('moon.zzz.fill', 'bedtime')} label="Tuck him in" onPress={start} disabled={starting} />
            <OutlineButton flex label="Cancel" onPress={closeSleepSheet} />
          </>
        )}
      </View>
      {/* Never imply protection is on when it isn't (GAME_PLAN, "Reliability"). */}
      {notice && <Text style={styles.preview}>{notice}</Text>}

      {nap ? <NapClock side={side} progress={done} left={left} until={napStatus} /> : null}

      {picking && (
        <ScreenTimePicker
          list="block"
          onPicked={refreshPicks}
          onClose={() => {
            setPicking(false);
            refreshPicks();
            // The library saves the picks a moment after Done (see the Apps tab).
            settlePicker('block', refreshPicks);
          }}
        />
      )}
    </View>
  );
}

/** The round − and + either side of the length, like a stepper. */
function StepButton({ icon, onPress, disabled }: { icon: 'minus' | 'plus'; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      importantForAccessibility="no"
      style={({ pressed }) => [styles.stepButton, disabled && styles.stepDisabled, pressed && styles.pressed]}
    >
      <SymbolView name={sym(icon, icon === 'minus' ? 'remove' : 'add')} size={17} weight="semibold" tintColor={Nocturne.text} />
    </Pressable>
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

const MOON_SIZE = 112;

const styles = StyleSheet.create({
  // Sized to its contents inside the floating card (sleep-sheet.tsx), which adds the bottom inset.
  sheet: { paddingHorizontal: Space.l, paddingTop: Space.m, gap: Space.l },
  pressed: { opacity: 0.6 },
  title: { ...Type.body, fontWeight: '600', color: Nocturne.text, textAlign: 'center' },

  visual: {
    borderRadius: 28,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: Space.l,
    gap: Space.l,
    backgroundColor: Nocturne.bg,
  },
  // The app's sky, light from below, as behind the tabs.
  sky: { transform: [{ scaleY: -1 }] },
  // The real moon, half out of the corner, as on the Apps and Routine cards.
  moon: { position: 'absolute', width: MOON_SIZE, height: MOON_SIZE, top: -MOON_SIZE * 0.4, right: -MOON_SIZE * 0.3 },
  voiceWrap: { paddingRight: MOON_SIZE * 0.6 },
  // Clear of the moon in the corner.
  stepperRoom: { marginTop: Space.s },
  voice: {
    ...DisplayFont,
    ...italicOverhang(VoiceSize.aside),
    color: Nocturne.text,
    fontSize: VoiceSize.aside,
    lineHeight: VoiceSize.aside * 1.15,
  },
  emphasis: { fontStyle: 'normal' },
  body: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center', paddingHorizontal: Space.s },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.m },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 31, 35, 0.85)',
  },
  stepDisabled: { opacity: 0.35 },
  lengthValue: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 48, lineHeight: 54, fontVariant: ['tabular-nums'] },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    minHeight: 44,
    paddingHorizontal: Space.l,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(22, 22, 23, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nocturne.edge,
  },
  pillText: { flex: 1, ...Type.secondary, fontWeight: '500', color: Nocturne.text },

  choose: { gap: Space.m },
  actions: { flexDirection: 'row', gap: Space.m },
  preview: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },

  timer: { gap: Space.m, alignItems: 'center' },
  countdown: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 56, lineHeight: 62, fontVariant: ['tabular-nums'] },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.cta },
});
