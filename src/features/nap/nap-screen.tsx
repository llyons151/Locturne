'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useProtection } from '@/hooks/use-protection';
import { isPickerSettling, settlePicker } from '@/features/apps/picker-settle';
import { sym, type Symbol } from '@/components/grouped-list';
import { ScreenTimePicker } from '@/components/screen-time-picker';
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
  NUMBER_FONT,
  Space,
  Type,
  VoiceSize,
} from '@/theme';

import { NapClock } from './nap-clock';
import { shownLine, type NapLine } from './nap-line';
import { closeSleepSheet } from './sleep-sheet';
import { useSideways } from './use-sideways';


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

  // The reference's white address pill: what sleeps, until when.
  const pill = nap ? napStatus : `Apps asleep until ${timeOf(now + length * 60_000)}`;
  const pickApps = () =>
    isScreenTimeAvailable() ? !isPickerSettling('block') && setPicking(true) : refuse("Apple's app picker only opens on iPhone.");

  return (
    <View style={styles.sheet}>
      {/* Copied from the user's references (sleep-sheet.png, and the wallet sheet's option
          cards): white, dark type, one blue for actions and the chosen option. */}
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.4}>
        Sleep
      </Text>
      <Animated.View key={shown} entering={FadeIn.duration(300)}>
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
          style={styles.stepper}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Nap length"
          accessibilityValue={{ text: `${lengthLabel(length)}, apps asleep until ${timeOf(now + length * 60_000)}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          <StepButton icon="minus" onPress={() => step(-1)} disabled={at <= 0} />
          <Text style={styles.lengthValue} maxFontSizeMultiplier={1.2}>
            {lengthLabel(length)}
          </Text>
          <StepButton icon="plus" onPress={() => step(1)} disabled={at >= LENGTHS.length - 1} />
        </View>
      )}

      <View style={styles.pill} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <SymbolView name={sym('moon.zzz.fill', 'bedtime')} size={16} tintColor={BLUE} />
        <Text style={styles.pillText} numberOfLines={1}>
          {pill}
        </Text>
      </View>

      {nap ? (
        <Text style={styles.body}>
          {!napProtected
            ? 'Turn Screen Time access back on from the Apps tab.'
            : `${nap.list === 'night' ? 'Your bedtime apps are' : 'The apps you picked are'} asleep with him. Phone calls still get through.`}
        </Text>
      ) : (
        /* The wallet sheet's option cards: icon, title, a grey line, and a check on the chosen one. */
        <View style={styles.options} accessibilityRole="radiogroup">
          <Option
            icon={sym('moon.zzz.fill', 'bedtime')}
            title="Bedtime apps"
            detail="The ones that sleep every night. Calls still get through."
            selected={list === 'night'}
            onPress={() => choose('night')}
          />
          <Option
            icon={sym('square.grid.2x2.fill', 'apps')}
            title="Pick apps"
            detail={list === 'block' ? `${picks ? countPicks(picks) : 'None yet'}. Tap to change.` : 'Choose apps just for this nap.'}
            selected={list === 'block'}
            onPress={() => (list === 'block' ? pickApps() : choose('block'))}
          />
        </View>
      )}

      {/* The reference's two buttons: the main one filled blue, the other outlined. */}
      <View style={styles.actions}>
        {nap ? (
          <>
            <SheetButton label="Done" onPress={closeSleepSheet} />
            <SheetButton outline label="Wake him early" onPress={wake} />
          </>
        ) : (
          <>
            <SheetButton icon={sym('moon.zzz.fill', 'bedtime')} label="Tuck him in" onPress={start} disabled={starting} />
            <SheetButton outline label="Cancel" onPress={closeSleepSheet} />
          </>
        )}
      </View>
      {/* Never imply protection is on when it isn't (GAME_PLAN, "Reliability"). */}
      {notice && <Text style={styles.notice}>{notice}</Text>}

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

/** One of the wallet sheet's option cards. The chosen one gets a blue edge and check. */
function Option({
  icon,
  title,
  detail,
  selected,
  onPress,
}: {
  icon: Symbol;
  title: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && styles.pressed]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconOn]}>
        <SymbolView name={icon} size={18} tintColor={selected ? '#FFFFFF' : INK2} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
      {selected ? (
        <View style={styles.check}>
          <SymbolView name={sym('checkmark', 'check')} size={11} weight="bold" tintColor="#FFFFFF" />
        </View>
      ) : (
        <View style={styles.radio} />
      )}
    </Pressable>
  );
}

/** The reference's buttons: "Locate Me" filled blue with an icon, "Change" outlined in blue. */
function SheetButton({
  label,
  onPress,
  outline,
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: Symbol;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, outline && styles.buttonOutline, (pressed || disabled) && styles.pressed]}
    >
      {icon ? <SymbolView name={icon} size={17} weight="semibold" tintColor="#FFFFFF" /> : null}
      <Text style={[styles.buttonLabel, outline && styles.buttonLabelOutline]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
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
      <SymbolView name={sym(icon, icon === 'minus' ? 'remove' : 'add')} size={17} weight="semibold" tintColor={INK} />
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

// The references' light palette, in the app's blue rather than their indigo.
const INK = '#111827';
const INK2 = '#6B7280';
const LINE = '#E5E7EB';
const BLUE = '#2F6FD6';
const BLUE_SOFT = '#EEF4FD';

const styles = StyleSheet.create({
  // Sized to its contents inside the white card (sleep-sheet.tsx), which adds the bottom inset.
  sheet: { paddingHorizontal: Space.xl, paddingTop: Space.m, gap: Space.l },
  pressed: { opacity: 0.7 },
  title: { color: INK, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', marginTop: Space.xs },
  voice: {
    ...DisplayFont,
    ...italicOverhang(VoiceSize.aside),
    color: INK2,
    fontSize: 19,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: -Space.s,
  },
  emphasis: { fontStyle: 'normal' },
  body: { ...Type.secondary, color: INK2, textAlign: 'center' },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.m },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  stepDisabled: { opacity: 0.35 },
  lengthValue: { ...NUMBER_FONT, color: INK, fontSize: 48, lineHeight: 54, fontVariant: ['tabular-nums'] },

  // White, softly lifted, as in the reference. A neutral shadow, never a glow.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    minHeight: 48,
    paddingHorizontal: Space.l,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
  },
  pillText: { flex: 1, ...Type.secondary, fontWeight: '600', color: INK },

  options: { gap: Space.s },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    padding: Space.m,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
  },
  optionOn: { borderColor: BLUE, backgroundColor: BLUE_SOFT },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  optionIconOn: { backgroundColor: BLUE },
  optionText: { flex: 1, gap: 1 },
  optionTitle: { color: INK, fontSize: 16, fontWeight: '600' },
  optionDetail: { ...Type.caption, color: INK2 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D1D5DB' },

  actions: { flexDirection: 'row', gap: Space.m },
  button: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.s,
    paddingHorizontal: Space.l,
    borderRadius: 27,
    backgroundColor: BLUE,
  },
  buttonOutline: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: BLUE },
  buttonLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  buttonLabelOutline: { color: BLUE },
  notice: { ...Type.caption, color: INK2, textAlign: 'center' },

  timer: { gap: Space.m, alignItems: 'center' },
  countdown: { ...NUMBER_FONT, color: INK, fontSize: 56, lineHeight: 62, fontVariant: ['tabular-nums'] },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: LINE, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: BLUE },
});
