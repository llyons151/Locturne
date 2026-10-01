import { SymbolView } from 'expo-symbols';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/buttons';
import { MotionPage, Reveal, WordsIn, type TextMotion } from '@/components/motion';
import * as haptic from '@/lib/haptics';
import { noOrphan } from '@/lib/text';
import { CTA_HEIGHT, DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type } from '@/theme';

type ShellProps = PropsWithChildren<{
  /** 0–1, or null to hide the bar. */
  progress: number | null;
  onBack?: () => void;
  onExit: () => void;
  footer?: ReactNode;
}>;

/** Fixed full-screen page: top bar, content, and a bottom action that never scrolls away. */
export function Shell({ progress, onBack, onExit, footer, children }: ShellProps) {
  // Pad with the provider's window insets; the native SafeAreaView can measure zero inside a full-screen modal.
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.shell, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          disabled={!onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.roundButton, !onBack && styles.hidden]}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={16}
            tintColor={Nocturne.text}
          />
        </Pressable>
        {progress === null ? <View style={styles.progress} /> : <ProgressBar value={progress} />}
        <Pressable onPress={onExit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Exit preview" style={styles.exitButton}>
          <Text style={styles.exit}>Exit</Text>
        </Pressable>
      </View>
      {/* Onboarding pages never scroll: every screen is laid out to fit, with tighter layouts on short phones. */}
      <View testID="onboarding-body" style={[styles.scroll, styles.body]}>{children}</View>
      {footer ? <View testID="onboarding-footer" style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

/** One continuous bar that eases to each new value. */
function ProgressBar({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(value);
  useEffect(() => {
    fill.value = reduced ? value : withTiming(value, { duration: 350 });
  }, [value, reduced, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View
      style={[styles.progress, styles.track]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Animated.View style={[styles.trackFill, fillStyle]} />
    </View>
  );
}

/** One page of onboarding. Keyed by step, so every entrance replays on each page. */
export function StepEnter({ motion = 'drift', children }: PropsWithChildren<{ motion?: TextMotion }>) {
  return <MotionPage motion={motion}>{children}</MotionPage>;
}

export function Eyebrow({ children }: PropsWithChildren) {
  return (
    <Reveal>
      <Text style={styles.eyebrow}>{children}</Text>
    </Reveal>
  );
}

/**
 * True while a page sits on the risen quiz moon. Text centres there, like the moon's
 * list questions, and gray text turns white so it reads on the moon's blue.
 */
const OnMoon = createContext(false);
export const MoonSurface = OnMoon.Provider;
export const useOnMoon = () => useContext(OnMoon);

export function Title({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const moon = useOnMoon();
  return <WordsIn text={noOrphan(children)} style={[styles.title, moon && styles.centered, style]} header />;
}

export function Body({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  const moon = useOnMoon();
  return (
    <Reveal>
      <Text style={[styles.body2, moon && styles.bodyOnMoon, style]}>{typeof children === 'string' ? noOrphan(children) : children}</Text>
    </Reveal>
  );
}

/** Loc talking: heavy italic serif, entering with the page's text motion. */
export function Voice({
  text,
  size = 34,
  delay = 0,
  header,
  sub,
  center: centerProp,
}: {
  text: string;
  size?: number;
  /** The earliest this line starts, in ms after the page opens. */
  delay?: number;
  /** Set when the line is the page's title, so VoiceOver announces it as one. */
  header?: boolean;
  /** A secondary line under the headline. Always rises in as one line (Moonrise), whatever the page's motion. */
  sub?: boolean;
  /** Centered text. Only for sub lines, which render as one text run. */
  center?: boolean;
}) {
  const center = useOnMoon() || centerProp;
  return (
    <WordsIn
      key={text}
      text={noOrphan(text)}
      style={[styles.voice, { fontSize: size, lineHeight: size * 1.08 }, center && { textAlign: 'center' }]}
      delay={delay}
      header={header}
      motion={sub ? 'moonrise' : undefined}
      maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
    />
  );
}

const FOOTER_DELAY_MS = 450;

/**
 * Footer buttons fade up shortly after the page's first line starts, without waiting for it to finish.
 * A text link goes above the primary button, never under it, so the button sits at the
 * bottom on every screen (docs/onboarding-consistency).
 */
export function FooterEnter({ children, secondary }: PropsWithChildren<{ secondary?: ReactNode }>) {
  const reduced = useReducedMotion();
  // Still invisible until it fades in, so a double tap on the last page's button can't land here.
  const [live, setLive] = useState(reduced);
  useEffect(() => {
    if (live) return;
    const id = setTimeout(() => setLive(true), FOOTER_DELAY_MS);
    return () => clearTimeout(id);
  }, [live]);
  return (
    <Animated.View
      style={[
        styles.footerStack,
        { pointerEvents: live ? 'auto' : 'none' },
        !reduced && {
          animationName: {
            from: { opacity: 0, transform: [{ translateY: 8 }] },
            to: { opacity: 1, transform: [{ translateY: 0 }] },
          },
          animationDuration: '420ms',
          animationDelay: `${FOOTER_DELAY_MS}ms`,
          animationTimingFunction: 'ease-out',
          animationFillMode: 'backwards',
        },
      ]}
    >
      {secondary}
      {children}
    </Animated.View>
  );
}

/** Single-choice list. Selecting an option advances after a short beat. */
export function Options<T>({
  options,
  value,
  onChoose,
  tone = 'sky',
}: {
  options: { label: string; value: T }[];
  value: T | undefined;
  onChoose: (value: T) => void;
  /** 'moon': black pills sitting on the risen quiz moon. */
  tone?: 'sky' | 'moon';
}) {
  const moon = tone === 'moon';
  return (
    <View style={styles.options} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Reveal key={option.label}>
            <Pressable
              onPress={() => {
                haptic.tap();
                onChoose(option.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [
                styles.option,
                moon && styles.optionMoon,
                selected && (moon ? styles.optionMoonSelected : styles.optionSelected),
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  moon && styles.optionLabelMoon,
                  selected && (moon ? styles.optionLabelMoonSelected : styles.optionLabelSelected),
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          </Reveal>
        );
      })}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Reveal style={styles.appChipSlot}>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={({ pressed }) => [styles.appChip, selected && styles.chipSelected, pressed && styles.pressed]}
      >
        <Text style={[styles.appChipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
      </Pressable>
    </Reveal>
  );
}

/** Marks anything simulated in this draft, per GAME_PLAN: never imply a native feature works. */
export function PreviewNote({ children }: PropsWithChildren) {
  return (
    <Reveal style={styles.previewNote}>
      <Text style={styles.previewLabel}>PREVIEW</Text>
      <Text style={styles.previewText}>{children}</Text>
    </Reveal>
  );
}

const HOLD_MS = 1600;
const DONE_BEAT_MS = 700;
const QUICK_TAP_MS = 350;
const HINT_MS = 1800;

// Mobile browsers turn a long press into text selection or a callout menu, which cancels the hold.
const noLongPressMenu =
  Platform.OS === 'web'
    ? ({ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'none' } as object)
    : null;

/**
 * Press and hold to agree. Haptics build while the fill grows; letting go resets it.
 * VoiceOver users get the same agreement through the default activate action.
 */
export function HoldButton({
  label,
  doneLabel,
  onComplete,
}: {
  label: string;
  doneLabel: string;
  onComplete: () => void;
}) {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pulse = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [phase, setPhase] = useState<'idle' | 'holding' | 'hint' | 'done'>('idle');
  const pressedAt = useRef(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const screenReader = useScreenReader();

  const stopTimers = () => {
    if (timer.current) clearTimeout(timer.current);
    if (pulse.current) clearInterval(pulse.current);
    if (hintTimer.current) clearTimeout(hintTimer.current);
  };

  useEffect(() => stopTimers, []);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const finish = () => {
    stopTimers();
    progress.value = 1;
    setPhase('done');
    haptic.done();
    timer.current = setTimeout(onComplete, DONE_BEAT_MS);
  };

  const start = () => {
    if (phase === 'done') return;
    stopTimers();
    pressedAt.current = Date.now();
    setPhase('holding');
    progress.value = withTiming(1, { duration: HOLD_MS });
    let beat = 0;
    pulse.current = setInterval(() => {
      beat += 1;
      if (beat > 5) haptic.thud();
      else haptic.tick();
    }, 200);
    timer.current = setTimeout(finish, HOLD_MS);
  };

  const cancel = () => {
    if (phase === 'done') return;
    stopTimers();
    progress.value = withTiming(0, { duration: 200 });
    // A quick tap is the most common first try: say what to do instead of doing nothing.
    if (Date.now() - pressedAt.current < QUICK_TAP_MS) {
      haptic.tick();
      setPhase('hint');
      hintTimer.current = setTimeout(() => setPhase('idle'), HINT_MS);
    } else {
      setPhase('idle');
    }
  };

  const text =
    phase === 'done'
      ? doneLabel
      : phase === 'holding'
        ? 'Keep holding'
        : phase === 'hint'
          ? 'Hold it. Don’t just tap.'
          : label;

  // Holding isn't practical with VoiceOver or Switch Control: offer a plain button instead.
  if (screenReader && phase !== 'done') {
    return <PrimaryButton label="I agree" onPress={finish} />;
  }

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      style={noLongPressMenu}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold. With VoiceOver, double-tap to agree."
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate' && phase !== 'done') finish();
      }}
    >
      <View style={[styles.hold, noLongPressMenu]}>
        <Animated.View style={[styles.holdFill, fillStyle]} />
        <Text selectable={false} style={[styles.holdLabel, phase === 'done' && styles.holdLabelDone, noLongPressMenu]}>
          {text}
        </Text>
      </View>
    </Pressable>
  );
}

function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // React Native Web can't detect screen readers reliably; the hold's activate action still covers it.
    if (Platform.OS === 'web') return;
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (active) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return enabled;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, minHeight: 0, overflow: 'hidden' },
  hidden: { opacity: 0 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: Gap.gutter,
    paddingTop: 6,
    paddingBottom: 10,
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Nocturne.frost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { flex: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3, backgroundColor: Nocturne.text },
  exitButton: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  // Neutral shadow (not a glow) keeps it legible over the moon in the corner.
  exit: { color: Nocturne.text2, fontSize: 15, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 6 },
  body: { paddingHorizontal: Gap.gutter, paddingBottom: Space.l },
  footer: { paddingHorizontal: Gap.gutter, paddingTop: Space.s, paddingBottom: Space.s },
  eyebrow: { ...Type.label, marginBottom: Gap.headline },
  title: { color: Nocturne.text, ...Type.title },
  body2: { color: Nocturne.text2, ...Type.body },
  bodyOnMoon: { color: Nocturne.text, textAlign: 'center' },
  centered: { textAlign: 'center' },
  voice: { ...DisplayFont, color: Nocturne.text, letterSpacing: -0.3 },
  footerStack: { gap: Space.s },
  pressed: { opacity: 0.75 },
  options: { gap: Space.m },
  option: {
    minHeight: 58,
    borderRadius: Radius.pill,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  optionSelected: { backgroundColor: Nocturne.cta, borderColor: Nocturne.cta },
  optionLabel: { color: Nocturne.text, fontSize: 17, fontWeight: '500' },
  optionLabelSelected: { color: Nocturne.onCta },
  // On the quiz moon: black pills, centred like the rest of the moon page; picked turns moon-white.
  optionMoon: { backgroundColor: '#000000', borderColor: '#000000', minHeight: 54, paddingVertical: 14, borderRadius: Radius.pill, alignItems: 'center' },
  optionMoonSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  optionLabelMoon: { color: '#FFFFFF', textAlign: 'center' },
  optionLabelMoonSelected: { color: '#000000' },
  chipSelected: { backgroundColor: Nocturne.cta },
  chipLabelSelected: { color: Nocturne.onCta },
  appChip: {
    borderRadius: Radius.control,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    paddingVertical: 16,
    alignItems: 'center',
  },
  appChipSlot: { width: '47.5%' },
  appChipLabel: { color: Nocturne.text, fontSize: 16, fontWeight: '500' },
  previewNote: {
    flexDirection: 'row',
    gap: Space.m,
    alignItems: 'flex-start',
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Nocturne.line,
    padding: Space.l,
  },
  previewLabel: { ...Type.label, marginTop: 1 },
  previewText: { flex: 1, color: Nocturne.text2, ...Type.caption },
  // Outlined at rest: a grey fill would read as disabled.
  hold: {
    minHeight: CTA_HEIGHT,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Nocturne.text,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Nocturne.cta },
  holdLabel: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', mixBlendMode: 'difference' },
  holdLabelDone: { ...DisplayFont, fontSize: 20 },
});
