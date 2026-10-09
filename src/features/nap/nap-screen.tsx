'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
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
  Nocturne,
  italicOverhang,
  NUMBER_FONT,
  Space,
  Type,
  VoiceSize,
} from '@/theme';

import { HoldButton } from '../../../modules/hold-button';
import { LengthRuler } from './length-ruler';
import { NapClock } from './nap-clock';
import { shownLine, type NapLine } from './nap-line';
import { closeSleepSheet, SHEET_PADDING } from './sleep-sheet';
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

/** 25 → "25 min", 60 → "1 hr", 75 → "1 hr 15 min". */
const lengthLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

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

  const changeLength = (minutes: number) => {
    haptic.tap();
    setLength(minutes);
  };

  // Under the time, where the reference has its "Focus ›": what sleeps, until when.
  const until = nap ? napStatus : `Apps asleep until ${timeOf(now + length * 60_000)}`;
  const pickApps = () =>
    isScreenTimeAvailable() ? !isPickerSettling('block') && setPicking(true) : refuse("Apple's app picker only opens on iPhone.");

  return (
    <View style={styles.sheet}>
      {/* Laid out like the user's reference (TIDE's focus card, 2026-10-08): his line as the
          title, the time over a ruler, the choice, and one white hold button. In the app's
          colours on liquid glass. */}
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
        <View style={styles.length}>
          <Text style={styles.lengthValue} maxFontSizeMultiplier={1.2} importantForAccessibility="no" accessibilityElementsHidden>
            {lengthLabel(length)}
          </Text>
          <LengthRuler value={length} onChange={changeLength} />
        </View>
      )}

      <View style={styles.until} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <SymbolView name={sym('moon.zzz.fill', 'bedtime')} size={13} tintColor={INK2} />
        <Text style={styles.untilText} numberOfLines={1}>
          {until}
        </Text>
      </View>

      {nap ? (
        <Text style={styles.body}>
          {!napProtected
            ? 'Turn Screen Time access back on from the Apps tab.'
            : `${nap.list === 'night' ? 'Your bedtime apps are' : 'The apps you picked are'} asleep with him. Phone calls still get through.`}
        </Text>
      ) : (
        /* TIDE's split row (user's reference, 2026-10-08): one pill, two halves, each an icon,
           a title and a short grey line. The chosen half sits on a lighter pane, like a segmented control. */
        <View style={styles.split} accessibilityRole="radiogroup">
          <Half
            icon={sym('moon.zzz.fill', 'bedtime')}
            title="Bedtime apps"
            detail="Every night"
            selected={list === 'night'}
            onPress={() => choose('night')}
          />
          <Half
            icon={sym('square.grid.2x2.fill', 'apps')}
            title="Pick apps"
            detail={list === 'block' ? (picks ? countPicks(picks) : 'None yet') : 'Just this nap'}
            selected={list === 'block'}
            onPress={() => (list === 'block' ? pickApps() : choose('block'))}
          />
        </View>
      )}

      {nap ? (
        <View style={styles.actions}>
          <SheetButton label="Done" onPress={closeSleepSheet} />
          <SheetButton outline label="Wake him early" onPress={wake} />
        </View>
      ) : (
        /* Held, not tapped (user's ask): the fill sweeps across and he's tucked in at the end.
           Swiping the sheet down is the cancel. */
        <HoldButton
          label="Hold to tuck him in"
          symbol="moon.zzz.fill"
          duration={1200}
          disabled={starting}
          color={Nocturne.cta}
          fillColor={Nocturne.onCta}
          textColor={Nocturne.onCta}
          filledTextColor={Nocturne.cta}
          onComplete={start}
          style={styles.hold}
        />
      )}
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

/** One half of the split row: a round icon, then the title over a grey line. */
function Half({
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
      style={({ pressed }) => [styles.half, selected && styles.halfOn, pressed && styles.pressed]}
    >
      <View style={[styles.halfIcon, selected && styles.halfIconOn]}>
        <SymbolView name={icon} size={13} tintColor={selected ? Nocturne.onCta : INK2} />
      </View>
      <View style={styles.halfText}>
        <Text style={[styles.halfTitle, !selected && styles.halfTitleOff]} numberOfLines={1}>{title}</Text>
        <Text style={styles.halfDetail} numberOfLines={1}>{detail}</Text>
      </View>
    </Pressable>
  );
}

/** The reference's pair of buttons, in the app's style: the white main pill, and a glass one. */
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
      {icon ? <SymbolView name={icon} size={17} weight="semibold" tintColor={Nocturne.onCta} /> : null}
      <Text style={[styles.buttonLabel, outline && styles.buttonLabelOutline]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** His line in the italic serif. `*word*` is set in the upright cut for emphasis. */
function Voice({ text }: { text: string }) {
  const parts = noOrphan(text).split('*');
  return (
    <Text style={styles.voice} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
      {parts.map((part, i) => (i % 2 ? <Text key={i} style={styles.emphasis}>{part}</Text> : part))}
    </Text>
  );
}

// The app's own colours on dark glass (theme/colors.ts, moonrise).
const INK = Nocturne.text;
const INK2 = Nocturne.text2;
const LINE = 'rgba(255, 255, 255, 0.12)';
const ACCENT = Nocturne.accent ?? Nocturne.text;
/** A pane of glass inside the glass: a faint white fill. */
const GLASS = 'rgba(255, 255, 255, 0.07)';

const styles = StyleSheet.create({
  // Sized to its contents inside the card (sleep-sheet.tsx). The side padding matches the
  // card's bottom padding, so the button's round ends sit concentric with its corners.
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.xl },
  pressed: { opacity: 0.7 },
  // His line in the title's place, in his voice (italic means Loc is talking).
  voice: {
    ...DisplayFont,
    ...italicOverhang(VoiceSize.aside),
    color: INK,
    fontSize: 19,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: Space.xs,
  },
  emphasis: { fontStyle: 'normal' },
  body: { ...Type.secondary, color: INK2, textAlign: 'center' },

  length: { alignItems: 'center', gap: Space.m, marginTop: Space.s },
  lengthValue: { color: INK, fontSize: 40, lineHeight: 46, fontWeight: '500', fontVariant: ['tabular-nums'] },
  until: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -Space.m },
  untilText: { ...Type.caption, fontWeight: '500', color: INK2 },

  split: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: GLASS,
  },
  half: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.s,
    paddingVertical: Space.m,
    paddingHorizontal: Space.s,
    borderRadius: 18,
    borderCurve: 'continuous',
  },
  halfOn: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  halfIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: GLASS },
  halfIconOn: { backgroundColor: ACCENT },
  halfText: { flexShrink: 1 },
  halfTitle: { color: INK, fontSize: 15, fontWeight: '600' },
  halfTitleOff: { color: INK2 },
  halfDetail: { ...Type.caption, color: INK2 },

  actions: { flexDirection: 'row', gap: Space.m },
  button: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.s,
    paddingHorizontal: Space.l,
    borderRadius: 28,
    backgroundColor: Nocturne.cta,
  },
  buttonOutline: { backgroundColor: GLASS, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.22)' },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  buttonLabelOutline: { color: INK },
  hold: { height: 56, marginTop: Space.xs },
  notice: { ...Type.caption, color: INK2, textAlign: 'center' },

  timer: { gap: Space.m, alignItems: 'center' },
  countdown: { ...NUMBER_FONT, color: INK, fontSize: 56, lineHeight: 62, fontVariant: ['tabular-nums'] },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: LINE, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.cta },
});
